from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db import models, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.Setting])
def get_settings(db: Session = Depends(get_db)):
    return db.query(models.Setting).all()

@router.patch("/{key}", response_model=schemas.Setting)
def update_setting(
    key: str, 
    setting_update: schemas.SettingUpdate, 
    db: Session = Depends(get_db)
):
    db_setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    if not db_setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    db_setting.value = setting_update.value
    db.commit()
    db.refresh(db_setting)
    return db_setting
