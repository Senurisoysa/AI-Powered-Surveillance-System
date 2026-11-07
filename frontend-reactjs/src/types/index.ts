export interface SurveillanceEvent {
    id: string | number;
    timestamp: string;
    behavior: string;
    details?: string;
    confidence?: number;
    camera_id?: string;
    severity?: 'critical' | 'warning' | 'normal' | 'low';
    thumbnail?: string;
    video_clip_url?: string;
}

export interface MissingObjectEvent extends SurveillanceEvent {
    object_label?: string;
    last_seen?: string;
    zone?: string;
    status?: 'Missing' | 'Recovered';
}

// Statistics types
export interface DashboardStats {
    totalEvents: number;
    suspiciousBehaviors: number;
    missingObjects: number;
    averageConfidence: number;
}

// Video annotation types
export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface Annotation {
    type: 'person' | 'object';
    box: BoundingBox;
    label: string;
    confidence?: number;
    status?: 'Present' | 'Missing' | 'Occluded';
    timestamp: number; // video timestamp in seconds
}

export interface VideoAnnotations {
    annotations: Annotation[];
    events: {
        timestamp: number;
        type: 'behavior' | 'missing_object';
        severity?: 'critical' | 'warning' | 'normal';
    }[];
}

// Toggle state for video viewer
export interface ToggleState {
    showPersonBoxes: boolean;
    showObjectBoxes: boolean;
    showLabels: boolean;
    showConfidence: boolean;
}

// Chart data types
export interface ChartDataPoint {
    label: string;
    value: number;
}

export interface TimeSeriesData {
    timestamp: string;
    behaviors: number;
    missingObjects: number;
}
