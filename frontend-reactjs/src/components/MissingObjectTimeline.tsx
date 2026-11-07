import React from 'react';
import TimelineEvent from './TimelineEvent';
import { MissingObjectEvent } from '@/types';
import { PackageX, Eye, MapPin } from 'lucide-react';

interface MissingObjectTimelineProps {
    events: MissingObjectEvent[];
}

export default function MissingObjectTimeline({ events }: MissingObjectTimelineProps) {
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
                <PackageX size={24} color="var(--status-warning)" />
                <h2 className="text-xl font-semibold">Missing Objects</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {events.length === 0 ? (
                    <div className="card text-center text-secondary">
                        <p>No missing objects detected</p>
                    </div>
                ) : (
                    events.map((event) => (
                        <TimelineEvent
                            key={event.id}
                            timestamp={formatTime(event.timestamp)}
                            title={event.behavior === 'Object Missing' ? (event.details?.split("'")[1] || 'Object') : event.behavior}
                            subtitle={`Alert Logged: ${formatTime(event.timestamp)}`}
                            severity={event.behavior === 'Object Missing' ? 'warning' : 'critical'}
                        >
                            <div style={{
                                marginTop: 'var(--spacing-sm)',
                                padding: 'var(--spacing-sm)',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--border-radius-sm)',
                                fontSize: 'var(--font-size-sm)',
                            }}>
                                <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--spacing-xs)' }}>
                                    <MapPin size={14} color="var(--text-secondary)" />
                                    <span className="text-secondary">{event.camera_id || 'Camera 01'} • {event.zone || 'Entrance'}</span>
                                </div>
                                <div className="flex-between">
                                    <span className="text-secondary">Status:</span>
                                    <span className={`badge ${(event.status || 'Missing') === 'Missing' ? 'badge-warning' : 'badge-success'}`}>
                                        {event.status || 'Missing'}
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
