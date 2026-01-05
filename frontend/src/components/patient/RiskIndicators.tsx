import React from 'react';
import { RiskLevel, TrendDirection } from '@/types';
import { Badge, Card, CardContent } from '@/components/ui';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ChartDataPoint } from '@/types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface RiskBadgeProps {
    level: RiskLevel;
    showChange?: boolean;
    previousLevel?: RiskLevel;
}

export function RiskBadge({ level, showChange, previousLevel }: RiskBadgeProps) {
    const isIncreased = previousLevel && getRiskWeight(level) > getRiskWeight(previousLevel);

    return (
        <div className="flex items-center gap-1">
            <Badge variant={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
            </Badge>
            {showChange && previousLevel && previousLevel !== level && (
                <span className={cn('text-xs', isIncreased ? 'text-[hsl(var(--risk-high))]' : 'text-[hsl(var(--risk-low))]')}>
                    {isIncreased ? '↑' : '↓'} from {previousLevel}
                </span>
            )}
        </div>
    );
}

function getRiskWeight(level: RiskLevel): number {
    switch (level) {
        case 'low': return 1;
        case 'medium': return 2;
        case 'high': return 3;
        case 'critical': return 4;
        default: return 0;
    }
}

interface TrendArrowProps {
    direction: TrendDirection;
    value?: string;
    className?: string;
}

export function TrendArrow({ direction, value, className }: TrendArrowProps) {
    const Icon = direction === 'up' ? TrendingUp
        : direction === 'down' ? TrendingDown
            : Minus;

    const colorClass = direction === 'up' ? 'text-[hsl(var(--risk-high))]'
        : direction === 'down' ? 'text-[hsl(var(--risk-low))]'
            : 'text-[hsl(var(--muted-foreground))]';

    return (
        <div className={cn('flex items-center gap-1', colorClass, className)}>
            <Icon className="w-4 h-4" />
            {value && <span className="text-sm font-medium">{value}</span>}
        </div>
    );
}

interface SparklineProps {
    data: ChartDataPoint[];
    color?: string;
    height?: number;
}

export function Sparkline({ data, color = 'hsl(var(--primary))', height = 40 }: SparklineProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

interface RiskScoreGaugeProps {
    score: number;
    level: RiskLevel;
}

export function RiskScoreGauge({ score, level }: RiskScoreGaugeProps) {
    const [showTooltip, setShowTooltip] = React.useState(false);

    const levelColors = {
        low: 'hsl(var(--risk-low))',
        medium: 'hsl(var(--risk-medium))',
        high: 'hsl(var(--risk-high))',
        critical: 'hsl(var(--risk-critical))',
    };

    return (
        <Card className="relative">
            <CardContent className="p-6 text-center">
                {/* Info Icon with Tooltip */}
                <button
                    className="absolute top-2 right-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={() => setShowTooltip(!showTooltip)}
                    aria-label="Risk score information"
                >
                    <Info className="w-4 h-4" />
                </button>

                {/* Tooltip */}
                {showTooltip && (
                    <div className="absolute top-8 right-2 z-50 w-64 p-3 bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-lg shadow-lg text-left text-xs">
                        <p className="font-semibold mb-2">Understanding Risk Score</p>
                        <p className="mb-2">
                            <strong>Risk Score (0-100):</strong> Probability of clinical deterioration.
                            This is NOT a diagnosis — it indicates likelihood of worsening condition based on trends.
                        </p>
                        <p className="mb-2">
                            <strong>Risk Level:</strong>
                            <br />• Low (0-39): Normal monitoring
                            <br />• Medium (40-69): Increased attention needed
                            <br />• High (70+): Urgent clinical review recommended
                        </p>
                        <p className="text-[hsl(var(--muted-foreground))] italic">
                            This tool supports clinical judgment — it does not replace it.
                        </p>
                    </div>
                )}

                <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32 -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="hsl(var(--border))"
                            strokeWidth="8"
                            fill="none"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke={levelColors[level]}
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${(score / 100) * 352} 352`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-bold">{score}</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Risk Score</span>
                    </div>
                </div>
                <div className="mt-2">
                    <RiskBadge level={level} />
                </div>
            </CardContent>
        </Card>
    );
}
