import numpy as np
from collections import Counter
from ultralytics import YOLO, YOLOWorld
from app.core.config import settings

class ObjectMonitor:
    def __init__(
        self,
        model_path='weights/yolov8n.pt',
        missing_threshold=None,
        iou_threshold=None,
        det_confidence=None,
        calibration_frames=None,
        memory_promotion_frames=None,
        candidate_stale_frames=None,
        show_observed_objects=True,
        count_occlusion_as_missing=False,
        reacquire_confidence=None,
    ):
        """
        Initialize the ObjectMonitor.
        :param model_path: Path to YOLO weights.
        :param missing_threshold: Number of frames an object can be missing before alerting.
        :param iou_threshold: Intersection over Union threshold for matching objects.
        """
        monitored = [c.strip().lower() for c in settings.MONITORED_OBJECT_CLASSES.split(",") if c.strip()]
        self.monitored_classes = set(monitored)
        self.bag_prompts = [c.strip().lower() for c in settings.BAG_FOCUSED_CLASSES.split(",") if c.strip()]
        self.bag_max_area_ratio = settings.BAG_MAX_AREA_RATIO
        self.bag_confidence = settings.BAG_FOCUSED_CONF
        self.focused_model = None
        if "world" in str(model_path).lower():
            self.model = YOLOWorld(model_path)
            if monitored:
                self.model.set_classes(monitored)
            if self.bag_prompts:
                self.focused_model = YOLOWorld(model_path)
                self.focused_model.set_classes(self.bag_prompts)
        else:
            self.model = YOLO(model_path)
        self.context_state = {}
        self.missing_threshold = missing_threshold or settings.MISSING_THRESHOLD_FRAMES
        self.iou_threshold = iou_threshold or settings.OBJECT_MATCH_IOU
        self.relaxed_iou_threshold = settings.OBJECT_RELAXED_IOU
        self.occlusion_iou_threshold = settings.OBJECT_OCCLUSION_IOU
        self.det_confidence = settings.OBJECT_DET_CONF if det_confidence is None else float(det_confidence)
        self.calibration_frames = settings.OBJECT_CALIBRATION_FRAMES if calibration_frames is None else int(calibration_frames)
        self.baseline_min_ratio = settings.OBJECT_BASELINE_MIN_RATIO
        self.memory_promotion_frames = settings.OBJECT_MEMORY_PROMOTION_FRAMES if memory_promotion_frames is None else int(memory_promotion_frames)
        self.candidate_stale_frames = settings.OBJECT_CANDIDATE_STALE_FRAMES if candidate_stale_frames is None else int(candidate_stale_frames)
        self.show_observed_objects = bool(show_observed_objects)
        self.count_occlusion_as_missing = bool(count_occlusion_as_missing)
        self.reacquire_confidence = None if reacquire_confidence is None else float(reacquire_confidence)
        self.class_growth_margin = settings.OBJECT_CLASS_GROWTH_MARGIN

    def _normalize_label(self, label):
        return " ".join((label or "").strip().lower().replace("-", " ").replace("_", " ").split())

    def _canonical_label(self, label):
        normalized = self._normalize_label(label)
        bag_keywords = {"bag", "backpack", "back", "handbag", "purse", "duffel", "tote", "shoulder", "school", "travel"}
        if any(keyword in normalized.split() for keyword in bag_keywords) or "bag" in normalized:
            return "bag"
        return normalized

    def _class_key(self, class_id, label):
        canonical_label = self._canonical_label(label)
        if canonical_label == "bag":
            return 1001
        return int(class_id)

    def _label_matches_prompt(self, label):
        normalized_label = self._canonical_label(label)
        if not normalized_label:
            return False

        if normalized_label in self.monitored_classes:
            return True

        label_tokens = set(normalized_label.split())
        for prompt in self.monitored_classes:
            normalized_prompt = self._canonical_label(prompt)
            prompt_tokens = set(normalized_prompt.split())
            if normalized_label in normalized_prompt or normalized_prompt in normalized_label:
                return True
            if label_tokens and prompt_tokens and label_tokens.issubset(prompt_tokens):
                return True
            if label_tokens and prompt_tokens and prompt_tokens.issubset(label_tokens):
                return True
        return False

    def _is_reasonable_bag_detection(self, box, frame_shape):
        if self._canonical_label("bag") != "bag":
            return True
        frame_h, frame_w = frame_shape[:2]
        frame_area = max(1.0, float(frame_w * frame_h))
        x1, y1, x2, y2 = box
        area = max(0.0, float(x2 - x1)) * max(0.0, float(y2 - y1))
        return (area / frame_area) <= self.bag_max_area_ratio

    def _get_context(self, context_id):
        if context_id not in self.context_state:
            self.context_state[context_id] = {
                "reference_objects": [],
                "frame_index": 0,
                "calibration_candidates": [],
                "calibration_count": 0,
                "calibrated": False,
                "object_candidates": [],
                "class_limits": {},
            }
        return self.context_state[context_id]

    def reset_context(self, context_id):
        self.context_state.pop(context_id, None)

    def get_reference_objects(self, context_id="default"):
        context = self._get_context(context_id)
        return context["reference_objects"]

    def is_calibrated(self, context_id="default"):
        context = self._get_context(context_id)
        return context["calibrated"]

    def start_calibration(self, context_id="default"):
        context = self._get_context(context_id)
        context["reference_objects"] = []
        context["frame_index"] = 0
        context["calibration_candidates"] = []
        context["calibration_count"] = 0
        context["calibrated"] = False
        context["object_candidates"] = []
        context["class_limits"] = {}

    def _is_monitorable(self, class_id, label):
        if class_id == 0:
            return False
        if not self.monitored_classes:
            return True
        return self._label_matches_prompt(label)

    def set_reference_frame(self, frame, context_id="default", conf=0.15):
        """
        Set the reference objects from a baseline frame.
        :param frame: Initial frame to scan for objects.
        :param context_id: State bucket for this stream/session.
        :param conf: Confidence threshold for detection.
        :return: Number of objects found.
        """
        context = self._get_context(context_id)
        context["frame_index"] = 0
        context["calibration_candidates"] = []
        context["calibration_count"] = 0
        context["calibrated"] = True
        confidence = max(conf, self.det_confidence)
        results = self.model(frame, verbose=False, conf=confidence, iou=0.6)

        candidates = []
        for r in results:
            boxes = r.boxes.xyxy.cpu().numpy()
            classes = r.boxes.cls.cpu().numpy()
            confidences = r.boxes.conf.cpu().numpy()

            for box, cls, score in zip(boxes, classes, confidences):
                class_id = int(cls)
                label = self.model.names[class_id]
                if not self._is_monitorable(class_id, label):
                    continue
                candidates.append({
                    "box": box,
                    "cls": self._class_key(class_id, label),
                    "conf": float(score),
                    "label": self._canonical_label(label),
                })

        candidates = self._dedupe_candidates(candidates)
        context["reference_objects"] = []
        for idx, item in enumerate(candidates):
            context["reference_objects"].append({
                "ref_id": idx,
                "box": item["box"],
                "cls": item["cls"],
                "label": item["label"],
                "missing_count": 0,
                "status": "Present",
                "alerted": False,
                "track_id": None,
            })

        return len(context["reference_objects"])

    def calculate_iou(self, box1, box2):
        """Intersection over Union helper."""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])
        
        intersection = max(0, x2 - x1) * max(0, y2 - y1)
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
        
        union = area1 + area2 - intersection
        return intersection / union if union > 0 else 0

    def _dedupe_candidates(self, candidates, overlap=0.7):
        # Keep the highest-confidence box when near-duplicate detections appear.
        candidates = sorted(candidates, key=lambda x: x["conf"], reverse=True)
        filtered = []
        for cand in candidates:
            duplicate = False
            for kept in filtered:
                if cand["cls"] != kept["cls"]:
                    continue
                if self.calculate_iou(cand["box"], kept["box"]) >= overlap:
                    duplicate = True
                    break
            if not duplicate:
                filtered.append(cand)
        return filtered

    def _center(self, box):
        return ((box[0] + box[2]) / 2.0, (box[1] + box[3]) / 2.0)

    def _is_same_slot(self, box_a, box_b, iou_thr=0.35, center_ratio=0.25):
        iou = self.calculate_iou(box_a, box_b)
        if iou >= iou_thr:
            return True
        ax, ay = self._center(box_a)
        bx, by = self._center(box_b)
        aw = max(1.0, box_a[2] - box_a[0])
        ah = max(1.0, box_a[3] - box_a[1])
        bw = max(1.0, box_b[2] - box_b[0])
        bh = max(1.0, box_b[3] - box_b[1])
        avg_w = (aw + bw) / 2.0
        avg_h = (ah + bh) / 2.0
        return abs(ax - bx) <= (avg_w * center_ratio) and abs(ay - by) <= (avg_h * center_ratio)

    def _compact_reference_objects(self, context):
        refs = context["reference_objects"]
        merged = []
        for ref in refs:
            placed = False
            for kept in merged:
                if ref["cls"] != kept["cls"]:
                    continue
                if self._is_same_slot(ref["box"], kept["box"], iou_thr=0.3, center_ratio=0.3):
                    kept["box"] = 0.5 * kept["box"] + 0.5 * ref["box"]
                    kept["missing_count"] = min(kept["missing_count"], ref["missing_count"])
                    if kept["status"] == "Present" or ref["status"] == "Present":
                        kept["status"] = "Present"
                    placed = True
                    break
            if not placed:
                merged.append(ref)
        for idx, ref in enumerate(merged):
            ref["ref_id"] = idx
        context["reference_objects"] = merged

    def _dedupe_output_objects(self, objects):
        priority = {"Missing": 5, "Occluded": 4, "At Risk": 3, "Present": 2, "Observed": 1, "Calibrating": 0}
        ordered = sorted(objects, key=lambda o: priority.get(o.get("status", "Observed"), 0), reverse=True)
        filtered = []
        for obj in ordered:
            duplicate = False
            for kept in filtered:
                if obj["cls"] != kept["cls"]:
                    continue
                if self._is_same_slot(obj["box"], kept["box"], iou_thr=0.45, center_ratio=0.2):
                    duplicate = True
                    break
            if not duplicate:
                filtered.append(obj)
        return filtered

    def _extract_detections(self, frame):
        try:
            results = self.model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                conf=self.det_confidence,
                iou=0.5,
                verbose=False,
            )
        except Exception:
            # Fallback when tracker setup fails on some environments.
            results = self.model(frame, conf=self.det_confidence, iou=0.5, verbose=False)

        current_objects = []
        persons = []
        for r in results:
            boxes = r.boxes.xyxy.cpu().numpy()
            classes = r.boxes.cls.cpu().numpy()
            confidences = r.boxes.conf.cpu().numpy()
            track_ids = r.boxes.id.cpu().numpy() if getattr(r.boxes, "id", None) is not None else [None] * len(boxes)

            for box, cls, score, tid in zip(boxes, classes, confidences, track_ids):
                class_id = int(cls)
                if class_id == 0:
                    persons.append(box)
                else:
                    label = self.model.names[class_id]
                    if not self._is_monitorable(class_id, label):
                        continue
                    current_objects.append({
                        "box": box,
                        "cls": self._class_key(class_id, label),
                        "label": self._canonical_label(label),
                        "conf": float(score),
                        "track_id": int(tid) if tid is not None else None,
                    })

        if self.focused_model is not None and self.bag_prompts:
            try:
                focused_results = self.focused_model(
                    frame,
                    conf=self.bag_confidence,
                    iou=0.5,
                    imgsz=1280,
                    verbose=False,
                )
                for r in focused_results:
                    boxes = r.boxes.xyxy.cpu().numpy()
                    classes = r.boxes.cls.cpu().numpy()
                    confidences = r.boxes.conf.cpu().numpy()
                    for box, cls, score in zip(boxes, classes, confidences):
                        label = self.bag_prompts[int(cls)]
                        canonical_label = self._canonical_label(label)
                        if canonical_label != "bag":
                            continue
                        if not self._is_reasonable_bag_detection(box, frame.shape):
                            continue
                        current_objects.append({
                            "box": box,
                            "cls": 1001,
                            "label": "bag",
                            "conf": float(score),
                            "track_id": None,
                        })
            except Exception:
                pass
        deduped_objects = self._dedupe_candidates(current_objects, overlap=0.55)
        return deduped_objects, persons

    def _update_calibration(self, context, detections):
        candidates = context["calibration_candidates"]
        context["calibration_count"] += 1
        for det in detections:
            matched = False
            for cand in candidates:
                if cand["cls"] != det["cls"]:
                    continue
                if self.calculate_iou(cand["box"], det["box"]) >= 0.45:
                    cand["hits"] += 1
                    cand["box"] = 0.7 * cand["box"] + 0.3 * det["box"]
                    cand["track_id"] = det.get("track_id")
                    matched = True
                    break
            if not matched:
                candidates.append({
                    "box": det["box"],
                    "cls": det["cls"],
                    "label": det["label"],
                    "hits": 1,
                    "track_id": det.get("track_id"),
                })

    def _update_object_candidates(self, context, detections):
        candidates = context["object_candidates"]
        frame_index = context["frame_index"]
        for det in detections:
            matched = False
            for cand in candidates:
                if cand["cls"] != det["cls"]:
                    continue
                if self.calculate_iou(cand["box"], det["box"]) >= 0.4:
                    cand["hits"] += 1
                    cand["last_seen"] = frame_index
                    cand["box"] = 0.75 * cand["box"] + 0.25 * det["box"]
                    cand["track_id"] = det.get("track_id")
                    matched = True
                    break
            if not matched:
                candidates.append({
                    "box": det["box"],
                    "cls": det["cls"],
                    "label": det["label"],
                    "hits": 1,
                    "first_seen": frame_index,
                    "last_seen": frame_index,
                    "track_id": det.get("track_id"),
                })

        # Keep memory bounded and focused on recently seen candidates.
        context["object_candidates"] = [
            c for c in candidates if frame_index - c["last_seen"] <= self.candidate_stale_frames
        ]

    def _promote_candidates_to_reference(self, context):
        reference_objects = context["reference_objects"]
        class_limits = context.get("class_limits", {})
        for cand in context["object_candidates"]:
            if cand["hits"] < self.memory_promotion_frames:
                continue

            same_class_refs = [r for r in reference_objects if r["cls"] == cand["cls"]]
            class_cap = class_limits.get(cand["cls"], len(same_class_refs))
            class_cap = max(1, class_cap + self.class_growth_margin)
            if len(same_class_refs) >= class_cap:
                continue

            already_reference = False
            for ref in reference_objects:
                if ref["cls"] != cand["cls"]:
                    continue
                if self._is_same_slot(ref["box"], cand["box"], iou_thr=0.25, center_ratio=0.35):
                    already_reference = True
                    break

            if already_reference:
                continue

            reference_objects.append({
                "ref_id": len(reference_objects),
                "box": cand["box"],
                "cls": cand["cls"],
                "label": cand["label"],
                "missing_count": 0,
                "status": "Present",
                "alerted": False,
                "track_id": cand.get("track_id"),
            })

    def _finalize_calibration(self, context):
        required_hits = max(2, int(context["calibration_count"] * self.baseline_min_ratio))
        selected = [c for c in context["calibration_candidates"] if c["hits"] >= required_hits]
        if not selected:
            # Fallback: if detections are sparse, use any seen monitorable objects.
            selected = list(context["calibration_candidates"])
        selected = self._dedupe_candidates(
            [{"box": c["box"], "cls": c["cls"], "conf": c["hits"], "label": c["label"]} for c in selected],
            overlap=0.6
        )

        context["reference_objects"] = []
        for idx, item in enumerate(selected):
            context["reference_objects"].append({
                "ref_id": idx,
                "box": item["box"],
                "cls": item["cls"],
                "label": item["label"],
                "missing_count": 0,
                "status": "Present",
                "alerted": False,
                "track_id": None,
            })
        context["class_limits"] = Counter([r["cls"] for r in context["reference_objects"]])
        context["calibrated"] = True

    def process_frame(self, frame, context_id="default"):
        """
        Process a new frame and update the status of reference objects.
        :param frame: New frame to analyze.
        :param context_id: State bucket for this stream/session.
        :return: tuple (list of alerts, updated reference objects)
        """
        context = self._get_context(context_id)
        reference_objects = context["reference_objects"]
        context["frame_index"] += 1

        current_objects, persons = self._extract_detections(frame)
        self._update_object_candidates(context, current_objects)
        
        alerts = []

        if not context["calibrated"]:
            self._update_calibration(context, current_objects)
            if context["calibration_count"] >= self.calibration_frames:
                self._finalize_calibration(context)
                reference_objects = context["reference_objects"]
            else:
                # Keep UI informative while baseline is being built.
                preview = self._dedupe_candidates(
                    [
                        {"box": d["box"], "cls": d["cls"], "conf": 1.0, "label": d["label"]}
                        for d in current_objects
                    ],
                    overlap=0.65
                )
                preview_objects = [
                    {
                        "ref_id": -1,
                        "box": p["box"],
                        "cls": p["cls"],
                        "label": p["label"],
                        "missing_count": 0,
                        "status": "Calibrating",
                        "alerted": False,
                        "track_id": None,
                    }
                    for p in preview
                ]
                return alerts, preview_objects, persons

        if not reference_objects:
            observed = self._dedupe_candidates(
                [
                    {"box": d["box"], "cls": d["cls"], "conf": 1.0, "label": d["label"]}
                    for d in current_objects
                ],
                overlap=0.65
            )
            observed_objects = [
                {
                    "ref_id": -1,
                    "box": o["box"],
                    "cls": o["cls"],
                    "label": o["label"],
                    "missing_count": 0,
                    "status": "Observed",
                    "alerted": False,
                    "track_id": None,
                }
                for o in observed
            ]
            return alerts, observed_objects, persons

        # Keep learning stable objects over long-running sessions.
        self._promote_candidates_to_reference(context)
        self._compact_reference_objects(context)
        reference_objects = context["reference_objects"]
        ref_class_counts = Counter([r["cls"] for r in reference_objects])
        
        # Greedy class-aware matching prevents unstable one-to-many assignments.
        candidate_pairs = []
        for ref_idx, ref_obj in enumerate(reference_objects):
            for curr_idx, curr in enumerate(current_objects):
                if curr["cls"] != ref_obj["cls"]:
                    continue
                overlap = self.calculate_iou(ref_obj["box"], curr["box"])
                same_track = ref_obj.get("track_id") is not None and curr.get("track_id") == ref_obj.get("track_id")
                if same_track and overlap >= self.relaxed_iou_threshold:
                    candidate_pairs.append((1.0 + overlap, ref_idx, curr_idx))
                elif overlap >= self.relaxed_iou_threshold:
                    candidate_pairs.append((overlap, ref_idx, curr_idx))

        candidate_pairs.sort(reverse=True, key=lambda x: x[0])
        ref_to_curr = {}
        used_curr = set()
        for _score, ref_idx, curr_idx in candidate_pairs:
            if ref_idx in ref_to_curr or curr_idx in used_curr:
                continue
            ref_to_curr[ref_idx] = curr_idx
            used_curr.add(curr_idx)

        for ref_idx, ref_obj in enumerate(reference_objects):
            matched = ref_idx in ref_to_curr
            best_match = current_objects[ref_to_curr[ref_idx]] if matched else None

            if matched and best_match is not None and ref_obj.get("missing_count", 0) > 0 and self.reacquire_confidence is not None:
                if float(best_match.get("conf", 0.0)) < self.reacquire_confidence:
                    matched = False
                    best_match = None

            if matched:
                ref_obj["missing_count"] = 0
                ref_obj["status"] = "Present"
                ref_obj["alerted"] = False
                if best_match is not None:
                    ref_obj["track_id"] = best_match.get("track_id")
                    # Smooth updates to avoid jitter from frame-to-frame changes.
                    ref_obj["box"] = 0.8 * ref_obj["box"] + 0.2 * best_match["box"]
            else:
                # Check for occlusion by persons
                is_occluded = False
                for person_box in persons:
                    # If a person significantly overlaps with the object's reference position
                    if self.calculate_iou(ref_obj["box"], person_box) > self.occlusion_iou_threshold:
                        is_occluded = True
                        break
                
                if is_occluded and not self.count_occlusion_as_missing:
                    ref_obj["status"] = "Occluded"
                else:
                    ref_obj["missing_count"] += 1
                    if ref_obj["missing_count"] > self.missing_threshold:
                        ref_obj["status"] = "Missing"
                    else:
                        ref_obj["status"] = "At Risk"
            
            # Check if missing count exceeds alert threshold
            if ref_obj["missing_count"] > self.missing_threshold and not ref_obj["alerted"]:
                alerts.append(f"MISSING: {ref_obj['label']}")
                ref_obj["alerted"] = True
        
        # Also expose currently observed non-reference objects so UI shows
        # detection activity immediately, while reference memory matures.
        output_objects = list(reference_objects)
        if self.show_observed_objects:
            for curr in current_objects:
                matched_reference = False
                for ref_obj in reference_objects:
                    if curr["cls"] != ref_obj["cls"]:
                        continue
                    if self.calculate_iou(curr["box"], ref_obj["box"]) >= 0.4:
                        matched_reference = True
                        break
                if not matched_reference:
                    output_objects.append({
                        "ref_id": -1,
                        "box": curr["box"],
                        "cls": curr["cls"],
                        "label": curr["label"],
                        "missing_count": 0,
                        "status": "Observed",
                        "alerted": False,
                        "track_id": curr.get("track_id"),
                    })

        return alerts, self._dedupe_output_objects(output_objects), persons
