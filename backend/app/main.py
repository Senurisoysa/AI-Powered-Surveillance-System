from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import surveillance, history, settings
from app.core.config import settings as app_settings
from app.db import models
from app.db.database import engine, SessionLocal
from sqlalchemy.orm import Session

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Initialize default settings
def init_settings():
    db = SessionLocal()
    defaults = [
        {"key": "behavior_detection", "value": "true", "description": "Enable/Disable behavior analysis"},
        {"key": "object_monitoring", "value": "true", "description": "Enable/Disable missing object monitoring"},
        {"key": "sensitivity", "value": "0.5", "description": "Detection sensitivity threshold"}
    ]
    for d in defaults:
        if not db.query(models.Setting).filter(models.Setting.key == d["key"]).first():
            db.add(models.Setting(**d))
    db.commit()
    db.close()

init_settings()

app = FastAPI(
    title=app_settings.PROJECT_NAME,
    openapi_url=f"{app_settings.API_V1_STR}/openapi.json",
    description="Professional Real-Time Surveillance System with History and Analytics",
    version="2.0.0"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(surveillance.router, prefix=f"{app_settings.API_V1_STR}/surveillance", tags=["surveillance"])
app.include_router(history.router, prefix=f"{app_settings.API_V1_STR}/history", tags=["history"])
app.include_router(settings.router, prefix=f"{app_settings.API_V1_STR}/settings", tags=["settings"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to the AI Surveillance System API",
        "status": "online",
        "device": app_settings.DEVICE,
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
