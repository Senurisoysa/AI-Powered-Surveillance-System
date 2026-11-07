from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List
from app.db.database import get_db
from app.db import models, schemas
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/history", response_model=List[schemas.Alert])
def get_alert_history(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    alerts = db.query(models.Alert).order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()
    return alerts

@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_events = db.query(models.Alert).count()
    
    # Simple heuristic: missing object starts with 'Object Missing' vs suspicious behaviors
    missing_objects = db.query(models.Alert).filter(models.Alert.behavior == 'Object Missing').count()
    suspicious_behaviors = db.query(models.Alert).filter(models.Alert.behavior != 'Object Missing').count()
    
    return {
        "totalEvents": total_events,
        "suspiciousBehaviors": suspicious_behaviors,
        "missingObjects": missing_objects,
        "averageConfidence": 0.85 # Hardcoded mock value for now, as DB model doesn't store confidence
    }

@router.get("/events/behavior", response_model=List[schemas.Alert])
def get_behavior_events(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    events = db.query(models.Alert).filter(models.Alert.behavior != 'Object Missing').order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()
    return events

@router.get("/events/objects", response_model=List[schemas.Alert])
def get_object_events(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    events = db.query(models.Alert).filter(models.Alert.behavior == 'Object Missing').order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()
    return events

@router.get("/analytics/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    # Count alerts by type (behavior)
    summary = db.query(
        models.Alert.behavior, 
        func.count(models.Alert.id).label("count")
    ).group_by(models.Alert.behavior).all()
    
    last_24h = datetime.now() - timedelta(hours=24)
    recent_count = db.query(models.Alert).filter(models.Alert.timestamp >= last_24h).count()
    
    # Format for chart doughnut
    labels = []
    values = []
    for item in summary:
        labels.append(item[0])
        values.append(item[1])
        
    critical_events = db.query(models.Alert).filter(models.Alert.behavior != 'Object Missing').count()
    normal_activities = db.query(models.Alert).filter(models.Alert.behavior == 'Object Missing').count()

    return {
        "labels": labels,
        "values": values,
        "totalBehaviors": len(labels),
        "criticalEvents": critical_events,
        "normalActivities": normal_activities,
        "total_24h": recent_count
    }
