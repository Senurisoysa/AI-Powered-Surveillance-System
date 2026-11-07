import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    trend?: number;
    color?: 'brown' | 'green' | 'warning' | 'critical';
}

export default function StatCard({ title, value, icon: Icon, trend, color = 'brown' }: StatCardProps) {
    const colorMap = {
        brown: 'var(--accent-brown)',
        green: 'var(--accent-green)',
        warning: 'var(--status-warning)',
        critical: 'var(--status-critical)',
    };

    return (
        <div className="card animate-fade-in">
            <div className="flex-between" style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3 className="text-sm text-secondary font-semibold">{title}</h3>
                <div style={{
                    padding: 'var(--spacing-sm)',
                    background: `${colorMap[color]}15`,
                    borderRadius: 'var(--border-radius-md)'
                }}>
                    <Icon size={20} color={colorMap[color]} />
                </div>
            </div>

            <div className="flex items-center gap-md">
                <div className="text-2xl font-bold" style={{ color: colorMap[color] }}>
                    {value}
                </div>

                {trend !== undefined && (
                    <span
                        className="text-sm font-medium"
                        style={{ color: trend > 0 ? 'var(--accent-green)' : 'var(--status-critical)' }}
                    >
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
        </div>
    );
}
