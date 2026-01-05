import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { RiskBadge, RiskScoreGauge, RecordDataForm, PatientTimeline, RiskVelocityIndicator } from '@/components/patient';
import type { VelocityCategory } from '@/components/patient';
import { RiskDriversPanel } from '@/components/patient/RiskDriversPanel';
import { TimelineChart } from '@/components/charts';
import { useAlerts, usePatients } from '@/context';
import { ArrowLeft, AlertTriangle, Check, ThumbsUp, ThumbsDown, Activity, Heart, Wind } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';

type TabType = 'overview' | 'timeline' | 'record';

// Helper to format reading type names for display
function formatReadingType(type: string | undefined): string {
    if (!type) return 'Reading';
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
        lactate: 'Lactate',
        creatinine: 'Creatinine',
        cholesterolTotal: 'Total Cholesterol',
    };
    return map[type] || type.replace(/([A-Z])/g, ' $1').trim();
}

export function PatientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getAlertsByPatient, acknowledgeAlert } = useAlerts();
    const { getPatientById, getVitalsByPatientId, isLoading: patientsLoading } = usePatients();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [refreshKey, setRefreshKey] = useState(0);
    const [vitals, setVitals] = useState<any[]>([]);
    const [labs, setLabs] = useState<any[]>([]);
    const [riskHistory, setRiskHistory] = useState<{ timestamp: string; value: number }[]>([]);

    const patient = id ? getPatientById(id) : undefined;
    const patientAlerts = id ? getAlertsByPatient(id) : [];
    const activeAlert = patientAlerts.find(a => a.status === 'new' || a.status === 'reviewed');

    // Fetch vitals, labs, and risk history on mount
    useEffect(() => {
        if (id) {
            // Fetch vitals
            getVitalsByPatientId(id)
                .then(setVitals)
                .catch((err) => {
                    console.error('Failed to fetch vitals:', err);
                });
            // Fetch labs
            api.getPatientLabs(id)
                .then(setLabs)
                .catch((err) => {
                    console.error('Failed to fetch labs:', err);
                });
            // Fetch risk history from database
            api.getRiskHistory(id)
                .then((data) => {
                    // Transform backend format to chart format
                    // Backend: { risk_score (0-1), computed_at } -> Chart: { timestamp, value (0-100) }
                    const chartData = data
                        .map((item) => ({
                            timestamp: item.computed_at,
                            value: Math.round(item.risk_score * 100),
                        }))
                        .reverse(); // Oldest first for chart
                    setRiskHistory(chartData);
                })
                .catch((err) => {
                    console.error('Failed to fetch risk history:', err);
                });
        }
    }, [id, getVitalsByPatientId, refreshKey]);

    // Generate chart data from real vitals and labs (TASK-2.4: replaces static mock arrays)
    const glucoseChartData = [
        ...vitals.filter(v => v.vital_type === 'glucose' || v.vital_type === 'blood_sugar').map(v => ({
            timestamp: v.recorded_at,
            value: v.value,
        })),
        ...labs.filter(l => l.lab_type === 'glucose' || l.lab_type === 'blood_sugar').map(l => ({
            timestamp: l.recorded_at,
            value: l.value,
        })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const bpChartData = vitals
        .filter(v => v.vital_type === 'bloodPressure' || v.vital_type === 'blood_pressure')
        .map(v => ({
            timestamp: v.recorded_at,
            value: v.value,
            value2: v.value2,
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const creatinineChartData = labs
        .filter(l => l.lab_type === 'creatinine')
        .map(l => ({
            timestamp: l.recorded_at,
            value: l.value,
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const handleDataAdded = () => {
        // Trigger refresh to get updated data
        setRefreshKey(prev => prev + 1);
    };

    const [isComputingRisk, setIsComputingRisk] = useState(false);
    const [lastRiskResult, setLastRiskResult] = useState<{
        model_used?: string;
        confidence?: number;
        computed_at?: string;
        explanation?: {
            summary: string[];
            contributing_factors: Array<{
                feature: string;
                display_name: string;
                value: number;
                explanation: string;
            }>;
        };
        velocity?: VelocityCategory;
        velocity_daily_change?: number;
    } | null>(null);

    const handleComputeRisk = async () => {
        if (!id) return;
        setIsComputingRisk(true);
        try {
            const result = await api.computeRisk(id);
            console.log('Risk computed:', result);
            setLastRiskResult({
                model_used: result.model_used,
                confidence: result.confidence,
                computed_at: result.computed_at,
                explanation: result.explanation,
                velocity: result.velocity as VelocityCategory,
                velocity_daily_change: result.velocity_daily_change,
            });
            // Refresh patient data to show updated risk score
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            console.error('Failed to compute risk:', err);
        } finally {
            setIsComputingRisk(false);
        }
    };

    // Show loading state while patients are being fetched
    if (patientsLoading) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <p className="text-[hsl(var(--muted-foreground))]">Loading patient data...</p>
                </div>
            </MainLayout>
        );
    }

    if (!patient) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <p className="text-[hsl(var(--muted-foreground))]">Patient not found</p>
                    <Button className="mt-4" onClick={() => navigate('/dashboard')}>
                        Back to Dashboard
                    </Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            {/* Back Button & Header */}
            <div className="mb-6">
                <Button variant="ghost" className="mb-4" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">{patient.name}</h1>
                        <p className="text-[hsl(var(--muted-foreground))]">
                            {patient.mrn && `MRN: ${patient.mrn} • `}{patient.age}y, {patient.sex?.charAt(0).toUpperCase() || 'U'} • {patient.location}
                        </p>
                    </div>
                    <RiskBadge level={patient.currentRiskLevel} showChange previousLevel={patient.previousRiskLevel || patient.currentRiskLevel} />
                </div>
            </div>

            {/* Active Alert Panel */}
            {activeAlert && (
                <Card className="mb-6 border-[hsl(var(--risk-high))] border-2">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-[hsl(var(--risk-high))]" />
                                <CardTitle className="text-lg">{activeAlert.title}</CardTitle>
                                <Badge variant={activeAlert.severity}>{activeAlert.severity}</Badge>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => acknowledgeAlert(activeAlert.id)}
                                >
                                    <Check className="w-4 h-4 mr-1" />
                                    Acknowledge
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[hsl(var(--muted-foreground))] mb-4">{activeAlert.explanation}</p>

                        <div className="space-y-2">
                            <p className="font-medium text-sm">Key Risk Drivers:</p>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                {activeAlert.explanation}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
                {(['overview', 'timeline', 'record'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize',
                            activeTab === tab
                                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                                : 'bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))]'
                        )}
                    >
                        {tab === 'record' ? 'Record Data' : tab}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    {/* Risk Score & Current Vitals/Labs */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                        <div className="flex flex-col gap-2">
                            <RiskScoreGauge score={patient.currentRiskScore} level={patient.currentRiskLevel} />
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleComputeRisk}
                                disabled={isComputingRisk}
                                className="text-xs"
                            >
                                {isComputingRisk ? 'Computing...' : '🔄 Recompute Risk Score'}
                            </Button>
                            {lastRiskResult && (
                                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1 text-center">
                                    <p>Model: <span className="font-medium">{lastRiskResult.model_used || 'unknown'}</span></p>
                                    <p>Confidence: {((lastRiskResult.confidence || 0) * 100).toFixed(0)}%</p>
                                </div>
                            )}
                            {/* TASK-4.4: Risk Velocity Indicator */}
                            {lastRiskResult?.velocity && (
                                <RiskVelocityIndicator
                                    velocity={lastRiskResult.velocity}
                                    dailyChange={lastRiskResult.velocity_daily_change}
                                    className="mt-2"
                                />
                            )}
                        </div>

                        {/* Map vitals to unified format */}
                        {[
                            ...vitals.map((v) => ({
                                id: v.id,
                                type: v.type || v.vital_type,
                                value: v.value,
                                value2: v.value2,
                                unit: v.unit,
                                category: 'vital' as const,
                            })),
                            ...labs.map((l) => ({
                                id: l.id,
                                type: l.lab_type,
                                value: l.value,
                                value2: null,
                                unit: l.unit,
                                category: 'lab' as const,
                            })),
                        ].slice(0, 3).map((reading) => (
                            <Card key={reading.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        {(reading.type === 'heartRate' || reading.type === 'heart_rate') && <Heart className="w-4 h-4 text-red-500" />}
                                        {(reading.type === 'bloodPressure' || reading.type === 'blood_pressure') && <Activity className="w-4 h-4 text-blue-500" />}
                                        {(reading.type === 'oxygenSat' || reading.type === 'oxygen_sat') && <Wind className="w-4 h-4 text-cyan-500" />}
                                        {(reading.type === 'glucose' || reading.type === 'blood_sugar') && <Activity className="w-4 h-4 text-orange-500" />}
                                        {!['heartRate', 'heart_rate', 'bloodPressure', 'blood_pressure', 'oxygenSat', 'oxygen_sat', 'glucose', 'blood_sugar'].includes(reading.type || '') && <Activity className="w-4 h-4 text-gray-500" />}
                                        <span className="text-sm text-[hsl(var(--muted-foreground))] capitalize">
                                            {formatReadingType(reading.type)}
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold">
                                        {reading.value}{reading.value2 ? `/${reading.value2}` : ''}
                                        <span className="text-sm font-normal text-[hsl(var(--muted-foreground))] ml-1">{reading.unit || ''}</span>
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        {/* Risk Score Over Time */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Risk Score Trend</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {riskHistory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={riskHistory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis
                                                dataKey="timestamp"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short' })}
                                                stroke="hsl(var(--muted-foreground))"
                                            />
                                            <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))'
                                                }}
                                                labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                            />
                                            <ReferenceLine y={70} stroke="hsl(var(--risk-high))" strokeDasharray="3 3" />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="hsl(var(--primary))"
                                                strokeWidth={2}
                                                dot={{ fill: 'hsl(var(--primary))' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[200px] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                                        <p>No risk history yet. Add vitals to start tracking.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Glucose Chart - Dynamic from vitals/labs */}
                        {glucoseChartData.length > 0 && (
                            <TimelineChart
                                title="Blood Glucose Trend"
                                data={glucoseChartData.map(d => ({
                                    date: d.timestamp,
                                    value: d.value,
                                }))}
                                color="hsl(var(--risk-high))"
                                unit="mg/dL"
                                normalRange={{ min: 70, max: 100 }}
                                showArea={true}
                            />
                        )}

                        {/* Creatinine Chart - Dynamic from labs */}
                        {creatinineChartData.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Creatinine Trend</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={creatinineChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis
                                                dataKey="timestamp"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short' })}
                                                stroke="hsl(var(--muted-foreground))"
                                            />
                                            <YAxis domain={[0.5, 1.5]} stroke="hsl(var(--muted-foreground))" />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))'
                                                }}
                                            />
                                            <ReferenceLine y={1.2} stroke="hsl(var(--risk-medium))" strokeDasharray="3 3" />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="hsl(var(--risk-medium))"
                                                strokeWidth={2}
                                                dot={{ fill: 'hsl(var(--risk-medium))' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Blood Pressure Chart - Dynamic from vitals */}
                        {bpChartData.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Blood Pressure Trend</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={bpChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis
                                                dataKey="timestamp"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short' })}
                                                stroke="hsl(var(--muted-foreground))"
                                            />
                                            <YAxis domain={[60, 200]} stroke="hsl(var(--muted-foreground))" />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))'
                                                }}
                                                formatter={(value, name) => [
                                                    value ?? 0,
                                                    name === 'value' ? 'Systolic' : 'Diastolic'
                                                ]}
                                            />
                                            {/* Event-anchored marker: High BP threshold */}
                                            <ReferenceLine y={140} stroke="hsl(var(--risk-high))" strokeDasharray="3 3" label={{ value: 'High', fill: 'hsl(var(--risk-high))', fontSize: 10 }} />
                                            <ReferenceLine y={90} stroke="hsl(var(--risk-medium))" strokeDasharray="3 3" label={{ value: 'Normal', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="hsl(var(--risk-high))"
                                                strokeWidth={2}
                                                name="Systolic"
                                                dot={{ fill: 'hsl(var(--risk-high))' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="value2"
                                                stroke="hsl(var(--primary))"
                                                strokeWidth={2}
                                                name="Diastolic"
                                                dot={{ fill: 'hsl(var(--primary))' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Risk Drivers Panel - Shows explanation of why patient is at risk */}
                    <div className="mb-6">
                        <RiskDriversPanel
                            explanation={lastRiskResult?.explanation || null}
                            modelUsed={lastRiskResult?.model_used}
                            confidence={lastRiskResult?.confidence}
                            isLoading={isComputingRisk}
                        />
                    </div>

                    {/* Alert History */}
                    {patientAlerts.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Alert History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {patientAlerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className={cn(
                                                'p-3 rounded-lg border flex justify-between items-center',
                                                (alert.status === 'new' || alert.status === 'reviewed') && 'border-[hsl(var(--risk-high))] bg-[hsl(var(--risk-high))]/5'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className={cn(
                                                    'w-4 h-4',
                                                    alert.severity === 'critical' && 'text-[hsl(var(--risk-critical))]',
                                                    alert.severity === 'high' && 'text-[hsl(var(--risk-high))]',
                                                    alert.severity === 'medium' && 'text-[hsl(var(--risk-medium))]',
                                                    alert.severity === 'low' && 'text-[hsl(var(--risk-low))]',
                                                )} />
                                                <div>
                                                    <p className="font-medium text-sm">{alert.title}</p>
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                                        {new Date(alert.time).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={(alert.status === 'new' || alert.status === 'reviewed') ? alert.severity : 'outline'}>
                                                    {alert.status}
                                                </Badge>
                                                {alert.feedback && (
                                                    alert.feedback === 'helpful'
                                                        ? <ThumbsUp className="w-4 h-4 text-[hsl(var(--risk-low))]" />
                                                        : <ThumbsDown className="w-4 h-4 text-[hsl(var(--risk-high))]" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && id && (
                <PatientTimeline key={refreshKey} patientId={id} />
            )}

            {/* Record Data Tab */}
            {activeTab === 'record' && id && (
                <RecordDataForm patientId={id} onDataAdded={handleDataAdded} />
            )}
        </MainLayout>
    );
}
