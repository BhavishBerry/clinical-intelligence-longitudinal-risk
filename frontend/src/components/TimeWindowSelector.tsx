/**
 * TimeWindowSelector - Select time range for data display
 * Supports ICU (24h) to chronic care (6 months+)
 */

import { Button } from '@/components/ui';
import { Clock } from 'lucide-react';

export type TimeWindow = '24h' | '7d' | '30d' | '6mo' | 'all';

interface TimeWindowSelectorProps {
    value: TimeWindow;
    onChange: (window: TimeWindow) => void;
    className?: string;
}

const TIME_OPTIONS: { value: TimeWindow; label: string; description: string }[] = [
    { value: '24h', label: '24h', description: 'Last 24 hours' },
    { value: '7d', label: '7d', description: 'Last 7 days' },
    { value: '30d', label: '30d', description: 'Last 30 days' },
    { value: '6mo', label: '6mo', description: 'Last 6 months' },
    { value: 'all', label: 'All', description: 'All time' },
];

export function TimeWindowSelector({
    value,
    onChange,
    className = '',
}: TimeWindowSelectorProps) {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <Clock className="h-4 w-4 text-muted-foreground mr-1" />
            {TIME_OPTIONS.map((option) => (
                <Button
                    key={option.value}
                    variant={value === option.value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onChange(option.value)}
                    className={`px-2 py-1 h-7 text-xs ${value === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                        }`}
                    title={option.description}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
}

// Helper to get date range from time window
export function getDateRange(window: TimeWindow): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (window) {
        case '24h':
            start.setHours(start.getHours() - 24);
            break;
        case '7d':
            start.setDate(start.getDate() - 7);
            break;
        case '30d':
            start.setDate(start.getDate() - 30);
            break;
        case '6mo':
            start.setMonth(start.getMonth() - 6);
            break;
        case 'all':
        default:
            start.setFullYear(start.getFullYear() - 10); // Far back
            break;
    }

    return { start, end };
}

export default TimeWindowSelector;
