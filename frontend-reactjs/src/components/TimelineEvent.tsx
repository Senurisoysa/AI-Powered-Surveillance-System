import React from 'react';
import { CircleDot } from 'lucide-react';

interface TimelineEventProps {
    timestamp: string;
    title: string;
    subtitle?: string;
    severity: 'critical' | 'warning' | 'normal' | 'low';
    onViewClick?: () => void;
    children?: React.ReactNode;
}

export default function TimelineEvent({
    timestamp,
    title,
    subtitle,
    severity,
    onViewClick,
    children
}: TimelineEventProps) {
    const severityColors = {
        critical: 'var(--status-critical)',
        warning: 'var(--status-warning)',
        normal: 'var(--status-success)',
        low: 'var(--status-info)',
    };

    return (
        <div
            className="card card-accent animate-slide-in"
            style={{
                borderLeftColor: severityColors[severity],
            }}
        >
            <div className="flex-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                <div className="flex items-center gap-sm">
                    <CircleDot size={12} color={severityColors[severity]} />
                    <span className="text-sm text-secondary">{timestamp}</span>
                </div>
            </div>

            <h4 className="font-semibold" style={{ marginBottom: 'var(--spacing-xs)' }}>
                {title}
            </h4>

            {subtitle && (
                <p className="text-sm text-secondary" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    {subtitle}
                </p>
            )}

            {children}

            {onViewClick && (
                <button
                    className="btn btn-secondary"
                    onClick={onViewClick}
                    style={{
                        marginTop: 'var(--spacing-sm)',
                        fontSize: 'var(--font-size-xs)',
                        padding: 'var(--spacing-xs) var(--spacing-sm)'
                    }}
                >
                    View Details
                </button>
            )}
        </div>
    );
}
