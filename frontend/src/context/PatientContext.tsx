import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { api, Patient as ApiPatient, Vital as ApiVital } from '@/services/api';

// Re-export types for compatibility
export interface Patient {
    id: string;
    name: string;
    age: number;
    sex: string;
    location: string;
    mrn?: string;
    currentRiskScore: number;
    currentRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    previousRiskScore?: number;
    previousRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
    admissionDate?: string;
}

export interface VitalReading {
    id: string;
    patientId: string;
    type: string;
    value: number;
    value2?: number;
    unit: string;
    timestamp: string;
}

interface PatientContextType {
    patients: Patient[];
    vitals: VitalReading[];
    isLoading: boolean;
    error: string | null;
    refreshPatients: () => Promise<void>;
    addPatient: (data: { name: string; age?: number; sex?: string; location?: string }) => Promise<Patient>;
    getPatientById: (id: string) => Patient | undefined;
    addVitalReading: (vital: Omit<VitalReading, 'id'>) => Promise<void>;
    getVitalsByPatientId: (patientId: string) => Promise<VitalReading[]>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

// Convert API patient to internal format
const mapApiPatient = (p: ApiPatient): Patient => ({
    id: p.id,
    name: p.name,
    age: p.age || 0,
    sex: p.sex || 'Unknown',
    location: p.location || 'Unknown',
    currentRiskScore: Math.round(p.current_risk_score * 100),
    currentRiskLevel: p.current_risk_level as 'low' | 'medium' | 'high' | 'critical',
});

// Convert API vital to internal format
const mapApiVital = (v: ApiVital): VitalReading => ({
    id: v.id,
    patientId: v.patient_id,
    type: v.vital_type,
    value: v.value,
    value2: v.value2 || undefined,
    unit: v.unit || '',
    timestamp: v.recorded_at,
});

export function PatientProvider({ children }: { children: ReactNode }) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [vitals, setVitals] = useState<VitalReading[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch patients from database on mount
    const refreshPatients = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getPatients();
            setPatients(data.map(mapApiPatient));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load patients');
            console.error('Failed to load patients:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load patients on mount
    useEffect(() => {
        refreshPatients();
    }, [refreshPatients]);

    const addPatient = useCallback(async (data: { name: string; age?: number; sex?: string; location?: string }): Promise<Patient> => {
        const created = await api.createPatient(data);
        const patient = mapApiPatient(created);
        setPatients((prev) => [...prev, patient]);
        return patient;
    }, []);

    const getPatientById = useCallback(
        (id: string) => patients.find((p) => p.id === id),
        [patients]
    );

    const addVitalReading = useCallback(async (vitalData: Omit<VitalReading, 'id'>) => {
        const created = await api.createVital({
            patient_id: vitalData.patientId,
            vital_type: vitalData.type,
            value: vitalData.value,
            value2: vitalData.value2,
            unit: vitalData.unit,
        });
        setVitals((prev) => [...prev, mapApiVital(created)]);
    }, []);

    const getVitalsByPatientId = useCallback(async (patientId: string): Promise<VitalReading[]> => {
        const data = await api.getPatientVitals(patientId);
        return data.map(mapApiVital);
    }, []);

    return (
        <PatientContext.Provider
            value={{
                patients,
                vitals,
                isLoading,
                error,
                refreshPatients,
                addPatient,
                getPatientById,
                addVitalReading,
                getVitalsByPatientId,
            }}
        >
            {children}
        </PatientContext.Provider>
    );
}

export function usePatients() {
    const context = useContext(PatientContext);
    if (context === undefined) {
        throw new Error('usePatients must be used within a PatientProvider');
    }
    return context;
}
