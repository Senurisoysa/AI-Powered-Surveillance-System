import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LiveCCTVMonitor from '@/components/LiveCCTVMonitor';
import MissingObjectTimeline from '@/components/MissingObjectTimeline';
import SurveillanceTimeline from '@/components/SurveillanceTimeline';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function LiveMonitorPage() {
    const [behaviorEvents, setBehaviorEvents] = useState([]);
    const [objectEvents, setObjectEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const behaviorRes = await axios.get(`${API_BASE_URL}/history/events/behavior?limit=10`);
                setBehaviorEvents(behaviorRes.data);

                const objectRes = await axios.get(`${API_BASE_URL}/history/events/objects?limit=10`);
                setObjectEvents(objectRes.data);
            } catch (error) {
                console.error("Error fetching live monitor events:", error);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 3000); // Faster refresh for live view
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
                <h1 className="text-3xl font-bold" style={{ marginBottom: 'var(--spacing-xs)' }}>
                    Live Monitoring & Analysis
                </h1>
                <p className="text-secondary">
                    Real-time CCTV surveillance or offline video analysis with AI detection
                </p>
            </div>

            {/* Live CCTV & Video Analysis Monitor */}
            <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
                <LiveCCTVMonitor />
            </div>

            {/* Timelines Section */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                 <h2 className="text-xl font-semibold" style={{ marginBottom: 'var(--spacing-md)' }}>Event History</h2>
                 <div className="grid grid-2 gap-xl">
                    <MissingObjectTimeline events={objectEvents} />
                    <SurveillanceTimeline events={behaviorEvents} />
                 </div>
            </div>
        </div>
    );
}
