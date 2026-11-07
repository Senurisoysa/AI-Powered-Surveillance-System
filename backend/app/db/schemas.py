from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class AlertBase(BaseModel):
    behavior: str
    details: str
    image_path: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: int
    timestamp: datetime
    is_read: bool

    class Config:
        from_attributes = True

class SettingBase(BaseModel):
    key: str
    value: str

class SettingUpdate(BaseModel):
    value: str

class Setting(SettingBase):
    id: int
    description: Optional[str] = None

    class Config:
        from_attributes = True
