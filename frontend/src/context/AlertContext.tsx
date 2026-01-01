import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Alert, FeedbackType } from '@/types';
import { mockAlerts as initialAlerts, getActiveAlerts } from '@/mocks/mockAlerts';

interface AlertContextType {
    alerts: Alert[];
    activeAlerts: Alert[];
    acknowledgeAlert: (alertId: string, userId: string) => void;
    dismissAlert: (alertId: string, userId: string) => void;
    setFeedback: (alertId: string, feedback: FeedbackType) => void;
    getAlertsByPatient: (patientId: string) => Alert[];
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
    const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

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
