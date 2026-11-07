import { SurveillanceEvent, MissingObjectEvent, DashboardStats, TimeSeriesData } from '@/types';

// Mock surveillance events
export const mockSurveillanceEvents: SurveillanceEvent[] = [
    {
        id: '1',
        timestamp: '2026-01-05T08:32:15Z',
        behavior: 'Fighting',
        confidence: 0.94,
        camera_id: 'Camera 1',
        severity: 'critical',
    },
    {
        id: '2',
        timestamp: '2026-01-05T08:28:40Z',
        behavior: 'Stealing',
        confidence: 0.87,
        camera_id: 'Camera 2',
        severity: 'critical',
    },
    {
        id: '3',
        timestamp: '2026-01-05T08:25:10Z',
        behavior: 'Shoplifting',
        confidence: 0.82,
        camera_id: 'Camera 1',
        severity: 'warning',
    },
    {
        id: '4',
        timestamp: '2026-01-05T08:20:55Z',
        behavior: 'Normal',
        confidence: 0.92,
        camera_id: 'Camera 3',
        severity: 'normal',
    },
    {
        id: '5',
        timestamp: '2026-01-05T08:15:30Z',
        behavior: 'Abuse',
        confidence: 0.89,
        camera_id: 'Camera 2',
        severity: 'critical',
    },
];

// Mock missing object events
export const mockMissingObjects: MissingObjectEvent[] = [
    {
        id: '1',
        timestamp: '2026-01-05T08:30:45Z',
        object_label: 'laptop',
        last_seen: '2026-01-05T08:25:30Z',
        camera_id: 'Camera 1',
        zone: 'Zone A',
        status: 'Missing',
    },
    {
        id: '2',
        timestamp: '2026-01-05T08:15:22Z',
        object_label: 'backpack',
        last_seen: '2026-01-05T08:10:15Z',
        camera_id: 'Camera 2',
        zone: 'Zone B',
        status: 'Missing',
    },
    {
        id: '3',
        timestamp: '2026-01-05T08:05:10Z',
        object_label: 'phone',
        last_seen: '2026-01-05T08:00:45Z',
        camera_id: 'Camera 1',
        zone: 'Zone A',
        status: 'Recovered',
    },
];

// Mock dashboard statistics
export const mockDashboardStats: DashboardStats = {
    totalEvents: 8,
    suspiciousBehaviors: 3,
    missingObjects: 2,
    averageConfidence: 0.88,
};

// Mock time series data for charts
export const mockTimeSeriesData: TimeSeriesData[] = [
    { timestamp: '08:00', behaviors: 1, missingObjects: 0 },
    { timestamp: '08:15', behaviors: 2, missingObjects: 1 },
    { timestamp: '08:30', behaviors: 3, missingObjects: 2 },
    { timestamp: '08:45', behaviors: 2, missingObjects: 1 },
    { timestamp: '09:00', behaviors: 1, missingObjects: 0 },
];

// Behavior distribution data
export const mockBehaviorDistribution = [
    { label: 'Fighting', value: 2 },
    { label: 'Stealing', value: 1 },
    { label: 'Shoplifting', value: 1 },
    { label: 'Abuse', value: 1 },
    { label: 'Normal', value: 3 },
];
