import os
import cv2
import tempfile
import shutil
import numpy as np
from uuid import uuid4
from fastapi import APIRouter, File, UploadFile, WebSocket, WebSocketDisconnect, Form, Response, Query
from fastapi.responses import JSONResponse, FileResponse
from app.services.surveillance_service import surveillance_service
from app.core.config import settings

router = APIRouter()

@router.post("/predict/image")
async def predict_image(
    file: UploadFile = File(...),
    return_image: bool = Form(True)
):
    """
    Predict on a single image.
    Returns annotated image or JSON results.
    """
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, file.filename)
    context_id = f"image-{uuid4()}"
    
    try:
        surveillance_service.start_session(context_id)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        frame = cv2.imread(file_path)
        if frame is None:
            return JSONResponse(status_code=400, content={"error": "Invalid image format"})

        annotated_frame, raw_data = surveillance_service.process_frame(
            frame,
            context_id=context_id,
            initialize_reference=True
        )
        behavior = raw_data.get("behavior", "Unknown")
        alerts = raw_data.get("alerts", [])
        
        if return_image:
            _, img_encoded = cv2.imencode('.jpg', annotated_frame)
            return Response(content=img_encoded.tobytes(), media_type="image/jpeg")
        
        return {
            "behavior": behavior,
            "alerts": alerts,
            "success": True
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        surveillance_service.end_session(context_id)
        shutil.rmtree(temp_dir)

@router.post("/process/video")
async def process_video(
    file: UploadFile = File(...),
    fast_mode: bool = Query(True),
    analysis_stride: int | None = Query(None, ge=1, le=10)
):
    """
    Process entire video file.
    Returns processed video with annotations.
    """
    temp_dir = tempfile.mkdtemp()
    input_path = os.path.join(temp_dir, file.filename)
    base_name, _ = os.path.splitext(file.filename)
    context_id = f"video-{uuid4()}"
    
    try:
        surveillance_service.start_session(context_id)
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            return JSONResponse(status_code=400, content={"error": "Could not open video"})
            
        W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        if not fps or fps <= 0:
            fps = 24.0
        
        # Prefer browser-friendly codecs first.
        codec_candidates = [
            ("avc1", "mp4", "video/mp4"),
            ("H264", "mp4", "video/mp4"),
            ("mp4v", "mp4", "video/mp4"),
            ("VP80", "webm", "video/webm"),
        ]
        out = None
        output_path = None
        media_type = "video/mp4"
        output_filename = f"processed_{base_name}.mp4"
        for codec, extension, mime in codec_candidates:
            candidate_path = os.path.join(temp_dir, f"processed_{base_name}.{extension}")
            fourcc = cv2.VideoWriter_fourcc(*codec)
            candidate_out = cv2.VideoWriter(candidate_path, fourcc, fps, (W, H))
            if candidate_out.isOpened():
                out = candidate_out
                output_path = candidate_path
                media_type = mime
                output_filename = f"processed_{base_name}.{extension}"
                break
            candidate_out.release()

        if out is None or output_path is None:
            return JSONResponse(status_code=500, content={"error": "Could not initialize video writer"})
        
        stride = analysis_stride if analysis_stride is not None else (
            settings.VIDEO_FAST_ANALYSIS_STRIDE if fast_mode else 1
        )
        frame_index = 0
        latest_raw_data = None
        
        # Set reference frame logic
        ret, first_frame = cap.read()
        if ret:
            annotated_frame, _ = surveillance_service.process_frame(
                first_frame,
                context_id=context_id,
                initialize_reference=True
            )
            out.write(annotated_frame)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_index += 1
            should_analyze_object = (frame_index % stride == 0) or latest_raw_data is None
            if should_analyze_object:
                annotated_frame, latest_raw_data = surveillance_service.process_frame(
                    frame,
                    context_id=context_id,
                    analyze_object=should_analyze_object,
                )
            else:
                annotated_frame = surveillance_service.render_annotations(frame, latest_raw_data)
            out.write(annotated_frame)
            
        cap.release()
        out.release()
        
        return FileResponse(
            output_path,
            media_type=media_type,
            filename=output_filename
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    # Note: temp_dir should be cleaned up after file is sent, 
    # but FileResponse might need it. For production, use BackgroundTasks.
    finally:
        surveillance_service.end_session(context_id)

@router.websocket("/live/stream")
async def websocket_stream(websocket: WebSocket):
    """
    WebSocket for real-time video analysis.
    Receives frame bytes, returns JSON coordinates and metadata.
    """
    await websocket.accept()
    context_id = f"ws-{uuid4()}"
    surveillance_service.start_session(context_id)
    initialized = False
    try:
        while True:
            data = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                continue
                
            # Now returns (annotated_frame, raw_data) tuple
            _, analysis_data = surveillance_service.process_frame(
                frame,
                context_id=context_id,
                initialize_reference=not initialized
            )
            initialized = True
            
            # Send results as JSON
            await websocket.send_json(analysis_data)
            
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        surveillance_service.end_session(context_id)
