/**
 * API Service for Clinical Intelligence Platform
 * Connects frontend to FastAPI backend with database
 */

const API_BASE_URL = 'http://localhost:8000';

// =============================================================================
// TASK-6.4: Token Management
// =============================================================================

/**
 * Get the stored auth token from sessionStorage (matches AuthContext)
 */
function getToken(): string | null {
    return sessionStorage.getItem('authToken');
}

/**
 * Store the auth token in sessionStorage (matches AuthContext)
 */
export function setToken(token: string): void {
    sessionStorage.setItem('authToken', token);
}

/**
 * Clear the auth token from sessionStorage (matches AuthContext)
 */
export function clearToken(): void {
    sessionStorage.removeItem('authToken');
}

/**
 * Get headers with Authorization if token exists
 */
function getAuthHeaders(): Record<string, string> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// Types
export interface Patient {
    id: string;
    name: string;
    age: number | null;
    sex: string | null;
    location: string | null;
    current_risk_score: number;
    current_risk_level: string;
    created_at: string;
}

export interface Vital {
    id: string;
    patient_id: string;
    vital_type: string;
    value: number;
    value2: number | null;
    unit: string | null;
    recorded_at: string;
}

export interface Alert {
    id: string;
    patient_id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    explanation: string | null;
    status: 'active' | 'acknowledged' | 'dismissed';
    created_at: string;
    auto_generated?: boolean;
    updated_at?: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

export interface LoginResponse {
    token: string;
    user: User;
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
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
    confidence: number;
    model_used?: string;
    routing_reason?: string;
    explanation?: {
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
    trends?: TrendFeatures;
    computed_at?: string;
}

// API Functions
export const api = {
    // =========================================================================
    // HEALTH
    // =========================================================================

    async health(): Promise<{ name: string; version: string; status: string }> {
        const response = await fetch(`${API_BASE_URL}/`);
        if (!response.ok) throw new Error('API not available');
        return response.json();
    },

    // =========================================================================
    // AUTH (Database)
    // =========================================================================

    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        return response.json();
    },

    // =========================================================================
    // PATIENTS (Database)
    // =========================================================================

    async getPatients(): Promise<Patient[]> {
        const response = await fetch(`${API_BASE_URL}/db/patients`);
        if (!response.ok) throw new Error('Failed to fetch patients');
        return response.json();
    },

    async getPatient(patientId: string): Promise<Patient> {
        const response = await fetch(`${API_BASE_URL}/db/patients/${patientId}`);
        if (!response.ok) throw new Error(`Patient ${patientId} not found`);
        return response.json();
    },

    async createPatient(data: { name: string; age?: number; sex?: string; location?: string }): Promise<Patient> {
        const response = await fetch(`${API_BASE_URL}/db/patients`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create patient');
        return response.json();
    },

    async deletePatient(patientId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/db/patients/${patientId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete patient');
    },

    // =========================================================================
    // VITALS (Database)
    // =========================================================================

    async getPatientVitals(patientId: string): Promise<Vital[]> {
        const response = await fetch(`${API_BASE_URL}/db/patients/${patientId}/vitals`);
        if (!response.ok) throw new Error('Failed to fetch vitals');
        return response.json();
    },

    async createVital(data: {
        patient_id: string;
        vital_type: string;
        value: number;
        value2?: number;
        unit?: string;
    }): Promise<Vital> {
        const response = await fetch(`${API_BASE_URL}/db/vitals`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to record vital');
        return response.json();
    },

    // =========================================================================
    // ALERTS (Database)
    // =========================================================================

    async getAlerts(status?: string): Promise<Alert[]> {
        const url = status
            ? `${API_BASE_URL}/db/alerts?status_filter=${status}`
            : `${API_BASE_URL}/db/alerts`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch alerts');
        return response.json();
    },

    async getPatientAlerts(patientId: string): Promise<Alert[]> {
        const response = await fetch(`${API_BASE_URL}/db/patients/${patientId}/alerts`);
        if (!response.ok) throw new Error('Failed to fetch patient alerts');
        return response.json();
    },

    async acknowledgeAlert(alertId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/db/alerts/${alertId}/acknowledge`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to acknowledge alert');
    },

    async dismissAlert(alertId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/db/alerts/${alertId}/dismiss`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to dismiss alert');
    },

    // =========================================================================
    // RISK SCORING (ML Models)
    // =========================================================================

    async getPatientRisk(patientId: string): Promise<RiskResult> {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/risk`);
        if (!response.ok) throw new Error(`Failed to get risk for ${patientId}`);
        return response.json();
    },

    async scoreFeatures(features: TrendFeatures): Promise<RiskResult> {
        const response = await fetch(`${API_BASE_URL}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(features),
        });
        if (!response.ok) throw new Error('Failed to score features');
        return response.json();
    },

    // =========================================================================
    // RISK HISTORY (Database)
    // =========================================================================

    async getRiskHistory(patientId: string): Promise<Array<{
        id: string;
        risk_score: number;
        risk_level: string;
        model_used: string;
        computed_at: string;
    }>> {
        const response = await fetch(`${API_BASE_URL}/db/patients/${patientId}/risk-history`);
        if (!response.ok) throw new Error('Failed to fetch risk history');
        return response.json();
    },

    // =========================================================================
    // LABS (Database)
    // =========================================================================

    async getPatientLabs(patientId: string): Promise<Array<{
        id: string;
        patient_id: string;
        lab_type: string;
        value: number;
        unit: string | null;
        recorded_at: string;
    }>> {
        const response = await fetch(`${API_BASE_URL}/db/patients/${patientId}/labs`);
        if (!response.ok) throw new Error('Failed to fetch labs');
        return response.json();
    },

    async createLab(data: {
        patient_id: string;
        lab_type: string;
        value: number;
        unit?: string;
    }): Promise<{ id: string }> {
        const response = await fetch(`${API_BASE_URL}/db/labs`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to record lab');
        return response.json();
    },

    // =========================================================================
    // CLINICAL NOTES (Database)
    // =========================================================================

    async getPatientNotes(patientId: string): Promise<Array<{
        id: string;
        patient_id: string;
        note_type: string;
        content: string;
        created_at: string;
    }>> {
        const response = await fetch(`${API_BASE_URL}/db/patients/${patientId}/notes`);
        if (!response.ok) throw new Error('Failed to fetch notes');
        return response.json();
    },

    async createNote(data: {
        patient_id: string;
        note_type?: string;
        content: string;
    }): Promise<{ id: string }> {
        const response = await fetch(`${API_BASE_URL}/db/notes`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create note');
        return response.json();
    },

    // =========================================================================
    // ML RISK SCORING (Database)
    // =========================================================================

    async computeRisk(patientId: string): Promise<{
        patient_id: string;
        risk_score: number;
        risk_level: string;
        confidence: number;
        model_used?: string;
        computed_at: string;
        explanation?: {
            summary: string[];
            contributing_factors: Array<{
                feature: string;
                display_name: string;
                value: number;
                explanation: string;
            }>;
        };
        alert_created?: boolean;
        velocity?: 'stable' | 'slowly_worsening' | 'rapid_deterioration' | 'improving' | 'unknown';
        velocity_daily_change?: number;
    }> {
        const response = await fetch(`${API_BASE_URL}/db/patients/${patientId}/compute-risk`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to compute risk');
        return response.json();
    },
};

export default api;

