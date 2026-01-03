import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Alert, FeedbackType } from '@/types';
import { mockAlerts as initialAlerts } from '@/mocks/mockAlerts';
import { api, ApiAlert } from '@/services/api';

interface AlertContextType {
    alerts: Alert[];
    activeAlerts: Alert[];
    loading: boolean;
    error: string | null;
    refreshAlerts: () => Promise<void>;
    acknowledgeAlert: (alertId: string, userId: string) => void;
    dismissAlert: (alertId: string, userId: string) => void;
    setFeedback: (alertId: string, feedback: FeedbackType) => void;
    getAlertsByPatient: (patientId: string) => Alert[];
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Convert API alert to frontend Alert type
const convertApiAlert = (apiAlert: ApiAlert): Alert => ({
    id: apiAlert.id,
    patientId: apiAlert.patient_id,
    patientName: apiAlert.patient_name,
    time: apiAlert.time,
    severity: apiAlert.severity,
    title: apiAlert.title,
    explanation: apiAlert.explanation,
    drivers: apiAlert.drivers,
    status: apiAlert.status,
    feedback: null,
});

export function AlertProvider({ children }: { children: ReactNode }) {
    const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useBackend, setUseBackend] = useState(true);

    // Fetch alerts from backend
    const refreshAlerts = useCallback(async () => {
        if (!useBackend) return;

        setLoading(true);
        setError(null);

        try {
            const response = await api.getAlerts();
            const backendAlerts = response.alerts.map(convertApiAlert);

            // Merge with any local state (preserving acknowledge/dismiss status)
            setAlerts((prevAlerts) => {
                const localState = new Map(prevAlerts.map(a => [a.id, a]));
                return backendAlerts.map(newAlert => {
                    const existing = localState.get(newAlert.id);
                    if (existing && existing.status !== 'active') {
                        // Keep local status if already acknowledged/dismissed
                        return { ...newAlert, status: existing.status, feedback: existing.feedback };
                    }
                    return newAlert;
                });
            });
        } catch (err) {
            console.warn('Backend not available, using mock data:', err);
            setError('Backend not available');
            setUseBackend(false);
            // Fall back to mock data (already set as initial state)
        } finally {
            setLoading(false);
        }
    }, [useBackend]);

    // Fetch on mount
    useEffect(() => {
        refreshAlerts();
    }, [refreshAlerts]);

    const acknowledgeAlert = useCallback((alertId: string, userId: string) => {
        setAlerts((prev) =>
            prev.map((alert) =>
                alert.id === alertId
                    ? {
                        ...alert,
                        status: 'acknowledged' as const,
                        acknowledgedBy: userId,
                        acknowledgedAt: new Date().toISOString(),
                    }
                    : alert
            )
        );
    }, []);

    const dismissAlert = useCallback((alertId: string, userId: string) => {
        setAlerts((prev) =>
            prev.map((alert) =>
                alert.id === alertId
                    ? {
                        ...alert,
                        status: 'dismissed' as const,
                        acknowledgedBy: userId,
                        acknowledgedAt: new Date().toISOString(),
                    }
                    : alert
            )
        );
    }, []);

    const setFeedback = useCallback((alertId: string, feedback: FeedbackType) => {
        setAlerts((prev) =>
            prev.map((alert) =>
                alert.id === alertId ? { ...alert, feedback } : alert
            )
        );
    }, []);

    const getAlertsByPatient = useCallback(
        (patientId: string) => alerts.filter((a) => a.patientId === patientId),
        [alerts]
    );

    const activeAlerts = alerts.filter((a) => a.status === 'active');

    return (
        <AlertContext.Provider
            value={{
                alerts,
                activeAlerts,
                loading,
                error,
                refreshAlerts,
                acknowledgeAlert,
                dismissAlert,
                setFeedback,
                getAlertsByPatient,
            }}
        >
            {children}
        </AlertContext.Provider>
    );
}

export function useAlerts() {
    const context = useContext(AlertContext);
    if (context === undefined) {
        throw new Error('useAlerts must be used within an AlertProvider');
    }
    return context;
}
