/**
 * RiskVelocityBadge - Shows risk trajectory
 * Stable / Slowly Worsening / Rapid Deterioration
 */

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

export type RiskVelocity = 'stable' | 'improving' | 'slowly_worsening' | 'rapid_deterioration';

interface RiskVelocityBadgeProps {
    velocity: RiskVelocity;
    showIcon?: boolean;
    size?: 'sm' | 'md';
}

const VELOCITY_CONFIG = {
    stable: {
        label: 'Stable',
        icon: Minus,
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
    },
    improving: {
        label: 'Improving',
        icon: TrendingDown,
        color: 'text-blue-600',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
    },
    slowly_worsening: {
        label: 'Slowly Worsening',
        icon: TrendingUp,
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
    },
    rapid_deterioration: {
        label: 'Rapid Deterioration',
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
    },
};

export function RiskVelocityBadge({
    velocity,
    showIcon = true,
    size = 'md',
}: RiskVelocityBadgeProps) {
    const config = VELOCITY_CONFIG[velocity];
    const Icon = config.icon;

    const sizeClasses = size === 'sm'
        ? 'text-xs px-1.5 py-0.5 gap-1'
        : 'text-sm px-2 py-1 gap-1.5';

    const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

    return (
        <motion.div
            className={`inline-flex items-center rounded-full border ${config.bg} ${config.border} ${config.color} ${sizeClasses} font-medium`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
        >
            {showIcon && <Icon className={iconSize} />}
            <span>{config.label}</span>
        </motion.div>
    );
}

// Helper to calculate velocity from risk history
export function calculateVelocity(
    riskHistory: { score: number; timestamp: Date }[]
): RiskVelocity {
    if (riskHistory.length < 2) return 'stable';

    // Get recent scores (last 3-5 readings)
    const recent = riskHistory.slice(-5);
    const changes: number[] = [];

    for (let i = 1; i < recent.length; i++) {
        changes.push(recent[i].score - recent[i - 1].score);
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

    if (avgChange > 0.1) return 'rapid_deterioration';
    if (avgChange > 0.03) return 'slowly_worsening';
    if (avgChange < -0.03) return 'improving';
    return 'stable';
}

export default RiskVelocityBadge;
