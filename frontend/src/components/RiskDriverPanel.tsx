/**
 * RiskDriverPanel - Shows WHY risk changed
 * Displays contributing factors with trend indicators
 */

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity, Pill, Clock } from 'lucide-react';

interface RiskDriver {
    factor: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    trend: 'up' | 'down' | 'stable';
    value?: string;
    previousValue?: string;
}

interface RiskDriverPanelProps {
    drivers: RiskDriver[];
    riskChange?: {
        from: string;
        to: string;
        direction: 'increased' | 'decreased' | 'stable';
    };
    confidence?: number;
    modelUsed?: string;
}

const IMPACT_COLORS = {
    high: 'text-red-500 bg-red-500/10',
    medium: 'text-amber-500 bg-amber-500/10',
    low: 'text-emerald-500 bg-emerald-500/10',
};

const TREND_ICONS = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
};

const FACTOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    'blood_sugar': Activity,
    'blood_pressure': Activity,
    'medication': Pill,
    'duration': Clock,
    'default': AlertTriangle,
};

export function RiskDriverPanel({
    drivers,
    riskChange,
    confidence,
    modelUsed,
}: RiskDriverPanelProps) {
    return (
        <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Risk Drivers
                    </CardTitle>
                    {confidence !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Confidence:</span>
                            <span className={`font-semibold ${confidence >= 80 ? 'text-emerald-500' :
                                    confidence >= 60 ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                {confidence}%
                            </span>
                        </div>
                    )}
                </div>

                {riskChange && riskChange.direction !== 'stable' && (
                    <motion.div
                        className="flex items-center gap-2 text-sm mt-1"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <span className="text-muted-foreground">Risk</span>
                        {riskChange.direction === 'increased' ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-emerald-500" />
                        )}
                        <span>
                            from <strong>{riskChange.from}</strong> → <strong>{riskChange.to}</strong>
                        </span>
                    </motion.div>
                )}
            </CardHeader>

            <CardContent className="space-y-3">
                {drivers.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                        No significant risk factors identified
                    </div>
                ) : (
                    drivers.map((driver, index) => {
                        const TrendIcon = TREND_ICONS[driver.trend];
                        const FactorIcon = FACTOR_ICONS[driver.factor] || FACTOR_ICONS.default;

                        return (
                            <motion.div
                                key={driver.factor}
                                className={`flex items-start gap-3 p-3 rounded-lg ${IMPACT_COLORS[driver.impact]}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <FactorIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium capitalize">
                                            {driver.factor.replace(/_/g, ' ')}
                                        </span>
                                        <TrendIcon className={`h-4 w-4 ${driver.trend === 'up' ? 'text-red-500' :
                                                driver.trend === 'down' ? 'text-emerald-500' :
                                                    'text-muted-foreground'
                                            }`} />
                                    </div>

                                    <p className="text-sm opacity-80 mt-0.5">
                                        {driver.description}
                                    </p>

                                    {driver.value && (
                                        <div className="text-xs mt-1 font-mono">
                                            {driver.previousValue && (
                                                <span className="text-muted-foreground">
                                                    {driver.previousValue} →
                                                </span>
                                            )}
                                            <span className="font-semibold ml-1">
                                                {driver.value}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${driver.impact === 'high' ? 'bg-red-500/20' :
                                        driver.impact === 'medium' ? 'bg-amber-500/20' :
                                            'bg-emerald-500/20'
                                    }`}>
                                    {driver.impact}
                                </span>
                            </motion.div>
                        );
                    })
                )}

                {modelUsed && (
                    <div className="text-xs text-muted-foreground pt-2 border-t flex items-center justify-between">
                        <span>Model: {modelUsed}</span>
                        <span className="italic">Review suggested</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default RiskDriverPanel;
