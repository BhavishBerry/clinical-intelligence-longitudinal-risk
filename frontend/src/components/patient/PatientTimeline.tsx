import { useState, useEffect } from 'react';
import { usePatients, useAlerts } from '@/context';
import { Card, CardContent, Badge } from '@/components/ui';
import {
    Activity, FileText, Pill, Calendar, AlertTriangle,
    Stethoscope, TestTube, ClipboardList
} from 'lucide-react';
// Type imports for documentation - all used in type definitions below
import { cn } from '@/utils/cn';
import { api } from '@/services/api';

interface PatientTimelineProps {
    patientId: string;
}

type TimelineEvent = {
    id: string;
    timestamp: string;
    type: 'vital' | 'lab' | 'event' | 'alert' | 'note';
    title: string;
    description: string;
    icon: React.ReactNode;
    isAbnormal?: boolean;
};

export function PatientTimeline({ patientId }: PatientTimelineProps) {
    const { getVitalsByPatientId } = usePatients();
    const { getAlertsByPatient } = useAlerts();
    const [vitals, setVitals] = useState<any[]>([]);
    const [labs, setLabs] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch all data asynchronously
    useEffect(() => {
        setLoading(true);
        Promise.all([
            getVitalsByPatientId(patientId),
            api.getPatientLabs(patientId),
            api.getPatientNotes(patientId),
        ])
            .then(([vitalsData, labsData, notesData]) => {
                setVitals(vitalsData);
                setLabs(labsData);
                setNotes(notesData);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [patientId, getVitalsByPatientId]);

    const alerts = getAlertsByPatient(patientId);

    // Convert all data to timeline events
    const timelineEvents: TimelineEvent[] = [
        ...vitals.map((v): TimelineEvent => ({
            id: v.id || Math.random().toString(),
            timestamp: v.timestamp || v.recorded_at || new Date().toISOString(),
            type: 'vital',
            title: formatVitalType(v.type || v.vital_type),
            description: `${v.value}${v.value2 ? `/${v.value2}` : ''} ${v.unit || ''}`,
            icon: <Activity className="w-4 h-4" />,
            isAbnormal: v.normalRange ? (v.value < v.normalRange.min || v.value > v.normalRange.max) : false,
        })),
        ...labs.map((l): TimelineEvent => ({
            id: l.id,
            timestamp: l.recorded_at,
            type: 'lab',
            title: formatLabType(l.lab_type),
            description: `${l.value} ${l.unit || ''}`,
            icon: <TestTube className="w-4 h-4" />,
            isAbnormal: false,
        })),
        ...notes.map((n): TimelineEvent => ({
            id: n.id,
            timestamp: n.created_at,
            type: 'note',
            title: formatNoteType(n.note_type),
            description: n.content.slice(0, 100) + (n.content.length > 100 ? '...' : ''),
            icon: <FileText className="w-4 h-4" />,
            isAbnormal: false,
        })),
        ...alerts.map((a): TimelineEvent => ({
            id: a.id,
            timestamp: a.time,
            type: 'alert',
            title: a.title,
            description: a.explanation ? (a.explanation.slice(0, 100) + '...') : '',
            icon: <AlertTriangle className="w-4 h-4" />,
            isAbnormal: true,
        })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Group events by date
    const groupedEvents = timelineEvents.reduce((acc, event) => {
        const date = new Date(event.timestamp).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(event);
        return acc;
    }, {} as Record<string, TimelineEvent[]>);

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-[hsl(var(--muted-foreground))]">Loading timeline...</p>
                </CardContent>
            </Card>
        );
    }

    if (timelineEvents.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <ClipboardList className="w-12 h-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
                    <p className="text-[hsl(var(--muted-foreground))]">
                        No events recorded yet. Start by adding vitals or lab results.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {Object.entries(groupedEvents).map(([date, events]) => (
                <div key={date}>
                    <h3 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {date}
                    </h3>
                    <div className="relative pl-6 border-l-2 border-[hsl(var(--border))] space-y-3">
                        {events.map((event) => (
                            <div key={event.id} className="relative">
                                {/* Timeline dot */}
                                <div className={cn(
                                    'absolute -left-[25px] w-4 h-4 rounded-full flex items-center justify-center',
                                    event.isAbnormal
                                        ? 'bg-[hsl(var(--risk-high))]'
                                        : event.type === 'alert'
                                            ? 'bg-[hsl(var(--risk-medium))]'
                                            : 'bg-[hsl(var(--primary))]'
                                )}>
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                </div>

                                <Card className={cn(
                                    event.isAbnormal && 'border-[hsl(var(--risk-high))]'
                                )}>
                                    <CardContent className="p-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    event.isAbnormal
                                                        ? 'text-[hsl(var(--risk-high))]'
                                                        : 'text-[hsl(var(--primary))]'
                                                )}>
                                                    {event.icon}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-sm">{event.title}</p>
                                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                                        {event.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {event.isAbnormal && (
                                                    <Badge variant="high" className="text-xs">Abnormal</Badge>
                                                )}
                                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                                    {new Date(event.timestamp).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function formatVitalType(type: string): string {
    const map: Record<string, string> = {
        heartRate: 'Heart Rate',
        heart_rate: 'Heart Rate',
        bloodPressure: 'Blood Pressure',
        blood_pressure: 'Blood Pressure',
        oxygenSat: 'Oxygen Saturation',
        oxygen_sat: 'Oxygen Saturation',
        respiratoryRate: 'Respiratory Rate',
        respiratory_rate: 'Respiratory Rate',
        temperature: 'Temperature',
        map: 'Mean Arterial Pressure',
        glucose: 'Blood Glucose',
        blood_sugar: 'Blood Glucose',
    };
    return map[type] || type;
}

function formatLabType(type: string): string {
    const map: Record<string, string> = {
        glucose: 'Blood Glucose',
        lactate: 'Lactate',
        creatinine: 'Creatinine',
        cholesterolTotal: 'Total Cholesterol',
        cholesterolLDL: 'LDL Cholesterol',
        cholesterolHDL: 'HDL Cholesterol',
        urineOutput: 'Urine Output',
    };
    return map[type] || type;
}

function formatNoteType(type: string): string {
    const map: Record<string, string> = {
        observation: 'Observation',
        consultation: 'Consultation',
        procedure: 'Procedure Note',
        medication: 'Medication Note',
        progress: 'Progress Note',
    };
    return map[type] || type;
}

function formatEventType(type: string): string {
    const map: Record<string, string> = {
        admission: 'Admission',
        discharge: 'Discharge',
        procedure: 'Procedure',
        medication: 'Medication',
        labTest: 'Lab Test',
        consultation: 'Clinical Note',
    };
    return map[type] || type;
}

function getEventIcon(type: string): React.ReactNode {
    const icons: Record<string, React.ReactNode> = {
        admission: <Calendar className="w-4 h-4" />,
        discharge: <Calendar className="w-4 h-4" />,
        procedure: <Stethoscope className="w-4 h-4" />,
        medication: <Pill className="w-4 h-4" />,
        labTest: <TestTube className="w-4 h-4" />,
        consultation: <FileText className="w-4 h-4" />,
    };
    return icons[type] || <FileText className="w-4 h-4" />;
}
