import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { useAlerts, useAuth } from '@/context';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, X, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { Alert, AlertSeverity } from '@/types';
import { cn } from '@/utils/cn';

export function AlertsPage() {
    const { alerts, acknowledgeAlert, dismissAlert, setFeedback } = useAlerts();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'dismissed'>('all');

    const filteredAlerts = useMemo(() => {
        const sorted = [...alerts].sort((a, b) => {
            // Sort by status (active first) then by severity
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            const severityOrder: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });

        if (statusFilter === 'all') return sorted;
        return sorted.filter(a => a.status === statusFilter);
    }, [alerts, statusFilter]);

    const getSeverityIcon = (severity: AlertSeverity) => {
        const colors = {
            critical: 'text-[hsl(var(--risk-critical))]',
            high: 'text-[hsl(var(--risk-high))]',
            medium: 'text-[hsl(var(--risk-medium))]',
            low: 'text-[hsl(var(--risk-low))]',
        };
        return <AlertTriangle className={cn('w-5 h-5', colors[severity])} />;
    };

    const handleAcknowledge = (alertId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (user) acknowledgeAlert(alertId, user.id);
    };

    const handleDismiss = (alertId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (user) dismissAlert(alertId, user.id);
    };

    const handleFeedback = (alertId: string, feedback: 'useful' | 'not_useful', e: React.MouseEvent) => {
        e.stopPropagation();
        setFeedback(alertId, feedback);
    };

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Alerts</h1>
                <p className="text-[hsl(var(--muted-foreground))]">
                    View and manage patient risk alerts
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {(['all', 'active', 'acknowledged', 'dismissed'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={cn(
                            'px-4 py-2 rounded-md text-sm transition-colors capitalize',
                            statusFilter === status
                                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                                : 'bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))]'
                        )}
                    >
                        {status}
                        {status !== 'all' && (
                            <span className="ml-2 text-xs opacity-70">
                                ({alerts.filter(a => a.status === status).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Alerts List */}
            {filteredAlerts.length > 0 ? (
                <div className="space-y-3">
                    {filteredAlerts.map((alert) => (
                        <Card
                            key={alert.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => navigate(`/patients/${alert.patientId}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        {getSeverityIcon(alert.severity)}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{alert.title}</h3>
                                                <Badge variant={alert.severity}>{alert.severity}</Badge>
                                                {alert.status !== 'active' && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {alert.status}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
                                                Patient: <span className="font-medium">{alert.patientName}</span>
                                            </p>
                                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                                {alert.explanation.slice(0, 100)}...
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                                                <Clock className="w-3 h-3" />
                                                {new Date(alert.time).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {alert.status === 'active' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => handleAcknowledge(alert.id, e)}
                                                >
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Acknowledge
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => handleDismiss(alert.id, e)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}

                                        {alert.status !== 'active' && (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant={alert.feedback === 'useful' ? 'default' : 'ghost'}
                                                    onClick={(e) => handleFeedback(alert.id, 'useful', e)}
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={alert.feedback === 'not_useful' ? 'destructive' : 'ghost'}
                                                    onClick={(e) => handleFeedback(alert.id, 'not_useful', e)}
                                                >
                                                    <ThumbsDown className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Check className="w-12 h-12 mx-auto text-[hsl(var(--risk-low))] mb-4" />
                    <p className="text-xl font-medium mb-2">All Clear</p>
                    <p className="text-[hsl(var(--muted-foreground))]">
                        No {statusFilter !== 'all' ? statusFilter : ''} alerts at this time
                    </p>
                </div>
            )}
        </MainLayout>
    );
}
