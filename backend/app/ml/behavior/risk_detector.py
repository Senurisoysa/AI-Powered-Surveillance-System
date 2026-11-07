from __future__ import annotations

import cv2
from PIL import Image
import torch
import clip

from app.core.config import settings


class RiskDetector:
    """
    Binary risk detector backed by CLIP zero-shot scene understanding.
    """

    def __init__(self, min_confidence: float = 0.55):
        self.min_confidence = min_confidence
        self.device = settings.DEVICE if settings.DEVICE in ("cuda", "cpu") else "cpu"
        self.model = None
        self.preprocess = None
        self.text_tokens = None
        self._load_model()

    def _load_model(self):
        try:
            self.model, self.preprocess = clip.load("ViT-B/32", device=self.device)
            prompts = [
                "a normal safe everyday scene",
                "a suspicious dangerous violent or criminal scene",
            ]
            self.text_tokens = clip.tokenize(prompts).to(self.device)
        except Exception as exc:
            print(f"Error loading CLIP risk detector: {exc}")
            self.model = None
            self.preprocess = None
            self.text_tokens = None

    def predict(self, frame):
        if self.model is None or self.preprocess is None or self.text_tokens is None:
            return {
                "predicted_behavior": "Normal",
                "risk_score": 0.0,
                "is_at_risk": False,
                "risk_boxes": [],
            }

        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(rgb)
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                logits_per_image, _ = self.model(image_tensor, self.text_tokens)
                probs = logits_per_image.softmax(dim=-1)[0].detach().cpu().tolist()

            normal_score = float(probs[0])
            risk_score = float(probs[1])
            is_at_risk = risk_score >= self.min_confidence and risk_score > normal_score
            return {
                "predicted_behavior": "At Risk" if is_at_risk else "Normal",
                "risk_score": risk_score,
                "is_at_risk": is_at_risk,
                "risk_boxes": [],
            }
        except Exception as exc:
            print(f"Risk detection inference error: {exc}")
            return {
                "predicted_behavior": "Normal",
                "risk_score": 0.0,
                "is_at_risk": False,
                "risk_boxes": [],
            }
