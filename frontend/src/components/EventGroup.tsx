/**
 * EventGroup - Collapsible group of related timeline events
 * Reduces noise, enables faster scanning
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Activity, FileText, Pill, AlertTriangle, FlaskConical } from 'lucide-react';

export type EventType = 'vital' | 'lab' | 'note' | 'medication' | 'alert';

export interface TimelineEvent {
    id: string;
    type: EventType;
    title: string;
    description?: string;
    timestamp: string;
    value?: string;
    source?: string;
}

interface EventGroupProps {
    date: string;
    events: TimelineEvent[];
    defaultExpanded?: boolean;
}

const EVENT_ICONS = {
    vital: Activity,
    lab: FlaskConical,
    note: FileText,
    medication: Pill,
    alert: AlertTriangle,
};

const EVENT_COLORS = {
    vital: 'text-emerald-500',
    lab: 'text-blue-500',
    note: 'text-purple-500',
    medication: 'text-amber-500',
    alert: 'text-red-500',
};

export function EventGroup({
    date,
    events,
    defaultExpanded = false,
}: EventGroupProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    // Group events by type for summary
    const summary = events.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
    }, {} as Record<EventType, number>);

    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{formattedDate}</span>
                </div>

                {/* Summary badges */}
                <div className="flex items-center gap-2">
                    {Object.entries(summary).map(([type, count]) => {
                        const Icon = EVENT_ICONS[type as EventType];
                        return (
                            <span
                                key={type}
                                className={`flex items-center gap-1 text-xs ${EVENT_COLORS[type as EventType]}`}
                            >
                                <Icon className="h-3 w-3" />
                                {count}
                            </span>
                        );
                    })}
                </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 space-y-2 border-t">
                            {events.map((event) => {
                                const Icon = EVENT_ICONS[event.type];
                                return (
                                    <div
                                        key={event.id}
                                        className="flex items-start gap-3 p-2 rounded hover:bg-muted/30"
                                    >
                                        <Icon className={`h-4 w-4 mt-0.5 ${EVENT_COLORS[event.type]}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm">{event.title}</span>
                                                {event.value && (
                                                    <span className="text-sm font-mono">{event.value}</span>
                                                )}
                                            </div>
                                            {event.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {event.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                <span>
                                                    {new Date(event.timestamp).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                                {event.source && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{event.source}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper to group events by date
export function groupEventsByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
    const groups = new Map<string, TimelineEvent[]>();

    events.forEach(event => {
        const date = event.timestamp.split('T')[0];
        if (!groups.has(date)) {
            groups.set(date, []);
        }
        groups.get(date)!.push(event);
    });

    // Sort dates descending
    return new Map([...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

export default EventGroup;
