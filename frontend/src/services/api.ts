/**
 * API Service for Clinical Intelligence Platform
 * Connects frontend to FastAPI backend
 */

const API_BASE_URL = 'http://localhost:8000';

// Types
export interface PatientTimeline {
    patient_id: string;
    demographics: {
        age: number;
        sex: string;
    };
    timeline: {
        blood_sugar: Array<{ date: string; value: number }>;
        blood_pressure: Array<{ date: string; systolic: number; diastolic: number }>;
        notes: Array<{ date: string; text: string }>;
        medications: Array<{ date: string; name: string }>;
    };
}

export interface TrendFeatures {
    age?: number;
    sex?: number;
    sugar_percent_change?: number;
    sugar_trend_up?: number;
    bp_percent_change?: number;
    bp_trend_up?: number;
    trend_duration_months?: number;
    medication_delay?: number;
}

export interface RiskResult {
    patient_id: string;
    risk_score: number;
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
    confidence: number;
    explanation: {
        summary: string[];
        description: string;
        contributing_factors: Array<{
            feature: string;
            display_name: string;
            value: number;
            severity: string;
            explanation: string;
        }>;
    };
    trends: TrendFeatures;
    computed_at: string;
}

export interface ApiAlert {
    id: string;
    patient_id: string;
    patient_name: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    risk_score: number;
    title: string;
    explanation: string;
    drivers: Array<{ factor: string; detail: string }>;
    status: 'active' | 'acknowledged' | 'dismissed';
    time: string;
}

// API Functions
export const api = {
    /**
     * Check API health
     */
    async health(): Promise<{ name: string; version: string; status: string; model_loaded: boolean }> {
        const response = await fetch(`${API_BASE_URL}/`);
        if (!response.ok) throw new Error('API not available');
        return response.json();
    },

    /**
     * Get list of all patients
     */
    async getPatients(): Promise<{ patients: string[]; count: number }> {
        const response = await fetch(`${API_BASE_URL}/patients`);
        if (!response.ok) throw new Error('Failed to fetch patients');
        return response.json();
    },

    /**
     * Get patient timeline
     */
    async getPatientTimeline(patientId: string): Promise<PatientTimeline> {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/timeline`);
        if (!response.ok) throw new Error(`Patient ${patientId} not found`);
        return response.json();
    },

    /**
     * Get patient trend features
     */
    async getPatientTrends(patientId: string): Promise<{ patient_id: string; trends: TrendFeatures; computed_at: string }> {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/trends`);
        if (!response.ok) throw new Error(`Failed to get trends for ${patientId}`);
        return response.json();
    },

    /**
     * Get patient risk score with explanation
     */
    async getPatientRisk(patientId: string): Promise<RiskResult> {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/risk`);
        if (!response.ok) throw new Error(`Failed to get risk for ${patientId}`);
        return response.json();
    },

    /**
     * Get all active alerts
     */
    async getAlerts(): Promise<{ alerts: ApiAlert[]; total: number }> {
        const response = await fetch(`${API_BASE_URL}/alerts`);
        if (!response.ok) throw new Error('Failed to fetch alerts');
        return response.json();
    },

    /**
     * Score risk from raw features
     */
    async scoreFeatures(features: TrendFeatures): Promise<{ risk_score: number; risk_level: string; confidence: number; explanation: string[] }> {
        const response = await fetch(`${API_BASE_URL}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(features),
        });
        if (!response.ok) throw new Error('Failed to score features');
        return response.json();
    },
};

export default api;
