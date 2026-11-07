import os
import torch
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Configuration
    PROJECT_NAME: str = "AI Surveillance System"
    API_V1_STR: str = "/api/v1"
    
    # Model Paths
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8s-world.pt")
    LIVE_YOLO_MODEL_PATH: str = os.getenv("LIVE_YOLO_MODEL_PATH", "yolov8x.pt")
    BEHAVIOR_MODEL_PATH: str = os.getenv("BEHAVIOR_MODEL_PATH", "weights/suspicious_behavior_model.pth")
    CLASSES_PATH: str = os.getenv("CLASSES_PATH", "weights/classes.txt")
    RISK_MIN_CONFIDENCE: float = float(os.getenv("RISK_MIN_CONFIDENCE", "0.55"))
    BEHAVIOR_WARMUP_FRAMES: int = int(os.getenv("BEHAVIOR_WARMUP_FRAMES", "12"))
    BEHAVIOR_ENTER_STREAK: int = int(os.getenv("BEHAVIOR_ENTER_STREAK", "3"))
    BEHAVIOR_EXIT_STREAK: int = int(os.getenv("BEHAVIOR_EXIT_STREAK", "4"))
    BEHAVIOR_ENTER_EMA: float = float(os.getenv("BEHAVIOR_ENTER_EMA", "0.68"))
    BEHAVIOR_EXIT_EMA: float = float(os.getenv("BEHAVIOR_EXIT_EMA", "0.48"))
    BEHAVIOR_SINGLE_PERSON_HIGH_RISK: float = float(os.getenv("BEHAVIOR_SINGLE_PERSON_HIGH_RISK", "0.68"))
    
    # Model Hyperparameters
    NUM_CLASSES: int = 21
    SEQUENCE_LENGTH: int = 8
    BEHAVIOR_SMOOTHING_WINDOW: int = int(os.getenv("BEHAVIOR_SMOOTHING_WINDOW", "5"))
    VIOLENT_STREAK_THRESHOLD: int = int(os.getenv("VIOLENT_STREAK_THRESHOLD", "5"))
    BEHAVIOR_MIN_CONFIDENCE: float = float(os.getenv("BEHAVIOR_MIN_CONFIDENCE", "0.55"))
    MIN_PERSONS_FOR_VIOLENCE: int = int(os.getenv("MIN_PERSONS_FOR_VIOLENCE", "2"))
    MISSING_THRESHOLD_FRAMES: int = int(os.getenv("MISSING_THRESHOLD_FRAMES", "30"))
    LIVE_MISSING_THRESHOLD_FRAMES: int = int(os.getenv("LIVE_MISSING_THRESHOLD_FRAMES", "0"))
    OBJECT_MATCH_IOU: float = float(os.getenv("OBJECT_MATCH_IOU", "0.45"))
    OBJECT_RELAXED_IOU: float = float(os.getenv("OBJECT_RELAXED_IOU", "0.35"))
    OBJECT_OCCLUSION_IOU: float = float(os.getenv("OBJECT_OCCLUSION_IOU", "0.2"))
    OBJECT_DET_CONF: float = float(os.getenv("OBJECT_DET_CONF", "0.15"))
    LIVE_OBJECT_DET_CONF: float = float(os.getenv("LIVE_OBJECT_DET_CONF", "0.35"))
    LIVE_REACQUIRE_CONFIDENCE: float = float(os.getenv("LIVE_REACQUIRE_CONFIDENCE", "0.6"))
    BAG_FOCUSED_CONF: float = float(os.getenv("BAG_FOCUSED_CONF", "0.08"))
    BAG_MAX_AREA_RATIO: float = float(os.getenv("BAG_MAX_AREA_RATIO", "0.15"))
    NO_OBJECT_AT_RISK_SECONDS: float = float(os.getenv("NO_OBJECT_AT_RISK_SECONDS", "5.0"))
    OBJECT_CALIBRATION_FRAMES: int = int(os.getenv("OBJECT_CALIBRATION_FRAMES", "20"))
    LIVE_OBJECT_CALIBRATION_FRAMES: int = int(os.getenv("LIVE_OBJECT_CALIBRATION_FRAMES", "8"))
    OBJECT_BASELINE_MIN_RATIO: float = float(os.getenv("OBJECT_BASELINE_MIN_RATIO", "0.5"))
    OBJECT_MEMORY_PROMOTION_FRAMES: int = int(os.getenv("OBJECT_MEMORY_PROMOTION_FRAMES", "60"))
    OBJECT_CANDIDATE_STALE_FRAMES: int = int(os.getenv("OBJECT_CANDIDATE_STALE_FRAMES", "900"))
    OBJECT_CLASS_GROWTH_MARGIN: int = int(os.getenv("OBJECT_CLASS_GROWTH_MARGIN", "0"))
    LIVE_OBJECT_MEMORY_PROMOTION_FRAMES: int = int(os.getenv("LIVE_OBJECT_MEMORY_PROMOTION_FRAMES", "25"))
    LIVE_OBJECT_CANDIDATE_STALE_FRAMES: int = int(os.getenv("LIVE_OBJECT_CANDIDATE_STALE_FRAMES", "7200"))
    LIVE_SHOW_OBSERVED_OBJECTS: bool = os.getenv("LIVE_SHOW_OBSERVED_OBJECTS", "false").lower() == "true"
    LIVE_COUNT_OCCLUSION_AS_MISSING: bool = os.getenv("LIVE_COUNT_OCCLUSION_AS_MISSING", "true").lower() == "true"
    VIDEO_FAST_ANALYSIS_STRIDE: int = int(os.getenv("VIDEO_FAST_ANALYSIS_STRIDE", "2"))
    MONITORED_OBJECT_CLASSES: str = os.getenv(
        "MONITORED_OBJECT_CLASSES",
        "chair,couch,sofa,dining table,table,desk,tv,monitor,laptop,cell phone,phone,backpack,back pack,school bag,travel bag,duffel bag,shoulder bag,tote bag,handbag,bag,purse,suitcase,luggage,bottle,cup,book,remote,keyboard,mouse,car,bus,truck,motorcycle,bicycle,door,window,cabinet,bed"
    )
    BAG_FOCUSED_CLASSES: str = os.getenv(
        "BAG_FOCUSED_CLASSES",
        "backpack,back pack,school bag,travel bag,duffel bag,shoulder bag,tote bag,handbag,bag,purse"
    )
    
    # Device Selection
    DEVICE: str = os.getenv("DEVICE", "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))

    class Config:
        case_sensitive = True

settings = Settings()
