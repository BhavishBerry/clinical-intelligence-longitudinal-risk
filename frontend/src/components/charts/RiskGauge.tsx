/**
 * RiskGauge - Animated risk score dial/gauge
 * Uses framer-motion for smooth animations
 * Includes confidence indicator for clinical trust
 */

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui';
import { Info } from 'lucide-react';

interface RiskGaugeProps {
    score: number;  // 0-1
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    confidence?: number;  // 0-1
    modelUsed?: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

const RISK_COLORS = {
    LOW: 'hsl(var(--risk-low))',
    MEDIUM: 'hsl(var(--risk-medium))',
    HIGH: 'hsl(var(--risk-high))',
    CRITICAL: 'hsl(var(--risk-critical))',
};

const CONFIDENCE_LABELS = {
    high: { label: 'High Confidence', color: 'text-emerald-500' },
    medium: { label: 'Medium Confidence', color: 'text-amber-500' },
    low: { label: 'Low Confidence', color: 'text-red-500' },
};

const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
};

const SIZES = {
    sm: { radius: 40, stroke: 8, fontSize: 'text-lg' },
    md: { radius: 60, stroke: 10, fontSize: 'text-2xl' },
    lg: { radius: 80, stroke: 12, fontSize: 'text-3xl' },
};

export function RiskGauge({
    score,
    level,
    confidence,
    modelUsed,
    size = 'md',
    showLabel = true,
}: RiskGaugeProps) {
    const { radius, stroke, fontSize } = SIZES[size];
    const circumference = 2 * Math.PI * radius;
    const halfCircumference = circumference / 2;
    const progress = score * halfCircumference;
    const color = RISK_COLORS[level] || RISK_COLORS.MEDIUM;

    const confLevel = confidence ? getConfidenceLevel(confidence) : null;
    const confInfo = confLevel ? CONFIDENCE_LABELS[confLevel] : null;

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center">
                {showLabel && (
                    <h3 className="font-semibold mb-2 text-[hsl(var(--muted-foreground))]">
                        Risk Score
                    </h3>
                )}

                <div className="relative" style={{ width: radius * 2 + stroke * 2, height: radius + stroke * 2 }}>
                    <svg
                        width={radius * 2 + stroke * 2}
                        height={radius + stroke * 2}
                        className="transform -rotate-0"
                    >
                        {/* Background arc */}
                        <path
                            d={`M ${stroke} ${radius + stroke} A ${radius} ${radius} 0 0 1 ${radius * 2 + stroke} ${radius + stroke}`}
                            fill="none"
                            stroke="hsl(var(--muted))"
                            strokeWidth={stroke}
                            strokeLinecap="round"
                        />

                        {/* Animated progress arc */}
                        <motion.path
                            d={`M ${stroke} ${radius + stroke} A ${radius} ${radius} 0 0 1 ${radius * 2 + stroke} ${radius + stroke}`}
                            fill="none"
                            stroke={color}
                            strokeWidth={stroke}
                            strokeLinecap="round"
                            strokeDasharray={halfCircumference}
                            initial={{ strokeDashoffset: halfCircumference }}
                            animate={{ strokeDashoffset: halfCircumference - progress }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        />
                    </svg>

                    {/* Score display */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-end pb-2"
                    >
                        <motion.span
                            className={`font-bold ${fontSize}`}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5, duration: 0.3 }}
                            style={{ color }}
                        >
                            {Math.round(score * 100)}%
                        </motion.span>
                    </div>
                </div>

                {/* Risk level badge */}
                <motion.div
                    className="mt-2 px-3 py-1 rounded-full text-sm font-semibold"
                    style={{
                        backgroundColor: `${color}20`,
                        color: color,
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.3 }}
                >
                    {level} RISK
                </motion.div>

                {/* Confidence indicator */}
                {confidence !== undefined && confInfo && (
                    <motion.div
                        className={`mt-3 flex items-center gap-1.5 text-sm ${confInfo.color}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                    >
                        <Info className="h-4 w-4" />
                        <span>{confInfo.label}</span>
                        <span className="font-semibold">({Math.round(confidence * 100)}%)</span>
                    </motion.div>
                )}

                {/* Model indicator */}
                {modelUsed && (
                    <motion.div
                        className="mt-1 text-xs text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                    >
                        Model: {modelUsed}
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}

export default RiskGauge;

