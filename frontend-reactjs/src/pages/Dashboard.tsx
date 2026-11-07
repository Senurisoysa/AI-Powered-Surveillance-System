import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatCard from '@/components/StatCard';
import AnalyticsOverview from '@/components/AnalyticsOverview';
import MissingObjectTimeline from '@/components/MissingObjectTimeline';
import SurveillanceTimeline from '@/components/SurveillanceTimeline';
import { Activity, AlertTriangle, Package, Target } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    suspiciousBehaviors: 0,
    missingObjects: 0,
    averageConfidence: 0
  });
  const [behaviorEvents, setBehaviorEvents] = useState([]);
  const [objectEvents, setObjectEvents] = useState([]);


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await axios.get(`${API_BASE_URL}/history/dashboard-stats`);
        setStats(statsRes.data);

        const behaviorRes = await axios.get(`${API_BASE_URL}/history/events/behavior?limit=5`);
        setBehaviorEvents(behaviorRes.data);

        const objectRes = await axios.get(`${API_BASE_URL}/history/events/objects?limit=5`);
        setObjectEvents(objectRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
    // Refresh stats periodically
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);



  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <h1 className="text-3xl font-bold" style={{ marginBottom: 'var(--spacing-xs)' }}>
          Surveillance Dashboard
        </h1>
        <p className="text-secondary">
          Real-time monitoring and analysis
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-4 animate-fade-in" style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <StatCard
          title="Total Events"
          value={stats.totalEvents}
          icon={Activity}
          trend={0}
          color="brown"
        />
        <StatCard
          title="Critical Alerts"
          value={stats.suspiciousBehaviors}
          icon={AlertTriangle}
          trend={0}
          color="critical"
        />
        <StatCard
          title="Missing Objects"
          value={stats.missingObjects}
          icon={Package}
          color="warning"
        />
        <StatCard
          title="Avg Confidence"
          value={`${(stats.averageConfidence * 100).toFixed(0)}%`}
          icon={Target}
          trend={0}
          color="green"
        />
      </div>

      {/* Analytics Section */}
      <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <AnalyticsOverview />
      </div>

      {/* Timelines Section */}
      <div className="grid grid-2 gap-xl">
        <MissingObjectTimeline events={objectEvents} />
        <SurveillanceTimeline events={behaviorEvents} />
      </div>
    </div>
  );
}
