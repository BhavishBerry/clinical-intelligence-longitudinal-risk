import { VitalReading, LabResult, ChartDataPoint } from '@/types';

// Generate time series data for the past 18 months (for metabolic tracking)
const generateTimeSeries = (
    patientId: string,
    startValue: number,
    endValue: number,
    months: number,
    variance: number = 5
): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const step = (endValue - startValue) / months;

    for (let i = months; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const baseValue = startValue + step * (months - i);
        const value = baseValue + (Math.random() - 0.5) * variance;

        data.push({
            timestamp: date.toISOString(),
            value: Math.round(value * 10) / 10,
        });
    }

    return data;
};

// Raj Kumar's glucose data (PRD example: 110 → 118 → 126 → 142)
export const rajGlucoseData: ChartDataPoint[] = [
    { timestamp: '2023-01-15T09:00:00Z', value: 110, label: 'Visit 1' },
    { timestamp: '2023-07-15T09:00:00Z', value: 118, label: 'Visit 2' },
    { timestamp: '2024-01-15T09:00:00Z', value: 126, label: 'Visit 3' },
    { timestamp: '2024-07-15T09:00:00Z', value: 142, label: 'Visit 4', isAbnormal: true },
];

// Raj Kumar's blood pressure data (systolic)
export const rajBPData: ChartDataPoint[] = [
    { timestamp: '2023-01-15T09:00:00Z', value: 130, value2: 85 },
    { timestamp: '2023-07-15T09:00:00Z', value: 135, value2: 88 },
    { timestamp: '2024-01-15T09:00:00Z', value: 140, value2: 92 },
    { timestamp: '2024-07-15T09:00:00Z', value: 150, value2: 95, isAbnormal: true },
];

// Anita's creatinine data (PRD example: 0.9 → 1.1 → 1.3)
export const anitaCreatinineData: ChartDataPoint[] = [
    { timestamp: '2024-01-01T09:00:00Z', value: 0.9 },
    { timestamp: '2024-06-01T09:00:00Z', value: 1.1 },
    { timestamp: '2024-12-01T09:00:00Z', value: 1.3, isAbnormal: true },
];

// Mock vital readings
export const mockVitals: VitalReading[] = [
    // Patient 1 - Raj Kumar
    {
        id: 'vital-1',
        patientId: 'patient-1',
        type: 'heartRate',
        value: 82,
        unit: 'bpm',
        timestamp: '2024-12-31T18:00:00Z',
        normalRange: { min: 60, max: 100 },
    },
    {
        id: 'vital-2',
        patientId: 'patient-1',
        type: 'bloodPressure',
        value: 150,
        value2: 95,
        unit: 'mmHg',
        timestamp: '2024-12-31T18:00:00Z',
        normalRange: { min: 90, max: 140 },
    },
    {
        id: 'vital-3',
        patientId: 'patient-1',
        type: 'oxygenSat',
        value: 96,
        unit: '%',
        timestamp: '2024-12-31T18:00:00Z',
        normalRange: { min: 95, max: 100 },
    },
    // Patient 3 - James Wilson (critical)
    {
        id: 'vital-4',
        patientId: 'patient-3',
        type: 'heartRate',
        value: 112,
        unit: 'bpm',
        timestamp: '2024-12-31T18:00:00Z',
        normalRange: { min: 60, max: 100 },
    },
    {
        id: 'vital-5',
        patientId: 'patient-3',
        type: 'map',
        value: 65,
        unit: 'mmHg',
        timestamp: '2024-12-31T18:00:00Z',
        normalRange: { min: 70, max: 105 },
    },
    {
        id: 'vital-6',
        patientId: 'patient-3',
        type: 'temperature',
        value: 38.9,
        unit: '°C',
        timestamp: '2024-12-31T18:00:00Z',
        normalRange: { min: 36.1, max: 37.2 },
    },
];

// Mock lab results
export const mockLabs: LabResult[] = [
    // Patient 1 - Raj Kumar
    {
        id: 'lab-1',
        patientId: 'patient-1',
        type: 'glucose',
        value: 142,
        unit: 'mg/dL',
        timestamp: '2024-12-31T08:00:00Z',
        normalRange: { min: 70, max: 100 },
    },
    {
        id: 'lab-2',
        patientId: 'patient-1',
        type: 'cholesterolTotal',
        value: 245,
        unit: 'mg/dL',
        timestamp: '2024-12-31T08:00:00Z',
        normalRange: { min: 0, max: 200 },
    },
    // Patient 2 - Anita
    {
        id: 'lab-3',
        patientId: 'patient-2',
        type: 'creatinine',
        value: 1.3,
        unit: 'mg/dL',
        timestamp: '2024-12-31T08:00:00Z',
        normalRange: { min: 0.6, max: 1.2 },
    },
    // Patient 3 - James Wilson
    {
        id: 'lab-4',
        patientId: 'patient-3',
        type: 'lactate',
        value: 2.8,
        unit: 'mmol/L',
        timestamp: '2024-12-31T18:00:00Z',
        normalRange: { min: 0.5, max: 2.0 },
    },
];

export const getVitalsByPatientId = (patientId: string): VitalReading[] => {
    return mockVitals.filter((v) => v.patientId === patientId);
};

export const getLabsByPatientId = (patientId: string): LabResult[] => {
    return mockLabs.filter((l) => l.patientId === patientId);
};

// Generate risk score history for sparklines
export const getRiskScoreHistory = (patientId: string): ChartDataPoint[] => {
    const patient = patientId;

    // Different patterns for different patients
    switch (patient) {
        case 'patient-1': // Raj - steadily increasing
            return generateTimeSeries(patientId, 45, 78, 6, 3);
        case 'patient-2': // Anita - moderate increase
            return generateTimeSeries(patientId, 30, 45, 6, 5);
        case 'patient-3': // James - sharp increase
            return generateTimeSeries(patientId, 60, 92, 3, 4);
        case 'patient-4': // Maria - stable low
            return generateTimeSeries(patientId, 20, 25, 6, 3);
        case 'patient-5': // David - fluctuating
            return generateTimeSeries(patientId, 50, 58, 6, 8);
        case 'patient-6': // Emily - stable low
            return generateTimeSeries(patientId, 12, 15, 3, 2);
        default:
            return generateTimeSeries(patientId, 30, 50, 6, 5);
    }
};
