import React, { useState } from 'react';
import { ToggleState } from '@/types';

interface VideoAnalyticsViewerProps {
    videoUrl?: string;
}

export default function VideoAnalyticsViewer({ videoUrl }: VideoAnalyticsViewerProps) {
    const [toggles, setToggles] = useState<ToggleState>({
        showPersonBoxes: true,
        showObjectBoxes: true,
        showLabels: true,
        showConfidence: false,
    });

    const handleToggle = (key: keyof ToggleState) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="glass-card">
            <h2 className="text-xl font-bold" style={{ marginBottom: 'var(--spacing-lg)' }}>
                🎥 Video Analytics Viewer
            </h2>

            {/* Video Player */}
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--border-radius-md)',
                overflow: 'hidden',
                marginBottom: 'var(--spacing-lg)',
                position: 'relative',
            }}>
                {videoUrl ? (
                    <video
                        controls
                        style={{
                            width: '100%',
                            maxHeight: '500px',
                            display: 'block',
                        }}
                    >
                        <source src={videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                ) : (
                    <div style={{
                        height: '400px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 'var(--spacing-md)',
                        color: 'var(--text-secondary)',
                    }}>
                        <span style={{ fontSize: '4rem' }}>📹</span>
                        <p>No video loaded</p>
                        <p className="text-sm">Upload a video or start live monitoring</p>
                    </div>
                )}
            </div>

            {/* Toggle Controls */}
            <div>
                <h3 className="font-semibold" style={{ marginBottom: 'var(--spacing-md)' }}>
                    Annotation Controls
                </h3>

                <div className="grid grid-2" style={{ gap: 'var(--spacing-md)' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        padding: 'var(--spacing-sm)',
                        background: toggles.showPersonBoxes ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                        borderRadius: 'var(--border-radius-sm)',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: toggles.showPersonBoxes ? 'var(--accent-blue)' : 'var(--glass-border)',
                        transition: 'all 0.2s ease',
                    }}>
                        <input
                            type="checkbox"
                            checked={toggles.showPersonBoxes}
                            onChange={() => handleToggle('showPersonBoxes')}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>Show Person Boxes</span>
                    </label>

                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        padding: 'var(--spacing-sm)',
                        background: toggles.showObjectBoxes ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                        borderRadius: 'var(--border-radius-sm)',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: toggles.showObjectBoxes ? 'var(--accent-blue)' : 'var(--glass-border)',
                        transition: 'all 0.2s ease',
                    }}>
                        <input
                            type="checkbox"
                            checked={toggles.showObjectBoxes}
                            onChange={() => handleToggle('showObjectBoxes')}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>Show Object Boxes</span>
                    </label>

                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        padding: 'var(--spacing-sm)',
                        background: toggles.showLabels ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                        borderRadius: 'var(--border-radius-sm)',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: toggles.showLabels ? 'var(--accent-blue)' : 'var(--glass-border)',
                        transition: 'all 0.2s ease',
                    }}>
                        <input
                            type="checkbox"
                            checked={toggles.showLabels}
                            onChange={() => handleToggle('showLabels')}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>Show Labels</span>
                    </label>

                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        padding: 'var(--spacing-sm)',
                        background: toggles.showConfidence ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                        borderRadius: 'var(--border-radius-sm)',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: toggles.showConfidence ? 'var(--accent-blue)' : 'var(--glass-border)',
                        transition: 'all 0.2s ease',
                    }}>
                        <input
                            type="checkbox"
                            checked={toggles.showConfidence}
                            onChange={() => handleToggle('showConfidence')}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>Show Confidence Scores</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
