import React from 'react';
import TimelineEvent from './TimelineEvent';
import { SurveillanceEvent } from '@/types';
import { Eye, Activity, MapPin } from 'lucide-react';

interface SurveillanceTimelineProps {
    events: SurveillanceEvent[];
}

export default function SurveillanceTimeline({ events }: SurveillanceTimelineProps) {
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div style={{ height: '500px', overflowY: 'auto' }}>
            <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <Activity size={24} color="var(--accent-brown)" />
                <h2 className="text-xl font-semibold">Surveillance Events</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {events.length === 0 ? (
                    <div className="card text-center text-secondary">
                        <p>No surveillance events detected</p>
                    </div>
                ) : (
                    events.map((event) => (
                        <TimelineEvent
                            key={event.id}
                            timestamp={formatTime(event.timestamp)}
                            title={event.behavior}
                            subtitle={event.camera_id || 'Camera 01'}
                            severity={event.severity || 'low'}
                        >
                            <div style={{
                                marginTop: 'var(--spacing-sm)',
                                padding: 'var(--spacing-sm)',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--border-radius-sm)',
                                fontSize: 'var(--font-size-sm)',
                            }}>
                                <div className="flex-between" style={{ marginBottom: 'var(--spacing-xs)' }}>
                                    <span className="text-secondary">Confidence:</span>
                                    <span className="font-semibold">
                                        {((event.confidence || 0.85) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex-between">
                                    <span className="text-secondary">Severity:</span>
                                    <span className={`badge badge-${(event.severity || 'low') === 'critical' ? 'critical' : (event.severity || 'low') === 'warning' ? 'warning' : 'success'}`}>
                                        {(event.severity || 'low').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </TimelineEvent>
                    ))
                )}
            </div>
        </div>
    );
}
