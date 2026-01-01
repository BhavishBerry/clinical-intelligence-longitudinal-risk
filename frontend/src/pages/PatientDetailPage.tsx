import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { RiskBadge, RiskScoreGauge, RecordDataForm, PatientTimeline } from '@/components/patient';
import { useAlerts, useAuth, usePatients } from '@/context';
import { rajGlucoseData, rajBPData, anitaCreatinineData, getRiskScoreHistory } from '@/mocks/mockVitals';
import { ArrowLeft, AlertTriangle, Check, ThumbsUp, ThumbsDown, Activity, Heart, Wind } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/utils/cn';

type TabType = 'overview' | 'timeline' | 'record';

export function PatientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getAlertsByPatient, acknowledgeAlert, setFeedback } = useAlerts();
    const { user } = useAuth();
    const { getPatientById, getVitalsByPatientId, getLabsByPatientId } = usePatients();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [refreshKey, setRefreshKey] = useState(0);

    const patient = id ? getPatientById(id) : undefined;
    const patientAlerts = id ? getAlertsByPatient(id) : [];
    const activeAlert = patientAlerts.find(a => a.status === 'active');
    const vitals = id ? getVitalsByPatientId(id) : [];
    const riskHistory = id ? getRiskScoreHistory(id) : [];

    // Get specific chart data based on patient
    const getChartData = () => {
        if (id === 'patient-1') return { glucose: rajGlucoseData, bp: rajBPData };
        if (id === 'patient-2') return { creatinine: anitaCreatinineData };
        return {};
    };
    const chartData = getChartData();

    const handleDataAdded = () => {
        // Trigger refresh to get updated data
        setRefreshKey(prev => prev + 1);
    };

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
                            MRN: {patient.mrn} • {patient.age}y, {patient.sex.charAt(0).toUpperCase()} • {patient.location}
                        </p>
                    </div>
                    <RiskBadge level={patient.currentRiskLevel} showChange previousLevel={patient.previousRiskLevel} />
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
                                    onClick={() => user && acknowledgeAlert(activeAlert.id, user.id)}
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
                            <ul className="list-disc list-inside space-y-1">
                                {activeAlert.drivers.map((driver, idx) => (
                                    <li key={idx} className="text-sm text-[hsl(var(--muted-foreground))]">
                                        <span className="font-medium">{driver.factor}</span>: {driver.detail}
                                    </li>
                                ))}
                            </ul>
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
                    {/* Risk Score & Current Vitals */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                        <RiskScoreGauge score={patient.currentRiskScore} level={patient.currentRiskLevel} />

                        {vitals.slice(0, 3).map((vital) => (
                            <Card key={vital.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        {vital.type === 'heartRate' && <Heart className="w-4 h-4 text-red-500" />}
                                        {vital.type === 'bloodPressure' && <Activity className="w-4 h-4 text-blue-500" />}
                                        {vital.type === 'oxygenSat' && <Wind className="w-4 h-4 text-cyan-500" />}
                                        <span className="text-sm text-[hsl(var(--muted-foreground))] capitalize">
                                            {vital.type.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold">
                                        {vital.value}{vital.value2 ? `/${vital.value2}` : ''}
                                        <span className="text-sm font-normal text-[hsl(var(--muted-foreground))] ml-1">{vital.unit}</span>
                                    </p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                        Normal: {vital.normalRange.min}-{vital.normalRange.max}
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
                            </CardContent>
                        </Card>

                        {/* Glucose Chart (for Raj) */}
                        {chartData.glucose && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Blood Glucose Trend</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={chartData.glucose}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis
                                                dataKey="timestamp"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                                                stroke="hsl(var(--muted-foreground))"
                                            />
                                            <YAxis domain={[80, 160]} stroke="hsl(var(--muted-foreground))" />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))'
                                                }}
                                                labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                            />
                                            <ReferenceLine y={100} stroke="hsl(var(--risk-medium))" strokeDasharray="3 3" />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="hsl(var(--risk-high))"
                                                strokeWidth={2}
                                                dot={(props: any) => {
                                                    const { cx, cy, payload } = props;
                                                    return (
                                                        <circle
                                                            cx={cx}
                                                            cy={cy}
                                                            r={payload.isAbnormal ? 6 : 4}
                                                            fill={payload.isAbnormal ? 'hsl(var(--risk-high))' : 'hsl(var(--risk-medium))'}
                                                        />
                                                    );
                                                }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Creatinine Chart (for Anita) */}
                        {chartData.creatinine && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Creatinine Trend</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={chartData.creatinine}>
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
                                                alert.status === 'active' && 'border-[hsl(var(--risk-high))] bg-[hsl(var(--risk-high))]/5'
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
                                                <Badge variant={alert.status === 'active' ? alert.severity : 'outline'}>
                                                    {alert.status}
                                                </Badge>
                                                {alert.feedback && (
                                                    alert.feedback === 'useful'
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
