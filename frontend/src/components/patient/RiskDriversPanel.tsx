import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertCircle, TrendingUp, Activity, Heart, Thermometer, User } from 'lucide-react';

interface ContributingFactor {
    feature: string;
    display_name: string;
    value: number;
    explanation: string;
}

interface RiskDriversPanelProps {
    explanation: {
        summary: string[];
        contributing_factors: ContributingFactor[];
    } | null;
    modelUsed?: string;
    confidence?: number;
    isLoading?: boolean;
}

// Map feature names to icons
const getFeatureIcon = (feature: string) => {
    switch (feature) {
        case 'glucose':
        case 'blood_sugar':
            return <Activity className="w-4 h-4 text-orange-500" />;
        case 'blood_pressure':
        case 'bp_percent_change':
            return <TrendingUp className="w-4 h-4 text-red-500" />;
        case 'heart_rate':
            return <Heart className="w-4 h-4 text-pink-500" />;
        case 'temperature':
            return <Thermometer className="w-4 h-4 text-amber-500" />;
        case 'age':
            return <User className="w-4 h-4 text-blue-500" />;
        default:
            return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
};

export function RiskDriversPanel({ explanation, modelUsed, confidence, isLoading }: RiskDriversPanelProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Risk Drivers
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!explanation) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Risk Drivers
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Click "Recompute Risk Score" to see risk drivers
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Risk Drivers
                    <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ml-auto" title="Why is this patient at risk?">
                        ℹ️
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Contributing Factors */}
                {explanation.contributing_factors.length > 0 ? (
                    <ul className="space-y-2">
                        {explanation.contributing_factors.map((factor, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                                {getFeatureIcon(factor.feature)}
                                <div>
                                    <span className="font-medium">{factor.display_name}</span>
                                    <p className="text-[hsl(var(--muted-foreground))] text-xs">
                                        {factor.explanation}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {explanation.summary[0] || "No specific risk factors identified"}
                    </p>
                )}

                {/* Model Info */}
                <div className="pt-2 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
                    <div className="flex justify-between">
                        <span>Model:</span>
                        <span className="font-medium">
                            {modelUsed === 'rule_based_fallback' ? 'Rule-based' : modelUsed || 'Unknown'}
                        </span>
                    </div>
                    {confidence !== undefined && (
                        <div className="flex justify-between mt-1" title="Model confidence indicates how certain the AI is about this risk classification. Higher values mean the model is more certain about the prediction based on the patient's data patterns.">
                            <span className="cursor-help border-b border-dashed border-current">Confidence:</span>
                            <span className="font-medium">{(confidence * 100).toFixed(0)}%</span>
                        </div>
                    )}
                </div>

                {/* Disclaimer */}
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic">
                    Risk score indicates probability of clinical deterioration, not a diagnosis.
                </p>
            </CardContent>
        </Card>
    );
}
