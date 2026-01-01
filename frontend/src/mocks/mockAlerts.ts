import { Alert, AlertDriver } from '@/types';

// Explanations derived from PRD examples
const explanationTemplates = {
    metabolicRisk: "Blood glucose increased 29% over 18 months. Blood pressure rose steadily across four visits. No medication intervention during this period.",
    respiratoryRisk: "Respiratory rate ↑ 15% over 6h, MAP ↓ 12%. Risk of respiratory failure elevated.",
    renalRisk: "Slow but consistent renal function decline over 12 months. Creatinine: 0.9 → 1.1 → 1.3 mg/dL.",
    sepsis: "Lactate ↑ from 1.2 to 2.8 mmol/L in 6h and MAP ↓ from 80 to 65 mmHg. Early sepsis pattern detected.",
    cardiac: "Heart rate variability decreased by 23% over 48h. Combined with rising troponin levels.",
};

export const mockAlerts: Alert[] = [
    {
        id: 'alert-1',
        patientId: 'patient-1',
        patientName: 'Raj Kumar',
        time: '2024-12-31T14:30:00Z',
        severity: 'high',
        title: 'Elevated Metabolic Risk',
        explanation: explanationTemplates.metabolicRisk,
        drivers: [
            { factor: 'Sustained glucose increase', detail: '↑ 29% over 18 months' },
            { factor: 'Rising BP trend', detail: 'Systolic: 130 → 150 mmHg' },
            { factor: 'Delayed intervention', detail: 'No medication started' },
        ],
        status: 'active',
        feedback: null,
    },
    {
        id: 'alert-2',
        patientId: 'patient-3',
        patientName: 'James Wilson',
        time: '2024-12-31T18:45:00Z',
        severity: 'critical',
        title: 'Sepsis Risk - Immediate Attention',
        explanation: explanationTemplates.sepsis,
        drivers: [
            { factor: 'Lactate spike', detail: '↑ 133% in 6h' },
            { factor: 'MAP decline', detail: '↓ 19% from baseline' },
            { factor: 'Temperature elevation', detail: '38.9°C sustained' },
        ],
        status: 'active',
        feedback: null,
    },
    {
        id: 'alert-3',
        patientId: 'patient-2',
        patientName: 'Anita Sharma',
        time: '2024-12-30T09:15:00Z',
        severity: 'medium',
        title: 'Renal Function Decline',
        explanation: explanationTemplates.renalRisk,
        drivers: [
            { factor: 'Creatinine trend', detail: '↑ 44% over 12 months' },
            { factor: 'Urine output', detail: '↓ 15% from baseline' },
        ],
        status: 'active',
        feedback: null,
    },
    {
        id: 'alert-4',
        patientId: 'patient-5',
        patientName: 'David Chen',
        time: '2024-12-29T16:00:00Z',
        severity: 'medium',
        title: 'Respiratory Pattern Change',
        explanation: explanationTemplates.respiratoryRisk,
        drivers: [
            { factor: 'Respiratory rate increase', detail: '↑ 15% over 6h' },
            { factor: 'MAP decline', detail: '↓ 12% from baseline' },
        ],
        status: 'acknowledged',
        feedback: 'useful',
        acknowledgedBy: 'user-1',
        acknowledgedAt: '2024-12-29T17:30:00Z',
    },
    {
        id: 'alert-5',
        patientId: 'patient-3',
        patientName: 'James Wilson',
        time: '2024-12-28T11:20:00Z',
        severity: 'high',
        title: 'Cardiac Risk Indicator',
        explanation: explanationTemplates.cardiac,
        drivers: [
            { factor: 'HRV decrease', detail: '↓ 23% over 48h' },
            { factor: 'Troponin elevation', detail: 'Rising trend detected' },
        ],
        status: 'dismissed',
        feedback: 'not_useful',
        acknowledgedBy: 'user-2',
        acknowledgedAt: '2024-12-28T14:00:00Z',
    },
];

export const getAlertsByPatientId = (patientId: string): Alert[] => {
    return mockAlerts.filter((a) => a.patientId === patientId);
};

export const getActiveAlerts = (): Alert[] => {
    return mockAlerts.filter((a) => a.status === 'active');
};

export const getAlertById = (id: string): Alert | undefined => {
    return mockAlerts.find((a) => a.id === id);
};

export const getSeverityWeight = (severity: Alert['severity']): number => {
    switch (severity) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
    }
};
