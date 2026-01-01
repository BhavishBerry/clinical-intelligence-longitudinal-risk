import { Patient, RiskLevel } from '@/types';

// Generate realistic patients based on PRD examples
export const mockPatients: Patient[] = [
    {
        id: 'patient-1',
        name: 'Raj Kumar',
        age: 52,
        sex: 'male',
        mrn: 'MRN-001234',
        location: 'Ward 3A',
        currentRiskScore: 78,
        currentRiskLevel: 'high',
        previousRiskLevel: 'medium',
        admissionDate: '2024-01-15T08:30:00Z',
    },
    {
        id: 'patient-2',
        name: 'Anita Sharma',
        age: 34,
        sex: 'female',
        mrn: 'MRN-001235',
        location: 'Ward 2B',
        currentRiskScore: 45,
        currentRiskLevel: 'medium',
        previousRiskLevel: 'low',
        admissionDate: '2024-06-20T10:15:00Z',
    },
    {
        id: 'patient-3',
        name: 'James Wilson',
        age: 68,
        sex: 'male',
        mrn: 'MRN-001236',
        location: 'ICU-1',
        currentRiskScore: 92,
        currentRiskLevel: 'critical',
        previousRiskLevel: 'high',
        admissionDate: '2024-12-28T14:45:00Z',
    },
    {
        id: 'patient-4',
        name: 'Maria Garcia',
        age: 45,
        sex: 'female',
        mrn: 'MRN-001237',
        location: 'Ward 1C',
        currentRiskScore: 25,
        currentRiskLevel: 'low',
        previousRiskLevel: 'low',
        admissionDate: '2024-12-30T09:00:00Z',
    },
    {
        id: 'patient-5',
        name: 'David Chen',
        age: 61,
        sex: 'male',
        mrn: 'MRN-001238',
        location: 'Ward 3A',
        currentRiskScore: 58,
        currentRiskLevel: 'medium',
        previousRiskLevel: 'medium',
        admissionDate: '2024-12-25T11:30:00Z',
    },
    {
        id: 'patient-6',
        name: 'Emily Thompson',
        age: 29,
        sex: 'female',
        mrn: 'MRN-001239',
        location: 'Ward 2A',
        currentRiskScore: 15,
        currentRiskLevel: 'low',
        previousRiskLevel: 'low',
        admissionDate: '2024-12-31T16:20:00Z',
    },
];

export const getPatientById = (id: string): Patient | undefined => {
    return mockPatients.find((p) => p.id === id);
};

export const getPatientsByIds = (ids: string[]): Patient[] => {
    if (ids.length === 0) return mockPatients; // Admin sees all
    return mockPatients.filter((p) => ids.includes(p.id));
};

export const getRiskLevelColor = (level: RiskLevel): string => {
    switch (level) {
        case 'low': return 'hsl(var(--risk-low))';
        case 'medium': return 'hsl(var(--risk-medium))';
        case 'high': return 'hsl(var(--risk-high))';
        case 'critical': return 'hsl(var(--risk-critical))';
        default: return 'hsl(var(--muted-foreground))';
    }
};
