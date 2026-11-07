import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useTheme } from '@/context/ThemeContext';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { TrendingUp } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function AnalyticsOverview() {
    const { theme } = useTheme();
    const [analyticsData, setAnalyticsData] = useState({
        labels: [],
        values: [],
        totalBehaviors: 0,
        criticalEvents: 0,
        normalActivities: 0,
        total_24h: 0
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/history/analytics/summary`);
                setAnalyticsData(res.data);
            } catch (error) {
                console.error("Error fetching analytics data:", error);
            }
        };

        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 10000);
        return () => clearInterval(interval);
    }, []);

    const behaviorData = {
        labels: analyticsData.labels.length > 0 ? analyticsData.labels : ['No Data'],
        datasets: [{
            label: 'Behavior Distribution',
            data: analyticsData.values.length > 0 ? analyticsData.values : [1],
            backgroundColor: [
                '#c45a54',
                '#d4a05c',
                '#7a9b76',
                '#8b6f47',
                '#9db899',
            ],
            borderWidth: 0,
        }],
    };

    const chartOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right' as const,
                    labels: {
                        color: theme === 'dark' ? '#9aa3b2' : '#6b5f4f',
                        padding: 15,
                        font: {
                            family: 'Inter',
                        },
                    },
                },
            },
        }),
        [theme]
    );

    return (
        <div>
            <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <TrendingUp size={24} color="var(--accent-brown)" />
                <h2 className="text-xl font-semibold">Analytics Overview</h2>
            </div>

            <div className="grid grid-2 gap-lg">
                <div className="card">
                    <h3 className="font-semibold" style={{ marginBottom: 'var(--spacing-md)' }}>
                        Behavior Distribution
                    </h3>
                    <div style={{ height: '300px' }}>
                        <Doughnut data={behaviorData} options={chartOptions} />
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-semibold" style={{ marginBottom: 'var(--spacing-md)' }}>
                        Detection Summary
                    </h3>
                    <div className="flex-col gap-md" style={{ height: '300px', justifyContent: 'center' }}>
                        <div className="flex-between" style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)' }}>
                            <span className="text-secondary">Types of Behaviors</span>
                            <span className="font-bold text-xl">{analyticsData.totalBehaviors}</span>
                        </div>
                        <div className="flex-between" style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)' }}>
                            <span className="text-secondary">Critical Events</span>
                            <span className="font-bold text-xl" style={{ color: 'var(--status-critical)' }}>{analyticsData.criticalEvents}</span>
                        </div>
                        <div className="flex-between" style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)' }}>
                            <span className="text-secondary">Normal Activities</span>
                            <span className="font-bold text-xl" style={{ color: 'var(--accent-green)' }}>{analyticsData.normalActivities}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
