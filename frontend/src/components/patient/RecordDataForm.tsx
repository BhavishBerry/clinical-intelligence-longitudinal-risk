import { useState, FormEvent } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { usePatients, useAlerts } from '@/context';
import { Activity, Droplets, Heart, Wind, Thermometer, FileText, Plus } from 'lucide-react';
import { VitalType, LabType } from '@/types';

interface RecordDataFormProps {
    patientId: string;
    onDataAdded?: () => void;
}

type TabType = 'vitals' | 'labs' | 'notes';

const vitalFields: { type: VitalType; label: string; unit: string; icon: React.ReactNode; min: number; max: number }[] = [
    { type: 'heartRate', label: 'Heart Rate', unit: 'bpm', icon: <Heart className="w-4 h-4" />, min: 60, max: 100 },
    { type: 'bloodPressure', label: 'Blood Pressure', unit: 'mmHg', icon: <Activity className="w-4 h-4" />, min: 90, max: 140 },
    { type: 'oxygenSat', label: 'Oxygen Saturation', unit: '%', icon: <Wind className="w-4 h-4" />, min: 95, max: 100 },
    { type: 'respiratoryRate', label: 'Respiratory Rate', unit: 'breaths/min', icon: <Wind className="w-4 h-4" />, min: 12, max: 20 },
    { type: 'temperature', label: 'Temperature', unit: '°C', icon: <Thermometer className="w-4 h-4" />, min: 36.1, max: 37.2 },
    { type: 'map', label: 'Mean Arterial Pressure', unit: 'mmHg', icon: <Activity className="w-4 h-4" />, min: 70, max: 105 },
];

const labFields: { type: LabType; label: string; unit: string; min: number; max: number }[] = [
    { type: 'glucose', label: 'Blood Glucose', unit: 'mg/dL', min: 70, max: 100 },
    { type: 'lactate', label: 'Lactate', unit: 'mmol/L', min: 0.5, max: 2.0 },
    { type: 'creatinine', label: 'Creatinine', unit: 'mg/dL', min: 0.6, max: 1.2 },
    { type: 'cholesterolTotal', label: 'Total Cholesterol', unit: 'mg/dL', min: 0, max: 200 },
];

export function RecordDataForm({ patientId, onDataAdded }: RecordDataFormProps) {
    const { addVitalReading, addLabResult, addClinicalEvent, recalculateRisk } = usePatients();
    const [activeTab, setActiveTab] = useState<TabType>('vitals');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Vitals form state
    const [vitalType, setVitalType] = useState<VitalType>('heartRate');
    const [vitalValue, setVitalValue] = useState('');
    const [vitalValue2, setVitalValue2] = useState(''); // For BP diastolic

    // Labs form state
    const [labType, setLabType] = useState<LabType>('glucose');
    const [labValue, setLabValue] = useState('');

    // Notes form state
    const [noteText, setNoteText] = useState('');

    const handleVitalSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const field = vitalFields.find(f => f.type === vitalType)!;

        addVitalReading({
            patientId,
            type: vitalType,
            value: parseFloat(vitalValue),
            value2: vitalType === 'bloodPressure' ? parseFloat(vitalValue2) : undefined,
            unit: field.unit,
            timestamp: new Date().toISOString(),
            normalRange: { min: field.min, max: field.max },
        });

        recalculateRisk(patientId);

        await new Promise(r => setTimeout(r, 300));
        setIsSubmitting(false);
        setSuccess(true);
        setVitalValue('');
        setVitalValue2('');
        setTimeout(() => setSuccess(false), 2000);
        onDataAdded?.();
    };

    const handleLabSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const field = labFields.find(f => f.type === labType)!;

        addLabResult({
            patientId,
            type: labType,
            value: parseFloat(labValue),
            unit: field.unit,
            timestamp: new Date().toISOString(),
            normalRange: { min: field.min, max: field.max },
        });

        recalculateRisk(patientId);

        await new Promise(r => setTimeout(r, 300));
        setIsSubmitting(false);
        setSuccess(true);
        setLabValue('');
        setTimeout(() => setSuccess(false), 2000);
        onDataAdded?.();
    };

    const handleNoteSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        addClinicalEvent({
            patientId,
            type: 'consultation',
            description: noteText,
            timestamp: new Date().toISOString(),
        });

        await new Promise(r => setTimeout(r, 300));
        setIsSubmitting(false);
        setSuccess(true);
        setNoteText('');
        setTimeout(() => setSuccess(false), 2000);
        onDataAdded?.();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Record Patient Data
                    </CardTitle>
                    {success && <Badge variant="low">✓ Saved</Badge>}
                </div>
            </CardHeader>
            <CardContent>
                {/* Tab Navigation */}
                <div className="flex gap-2 mb-4">
                    {(['vitals', 'labs', 'notes'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === tab
                                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                                    : 'bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))]'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Vitals Form */}
                {activeTab === 'vitals' && (
                    <form onSubmit={handleVitalSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Vital Type</label>
                            <select
                                value={vitalType}
                                onChange={(e) => setVitalType(e.target.value as VitalType)}
                                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))]"
                            >
                                {vitalFields.map((field) => (
                                    <option key={field.type} value={field.type}>
                                        {field.label} ({field.unit})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Value {vitalType === 'bloodPressure' && '(Systolic)'}
                                </label>
                                <Input
                                    type="number"
                                    value={vitalValue}
                                    onChange={(e) => setVitalValue(e.target.value)}
                                    placeholder="Enter value"
                                    step="0.1"
                                    required
                                />
                            </div>

                            {vitalType === 'bloodPressure' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Diastolic</label>
                                    <Input
                                        type="number"
                                        value={vitalValue2}
                                        onChange={(e) => setVitalValue2(e.target.value)}
                                        placeholder="e.g., 80"
                                        required
                                    />
                                </div>
                            )}
                        </div>

                        <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            Normal range: {vitalFields.find(f => f.type === vitalType)?.min} - {vitalFields.find(f => f.type === vitalType)?.max} {vitalFields.find(f => f.type === vitalType)?.unit}
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? 'Recording...' : 'Record Vital'}
                        </Button>
                    </form>
                )}

                {/* Labs Form */}
                {activeTab === 'labs' && (
                    <form onSubmit={handleLabSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Lab Test</label>
                            <select
                                value={labType}
                                onChange={(e) => setLabType(e.target.value as LabType)}
                                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))]"
                            >
                                {labFields.map((field) => (
                                    <option key={field.type} value={field.type}>
                                        {field.label} ({field.unit})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Result Value</label>
                            <Input
                                type="number"
                                value={labValue}
                                onChange={(e) => setLabValue(e.target.value)}
                                placeholder="Enter result"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            Normal range: {labFields.find(f => f.type === labType)?.min} - {labFields.find(f => f.type === labType)?.max} {labFields.find(f => f.type === labType)?.unit}
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? 'Recording...' : 'Record Lab Result'}
                        </Button>
                    </form>
                )}

                {/* Notes Form */}
                {activeTab === 'notes' && (
                    <form onSubmit={handleNoteSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Clinical Note</label>
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Enter clinical observations, notes, or comments..."
                                className="w-full h-32 px-3 py-2 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] resize-none"
                                required
                            />
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            <FileText className="w-4 h-4 mr-2" />
                            {isSubmitting ? 'Saving...' : 'Save Note'}
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
