import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Camera, Upload, Square, AlertCircle, Eye, EyeOff, RotateCcw, Download } from 'lucide-react';

interface LiveCCTVMonitorProps {
    onAnalysisResult?: (result: any) => void;
}

export default function LiveCCTVMonitor({ onAnalysisResult }: LiveCCTVMonitorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const captureCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const animationRef = useRef<number | null>(null);

    const [isStreaming, setIsStreaming] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [analysisResults, setAnalysisResults] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string>('');
    const [showBoxes, setShowBoxes] = useState(true);
    const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
    const [processedVideoName, setProcessedVideoName] = useState('processed-video.mp4');

    const socketRef = useRef<WebSocket | null>(null);
    const [stats, setStats] = useState({ behavior: 'Idle', confidence: 0 });
    const alertItems: string[] = Array.isArray(analysisResults?.alerts) ? analysisResults.alerts : [];
    const behaviorLabel = analysisResults?.behavior ?? (isAnalyzing ? 'Analyzing...' : 'Idle');
    const behaviorConfidence = typeof analysisResults?.confidence === 'number' ? analysisResults.confidence : stats.confidence;
    const behaviorReady = Boolean(analysisResults?.behavior_ready);
    const behaviorBoxStyle = useMemo(() => {
        if (behaviorLabel === 'At Risk') {
            return {
                background: 'rgba(239, 68, 68, 0.92)',
                border: '1px solid rgba(254, 202, 202, 0.7)',
            };
        }
        if (behaviorReady || behaviorLabel === 'Normal') {
            return {
                background: 'rgba(34, 197, 94, 0.88)',
                border: '1px solid rgba(220, 252, 231, 0.7)',
            };
        }
        return {
            background: 'rgba(51, 65, 85, 0.88)',
            border: '1px solid rgba(203, 213, 225, 0.5)',
        };
    }, [behaviorLabel, behaviorReady]);
    const objectStatusLabels = useMemo(() => {
        const objects = Array.isArray(analysisResults?.objects) ? analysisResults.objects : [];
        const counts = new Map<string, number>();
        for (const obj of objects) {
            const key = `${obj.label}: ${obj.status}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        return Array.from(counts.entries()).map(([label, count]) => (count > 1 ? `${label} x${count}` : label));
    }, [analysisResults]);

    const startCCTV = async () => {
        try {
            setError('');
            setAnalysisResults(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setIsStreaming(true);

                videoRef.current.onloadedmetadata = () => {
                    initWebSocket();
                    startDrawingLoop();
                };
            }
        } catch (err) {
            setError('Unable to access CCTV. Please check permissions.');
            console.error('CCTV error:', err);
        }
    };

    const initWebSocket = () => {
        const ws = new WebSocket('ws://localhost:8000/api/v1/surveillance/live/stream');
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to AI Analysis Server');
            setIsAnalyzing(true);
            startAnalysisLoop();
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setAnalysisResults(data);
                setStats({ 
                    behavior: data.behavior, 
                    confidence: data.confidence 
                });
                if (onAnalysisResult) onAnalysisResult(data);
            } catch (err) {
                console.error('Error parsing analysis data:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket Error:', err);
            setError('Connection to AI server failed.');
        };

        ws.onclose = () => {
            setIsAnalyzing(false);
            console.log('AI Analysis Server disconnected');
        };
    };

    const stopCCTV = () => {
        if (socketRef.current) {
            socketRef.current.close();
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsStreaming(false);
            setIsAnalyzing(false);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }
    };

    const replayProcessedVideo = async () => {
        if (!videoRef.current || !processedVideoUrl) return;
        videoRef.current.currentTime = 0;
        try {
            await videoRef.current.play();
        } catch {
            setError('Unable to replay the processed video in this browser.');
        }
    };

    const downloadProcessedVideo = () => {
        if (!processedVideoUrl) return;
        const link = document.createElement('a');
        link.href = processedVideoUrl;
        link.download = processedVideoName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const startDrawingLoop = () => {
        const draw = () => {
            if (overlayCanvasRef.current && videoRef.current) {
                const canvas = overlayCanvasRef.current;
                const video = videoRef.current;
                const ctx = canvas.getContext('2d');

                if (ctx && video.videoWidth > 0) {
                    canvas.width = video.clientWidth;
                    canvas.height = video.clientHeight;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    if (analysisResults && showBoxes) {
                        drawBoundingBoxes(ctx, canvas.width, canvas.height);
                    }
                }
            }
            animationRef.current = requestAnimationFrame(draw);
        };
        draw();
    };

    const drawBoundingBoxes = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
        const video = videoRef.current;
        if (!video) return;

        const scaleX = canvasWidth / video.videoWidth;
        const scaleY = canvasHeight / video.videoHeight;

        // Draw Object Boxes
        if (analysisResults.objects) {
            analysisResults.objects.forEach((obj: any) => {
                const [x1, y1, x2, y2] = obj.box;
                let color = '#7a9b76'; // Default green
                if (obj.status === 'Missing') color = '#ef4444'; // Red
                if (obj.status === 'Occluded') color = '#f59e0b'; // Amber
                if (obj.status === 'At Risk') color = '#f59e0b'; // Amber
                if (obj.status === 'Observed') color = '#60a5fa'; // Blue
                if (obj.status === 'Calibrating') color = '#a78bfa'; // Violet

                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x1 * scaleX, y1 * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY);

                const label = `${obj.label} (${obj.status})`;
                ctx.font = 'bold 13px Inter, sans-serif';
                const textWidth = ctx.measureText(label).width;
                const labelX = x1 * scaleX;
                const labelY = Math.max(16, y1 * scaleY - 8);
                ctx.fillStyle = color;
                ctx.fillRect(labelX - 2, labelY - 14, textWidth + 8, 16);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, labelX + 2, labelY - 2);
            });
        }

        // Draw Person Boxes if Violent
        if (analysisResults.is_violent && analysisResults.persons) {
            analysisResults.persons.forEach((box: any) => {
                const [x1, y1, x2, y2] = box;
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3;
                ctx.strokeRect(x1 * scaleX, y1 * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY);
                
                ctx.fillStyle = '#ef4444';
                ctx.fillText('SUSPICIOUS ACTIVITY', x1 * scaleX, y1 * scaleY - 5);
            });
        }
    };

    const startAnalysisLoop = () => {
        const interval = setInterval(() => {
            captureAndSend();
        }, 5000); // Refresh every 5 seconds for presence re-check

        return () => clearInterval(interval);
    };

    const captureAndSend = () => {
        if (!videoRef.current || !captureCanvasRef.current || !socketRef.current) return;
        if (socketRef.current.readyState !== WebSocket.OPEN) return;

        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob && socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(blob);
            }
        }, 'image/jpeg', 0.6);
    };

    const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setError('');
            setIsAnalyzing(true);
            setAnalysisResults(null);
            stopCCTV();

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:8000/api/v1/surveillance/process/video?fast_mode=true&analysis_stride=6', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                if (processedVideoUrl) {
                    URL.revokeObjectURL(processedVideoUrl);
                }
                const originalName = file.name.replace(/\.[^/.]+$/, '');
                const extension = blob.type.includes('webm') ? 'webm' : 'mp4';
                setProcessedVideoUrl(url);
                setProcessedVideoName(`${originalName}-processed.${extension}`);

                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                    videoRef.current.src = url;
                    videoRef.current.load();
                    try {
                        await videoRef.current.play();
                    } catch {
                        setError('Processed video format is not supported by this browser. Try another input video or restart backend to use a different codec.');
                    }
                }
            } else {
                setError('Failed to process video');
            }
        } catch (err) {
            setError('Error uploading video');
            console.error('Upload error:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (processedVideoUrl) {
                URL.revokeObjectURL(processedVideoUrl);
            }
        };
    }, [stream, processedVideoUrl]);

    return (
        <div className="card">
            <div className="flex-between" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h2 className="text-xl font-semibold">Live Monitoring</h2>

                <div className="flex gap-md">
                    {isStreaming && (
                        <button
                            className={`btn ${showBoxes ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setShowBoxes(!showBoxes)}
                        >
                            {showBoxes ? <Eye size={18} /> : <EyeOff size={18} />}
                            {showBoxes ? 'Hide' : 'Show'} Boxes
                        </button>
                    )}

                    {!isStreaming ? (
                        <>
                            <button className="btn btn-primary" onClick={startCCTV}>
                                <Camera size={18} />
                                Start CCTV
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={18} />
                                Upload Video
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                onChange={handleVideoUpload}
                                style={{ display: 'none' }}
                            />
                        </>
                    ) : isStreaming ? (
                        <button className="btn btn-secondary" onClick={stopCCTV}>
                            <Square size={18} />
                            Stop
                        </button>
                    ) : null}

                    {processedVideoUrl && !isStreaming && (
                        <>
                            <button className="btn btn-secondary" onClick={replayProcessedVideo}>
                                <RotateCcw size={18} />
                                Replay
                            </button>
                            <button className="btn btn-secondary" onClick={downloadProcessedVideo}>
                                <Download size={18} />
                                Download
                            </button>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-sm" style={{
                    padding: 'var(--spacing-md)',
                    background: 'rgba(196, 90, 84, 0.1)',
                    borderRadius: 'var(--border-radius-md)',
                    marginBottom: 'var(--spacing-lg)',
                    color: 'var(--status-critical)',
                }}>
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {alertItems.length > 0 && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--border-radius-md)',
                    marginBottom: 'var(--spacing-lg)',
                    background: 'rgba(196, 90, 84, 0.15)',
                    border: '1px solid rgba(196, 90, 84, 0.45)',
                }}>
                    <div className="font-semibold" style={{ color: 'var(--status-critical)', marginBottom: 'var(--spacing-xs)' }}>
                        Active Alerts ({alertItems.length})
                    </div>
                    <div className="text-sm" style={{ display: 'grid', gap: '6px' }}>
                        {alertItems.map((alert: string, idx: number) => (
                            <div key={`${alert}-${idx}`} style={{ color: 'var(--text-primary)' }}>
                                - {alert}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{
                position: 'relative',
                marginBottom: 'var(--spacing-lg)',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--border-radius-lg)',
                overflow: 'hidden',
            }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        maxHeight: '600px',
                    }}
                />

                {/* canvas for drawing boxes */}
                <canvas
                    ref={overlayCanvasRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 5,
                    }}
                />

                {isAnalyzing && (
                    <div style={{
                        position: 'absolute',
                        top: 'var(--spacing-md)',
                        right: 'var(--spacing-md)',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        background: 'rgba(122, 155, 118, 0.9)',
                        color: 'white',
                        borderRadius: 'var(--border-radius-md)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                    }}>
                        Analyzing...
                    </div>
                )}

                {objectStatusLabels.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: 'var(--spacing-md)',
                        left: 'var(--spacing-md)',
                        maxWidth: '65%',
                        padding: '10px 12px',
                        background: 'rgba(15, 23, 42, 0.55)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        zIndex: 8,
                        backdropFilter: 'blur(2px)',
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', opacity: 0.9 }}>
                            Detected Objects
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {objectStatusLabels.slice(0, 8).map((label) => (
                                <span
                                    key={label}
                                    style={{
                                        fontSize: '12px',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {(isAnalyzing || analysisResults) && (
                    <div style={{
                        position: 'absolute',
                        top: 'var(--spacing-md)',
                        right: 'var(--spacing-md)',
                        minWidth: '190px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        color: '#ffffff',
                        zIndex: 8,
                        backdropFilter: 'blur(2px)',
                        ...behaviorBoxStyle,
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', opacity: 0.9 }}>
                            Behavior
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.1 }}>
                            {behaviorLabel}
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
                            Confidence: {(behaviorConfidence * 100).toFixed(1)}%
                        </div>
                    </div>
                )}
            </div>

            {/* hidden canvas for capture */}
            <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

            {/* show analysis results */}
            {analysisResults && (
                <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                    <h3 className="font-semibold" style={{ marginBottom: 'var(--spacing-md)' }}>
                        Current Analysis
                    </h3>

                    <div className="grid grid-2 gap-md">
                        <div>
                            <span className="text-sm text-secondary">Behavior:</span>
                            <p className="font-medium">{analysisResults.behavior || 'Analyzing...'}</p>
                        </div>

                        <div>
                            <span className="text-sm text-secondary">Confidence:</span>
                            <p className="font-medium">
                                {analysisResults.confidence
                                    ? `${(analysisResults.confidence * 100).toFixed(1)}%`
                                    : 'N/A'}
                            </p>
                        </div>

                        {analysisResults.objects && analysisResults.objects.length > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <span className="text-sm text-secondary">Detected Objects & Status:</span>
                                <div className="flex gap-sm" style={{ marginTop: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                    {analysisResults.objects.map((obj: any, idx: number) => (
                                        <span key={idx} className={`badge ${obj.status === 'Present' ? 'badge-success' : 'badge-danger'}`} 
                                              style={{ 
                                                backgroundColor: obj.status === 'Missing' ? '#ef4444' : 
                                                               obj.status === 'Occluded' ? '#f59e0b' : '#10b981',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px'
                                              }}>
                                            {obj.label}: {obj.status}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {analysisResults.is_violent && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                                    ⚠️ SUSPICIOUS ACTIVITY DETECTED
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!isStreaming && !error && (
                <div className="text-center text-secondary" style={{ padding: 'var(--spacing-2xl)' }}>
                    <Camera size={48} strokeWidth={1} style={{ margin: '0 auto var(--spacing-md)' }} />
                    <p>Start CCTV or upload a video to begin monitoring</p>
                </div>
            )}
        </div>
    );
}
