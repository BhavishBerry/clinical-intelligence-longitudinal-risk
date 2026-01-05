import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

export type VelocityCategory = 'stable' | 'slowly_worsening' | 'rapid_deterioration' | 'improving' | 'unknown';

interface RiskVelocityIndicatorProps {
    velocity: VelocityCategory;
    dailyChange?: number;
    className?: string;
}

/**
 * TASK-4.3: Risk Velocity Indicator Component
 * Shows whether risk is stable, worsening, or improving based on risk history slope.
 */
export function RiskVelocityIndicator({ velocity, dailyChange, className }: RiskVelocityIndicatorProps) {
    const getVelocityConfig = () => {
        switch (velocity) {
            case 'rapid_deterioration':
                return {
                    icon: AlertTriangle,
                    label: 'Rapid Deterioration',
                    color: 'text-[hsl(var(--risk-critical))]',
                    bgColor: 'bg-[hsl(var(--risk-critical))]/10',
                    borderColor: 'border-[hsl(var(--risk-critical))]',
                    animate: true,
                };
            case 'slowly_worsening':
                return {
                    icon: TrendingUp,
                    label: 'Slowly Worsening',
                    color: 'text-[hsl(var(--risk-high))]',
                    bgColor: 'bg-[hsl(var(--risk-high))]/10',
                    borderColor: 'border-[hsl(var(--risk-high))]',
                    animate: false,
                };
            case 'improving':
                return {
                    icon: TrendingDown,
                    label: 'Improving',
                    color: 'text-[hsl(var(--risk-low))]',
                    bgColor: 'bg-[hsl(var(--risk-low))]/10',
                    borderColor: 'border-[hsl(var(--risk-low))]',
                    animate: false,
                };
            case 'stable':
                return {
                    icon: Minus,
                    label: 'Stable',
                    color: 'text-[hsl(var(--muted-foreground))]',
                    bgColor: 'bg-[hsl(var(--secondary))]',
                    borderColor: 'border-[hsl(var(--border))]',
                    animate: false,
                };
            case 'unknown':
            default:
                return {
                    icon: Minus,
                    label: 'Unknown',
                    color: 'text-[hsl(var(--muted-foreground))]',
                    bgColor: 'bg-[hsl(var(--secondary))]',
                    borderColor: 'border-[hsl(var(--border))]',
                    animate: false,
                };
        }
    };

    const config = getVelocityConfig();
    const IconComponent = config.icon;

    // Format daily change as percentage
    const formatChange = () => {
        if (dailyChange === undefined || dailyChange === 0) return '';
        const sign = dailyChange > 0 ? '+' : '';
        return `${sign}${(dailyChange * 100).toFixed(1)}%/day`;
    };

    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-lg border',
                config.bgColor,
                config.borderColor,
                config.animate && 'animate-pulse',
                className
            )}
        >
            <IconComponent className={cn('w-4 h-4', config.color)} />
            <div className="flex flex-col">
                <span className={cn('text-sm font-medium', config.color)}>
                    {config.label}
                </span>
                {dailyChange !== undefined && dailyChange !== 0 && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {formatChange()}
                    </span>
                )}
            </div>
        </div>
    );
}

export default RiskVelocityIndicator;
