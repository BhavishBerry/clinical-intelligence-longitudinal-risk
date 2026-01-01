import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Patient, VitalReading, LabResult, ClinicalEvent, RiskLevel } from '@/types';
import { mockPatients as initialPatients } from '@/mocks/mockPatients';
import { mockVitals as initialVitals, mockLabs as initialLabs } from '@/mocks/mockVitals';

interface PatientContextType {
    patients: Patient[];
    vitals: VitalReading[];
    labs: LabResult[];
    events: ClinicalEvent[];
    addPatient: (patient: Omit<Patient, 'id' | 'currentRiskScore' | 'currentRiskLevel' | 'previousRiskLevel'>) => Patient;
    updatePatient: (id: string, updates: Partial<Patient>) => void;
    getPatientById: (id: string) => Patient | undefined;
    addVitalReading: (vital: Omit<VitalReading, 'id'>) => void;
    addLabResult: (lab: Omit<LabResult, 'id'>) => void;
    addClinicalEvent: (event: Omit<ClinicalEvent, 'id'>) => void;
    getVitalsByPatientId: (patientId: string) => VitalReading[];
    getLabsByPatientId: (patientId: string) => LabResult[];
    getEventsByPatientId: (patientId: string) => ClinicalEvent[];
    recalculateRisk: (patientId: string) => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

// Simple ID generator
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock risk calculation based on vitals/labs
const calculateRiskScore = (vitals: VitalReading[], labs: LabResult[]): { score: number; level: RiskLevel } => {
    let score = 20; // Base score

    // Check for abnormal vitals
    vitals.forEach((vital) => {
        if (vital.value < vital.normalRange.min || vital.value > vital.normalRange.max) {
            score += 15;
        }
    });

    // Check for abnormal labs
    labs.forEach((lab) => {
        if (lab.value < lab.normalRange.min || lab.value > lab.normalRange.max) {
            score += 20;
        }
    });

    // Cap at 100
    score = Math.min(100, score);

    // Determine level
    let level: RiskLevel = 'low';
    if (score >= 80) level = 'critical';
    else if (score >= 60) level = 'high';
    else if (score >= 40) level = 'medium';

    return { score, level };
};

export function PatientProvider({ children }: { children: ReactNode }) {
    const [patients, setPatients] = useState<Patient[]>(initialPatients);
    const [vitals, setVitals] = useState<VitalReading[]>(initialVitals);
    const [labs, setLabs] = useState<LabResult[]>(initialLabs);
    const [events, setEvents] = useState<ClinicalEvent[]>([]);

    const addPatient = useCallback((patientData: Omit<Patient, 'id' | 'currentRiskScore' | 'currentRiskLevel' | 'previousRiskLevel'>): Patient => {
        const newPatient: Patient = {
            ...patientData,
            id: generateId('patient'),
            currentRiskScore: 20,
            currentRiskLevel: 'low',
            previousRiskLevel: 'low',
        };
        setPatients((prev) => [...prev, newPatient]);
        return newPatient;
    }, []);

    const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
        setPatients((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
        );
    }, []);

    const getPatientById = useCallback(
        (id: string) => patients.find((p) => p.id === id),
        [patients]
    );

    const addVitalReading = useCallback((vitalData: Omit<VitalReading, 'id'>) => {
        const newVital: VitalReading = {
            ...vitalData,
            id: generateId('vital'),
        };
        setVitals((prev) => [...prev, newVital]);

        // Add event for timeline
        setEvents((prev) => [...prev, {
            id: generateId('event'),
            patientId: vitalData.patientId,
            type: 'labTest' as const,
            description: `Recorded ${vitalData.type}: ${vitalData.value} ${vitalData.unit}`,
            timestamp: vitalData.timestamp,
        }]);
    }, []);

    const addLabResult = useCallback((labData: Omit<LabResult, 'id'>) => {
        const newLab: LabResult = {
            ...labData,
            id: generateId('lab'),
        };
        setLabs((prev) => [...prev, newLab]);

        // Add event for timeline
        setEvents((prev) => [...prev, {
            id: generateId('event'),
            patientId: labData.patientId,
            type: 'labTest' as const,
            description: `Lab result ${labData.type}: ${labData.value} ${labData.unit}`,
            timestamp: labData.timestamp,
        }]);
    }, []);

    const addClinicalEvent = useCallback((eventData: Omit<ClinicalEvent, 'id'>) => {
        const newEvent: ClinicalEvent = {
            ...eventData,
            id: generateId('event'),
        };
        setEvents((prev) => [...prev, newEvent]);
    }, []);

    const getVitalsByPatientId = useCallback(
        (patientId: string) => vitals.filter((v) => v.patientId === patientId),
        [vitals]
    );

    const getLabsByPatientId = useCallback(
        (patientId: string) => labs.filter((l) => l.patientId === patientId),
        [labs]
    );

    const getEventsByPatientId = useCallback(
        (patientId: string) => events.filter((e) => e.patientId === patientId).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        [events]
    );

    const recalculateRisk = useCallback((patientId: string) => {
        const patientVitals = vitals.filter((v) => v.patientId === patientId);
        const patientLabs = labs.filter((l) => l.patientId === patientId);

        const { score, level } = calculateRiskScore(patientVitals, patientLabs);

        setPatients((prev) =>
            prev.map((p) =>
                p.id === patientId
                    ? {
                        ...p,
                        previousRiskLevel: p.currentRiskLevel,
                        currentRiskScore: score,
                        currentRiskLevel: level,
                    }
                    : p
            )
        );
    }, [vitals, labs]);

    return (
        <PatientContext.Provider
            value={{
                patients,
                vitals,
                labs,
                events,
                addPatient,
                updatePatient,
                getPatientById,
                addVitalReading,
                addLabResult,
                addClinicalEvent,
                getVitalsByPatientId,
                getLabsByPatientId,
                getEventsByPatientId,
                recalculateRisk,
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
