import cv2
import time
from uuid import uuid4
from app.core.config import settings
from app.ml.object.monitor import ObjectMonitor
from app.db.database import SessionLocal
from app.db import models
from datetime import datetime

class SurveillanceService:
    def __init__(self):
        self.device = settings.DEVICE
        self.object_monitor = ObjectMonitor(model_path=settings.YOLO_MODEL_PATH)
        self.live_object_monitor = ObjectMonitor(
            model_path=settings.LIVE_YOLO_MODEL_PATH,
            missing_threshold=settings.LIVE_MISSING_THRESHOLD_FRAMES,
            det_confidence=settings.LIVE_OBJECT_DET_CONF,
            calibration_frames=settings.LIVE_OBJECT_CALIBRATION_FRAMES,
            memory_promotion_frames=settings.LIVE_OBJECT_MEMORY_PROMOTION_FRAMES,
            candidate_stale_frames=settings.LIVE_OBJECT_CANDIDATE_STALE_FRAMES,
            show_observed_objects=settings.LIVE_SHOW_OBSERVED_OBJECTS,
            count_occlusion_as_missing=settings.LIVE_COUNT_OCCLUSION_AS_MISSING,
            reacquire_confidence=settings.LIVE_REACQUIRE_CONFIDENCE,
        )
        self.session_state = {}
        self.runtime_settings_cache = None
        self.runtime_settings_cache_time = 0.0
        self.runtime_settings_ttl = 2.0
        
        # Alert Throttling
        self.last_log_time = {} # dictionary to track last log for each alert type
        self.log_cooldown = 10 # Seconds between logs for the same alert type

    def _select_object_monitor(self, context_id):
        if str(context_id).startswith("ws-"):
            return self.live_object_monitor
        return self.object_monitor

    def _get_session(self, context_id):
        if context_id not in self.session_state:
            self.session_state[context_id] = {
                "current_behavior": "Analyzing...",
                "last_persons": [],
                "started_at": time.time(),
                # Live-only: avoid "empty frame → At Risk" until real reference objects exist.
                "had_established_references": False,
            }
        return self.session_state[context_id]

    def start_session(self, context_id=None, reference_frame=None):
        if context_id is None:
            context_id = f"session-{uuid4()}"

        self.session_state[context_id] = {
            "current_behavior": "Analyzing...",
            "last_persons": [],
            "started_at": time.time(),
            "had_established_references": False,
        }
        monitor = self._select_object_monitor(context_id)
        monitor.reset_context(context_id)
        monitor.start_calibration(context_id)

        if reference_frame is not None:
            monitor.start_calibration(context_id)
            monitor.set_reference_frame(reference_frame, context_id=context_id)
        return context_id

    def end_session(self, context_id):
        self.session_state.pop(context_id, None)
        self.object_monitor.reset_context(context_id)
        self.live_object_monitor.reset_context(context_id)

    def _log_alert(self, behavior, details, cooldown_key=None):
        """Log breach to the database with cooldown throttling."""
        now = datetime.now()
        throttle_key = cooldown_key or behavior
        last_time = self.last_log_time.get(throttle_key)
        
        if last_time and (now - last_time).total_seconds() < self.log_cooldown:
            return # Skip if within cooldown
            
        self.last_log_time[throttle_key] = now
        db = SessionLocal()
        try:
            alert = models.Alert(
                behavior=behavior,
                details=details,
                timestamp=now
            )
            db.add(alert)
            db.commit()
            print(f"Logged Security Alert: {behavior}")
        except Exception as e:
            print(f"Database logging error: {e}")
        finally:
            db.close()

    def _get_runtime_settings(self):
        now = time.time()
        if self.runtime_settings_cache and (now - self.runtime_settings_cache_time) < self.runtime_settings_ttl:
            return self.runtime_settings_cache

        defaults = {
            "behavior_detection": True,
            "object_monitoring": True,
            "sensitivity": 0.5,
        }

        db = SessionLocal()
        try:
            settings_records = db.query(models.Setting).all()
            parsed = {
                s.key: s.value.lower() == 'true' if s.value.lower() in ['true', 'false'] else float(s.value)
                for s in settings_records
            }
            runtime_settings = {
                "behavior_detection": parsed.get("behavior_detection", defaults["behavior_detection"]),
                "object_monitoring": parsed.get("object_monitoring", defaults["object_monitoring"]),
                "sensitivity": parsed.get("sensitivity", defaults["sensitivity"]),
            }
        except Exception as e:
            print(f"Error reading settings: {e}")
            runtime_settings = defaults
        finally:
            db.close()

        self.runtime_settings_cache = runtime_settings
        self.runtime_settings_cache_time = now
        return runtime_settings

    def render_annotations(self, frame, raw_data):
        """
        Draw latest analysis overlays onto a frame without re-running inference.
        """
        annotated_frame = frame.copy()
        objects = raw_data.get("objects", []) if isinstance(raw_data, dict) else []
        behavior = raw_data.get("predicted_behavior") or raw_data.get("behavior", "Normal")
        behavior_ready = bool(raw_data.get("behavior_ready", True))

        for obj in objects:
            x1, y1, x2, y2 = map(int, obj.get("box", [0, 0, 0, 0]))
            status = obj.get("status", "Observed")
            color = (0, 255, 0)
            if status == "Missing":
                color = (0, 0, 255)
            elif status in ("Occluded", "At Risk"):
                color = (0, 255, 255)
            elif status == "Observed":
                color = (255, 180, 80)

            label = obj.get("label", "object")
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                annotated_frame,
                f"{label} ({status})",
                (x1, max(18, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                2
            )

        box_label = f"Behavior: {behavior}"
        box_color = (70, 70, 70)
        if behavior == "At Risk":
            box_color = (0, 0, 255)
        elif behavior_ready:
            box_color = (40, 140, 40)

        text_size, _ = cv2.getTextSize(box_label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        box_width = text_size[0] + 24
        box_height = 36
        start_x = max(12, annotated_frame.shape[1] - box_width - 20)
        start_y = 16
        cv2.rectangle(
            annotated_frame,
            (start_x, start_y),
            (start_x + box_width, start_y + box_height),
            box_color,
            -1
        )
        cv2.putText(
            annotated_frame,
            box_label,
            (start_x + 12, start_y + 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )

        return annotated_frame

    def _derive_behavior_from_objects(self, objects):
        if any(obj.get("status") == "Missing" for obj in objects):
            return "At Risk", 1.0
        if any(obj.get("status") == "At Risk" for obj in objects):
            return "At Risk", 0.8
        return "Normal", 0.25 if any(objects) else 0.0

    def process_frame(self, frame, context_id="default", initialize_reference=False, analyze_object=None, analyze_behavior=None):
        """
        Process a single frame and return raw detection data plus annotated frame.
        :param frame: BGR image.
        :param context_id: Isolated state key for each stream/video.
        :param initialize_reference: Force reference object initialization on this frame.
        :return: (annotated_frame, raw_data_dict)
        """
        session = self._get_session(context_id)
        runtime_settings = self._get_runtime_settings()
        settings_enable_behavior = bool(runtime_settings.get("behavior_detection", True))
        settings_enable_object = bool(runtime_settings.get("object_monitoring", True))
        enable_object = settings_enable_object if analyze_object is None else (settings_enable_object and analyze_object)

        alerts = []
        ref_objs = []
        persons = []
        monitor = self._select_object_monitor(context_id)

        # Object monitoring
        if enable_object:
            if initialize_reference:
                monitor.start_calibration(context_id)
            alerts, ref_objs, persons = monitor.process_frame(frame, context_id=context_id)
            session["last_persons"] = persons
        else:
            ref_objs = monitor.get_reference_objects(context_id)
            persons = session.get("last_persons", [])

        for obj in ref_objs:
            rid = obj.get("ref_id")
            if rid is not None and int(rid) >= 0:
                session["had_established_references"] = True
                break
        
        predicted_behavior, behavior_confidence = self._derive_behavior_from_objects(ref_objs) if settings_enable_behavior else ("Normal", 0.0)
        elapsed_seconds = time.time() - float(session.get("started_at", time.time()))
        is_live_ws = str(context_id).startswith("ws-")
        empty_scene_at_risk = (
            settings_enable_behavior
            and len(ref_objs) == 0
            and elapsed_seconds >= settings.NO_OBJECT_AT_RISK_SECONDS
        )
        # Live: do not treat "no detections yet / empty room during calibration" as At Risk.
        if empty_scene_at_risk and not (is_live_ws and not session.get("had_established_references")):
            predicted_behavior = "At Risk"
            behavior_confidence = max(behavior_confidence, 0.9)
        session["current_behavior"] = predicted_behavior
        behavior_ready = True
        is_violent = predicted_behavior == "At Risk"
        
        # Log violent behavior
        if is_violent:
            behavior_alert = f"AT RISK (Conf: {behavior_confidence:.2f})"
            alerts.append(behavior_alert)
            self._log_alert(
                "At Risk",
                f"Object status indicates at-risk scene (Conf: {behavior_confidence:.2f})",
                cooldown_key="AT_RISK"
            )

        # Remove duplicate alerts caused by near-duplicate detections.
        alerts = list(dict.fromkeys(alerts))

        # Log missing object alerts with per-object cooldown.
        for alert in alerts:
            if alert.startswith("MISSING: "):
                label = alert.replace("MISSING: ", "", 1).strip()
                self._log_alert(
                    "Object Missing",
                    f"Object '{label}' is missing.",
                    cooldown_key=f"MISSING:{label}"
                )

        # Prepare raw data for frontend
        raw_data = {
            "behavior": predicted_behavior,
            "predicted_behavior": predicted_behavior,
            "behavior_ready": behavior_ready,
            "safety_state": predicted_behavior,
            "confidence": float(behavior_confidence),
            "is_violent": is_violent,
            "alerts": alerts,
            "alert_count": len(alerts),
            "persons": [p.tolist() for p in persons],
            "risk_boxes": [],
            "objects": [
                {
                    "label": obj["label"],
                    "box": obj["box"].tolist(),
                    "status": obj["status"]
                } for obj in ref_objs
            ]
        }

        annotated_frame = self.render_annotations(frame, raw_data)
        return annotated_frame, raw_data

surveillance_service = SurveillanceService()
