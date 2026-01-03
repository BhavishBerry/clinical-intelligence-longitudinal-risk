/**
 * TimelineChart - Interactive patient data visualization
 * Uses Recharts for line/area charts with hover tooltips
 */

import { useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';
import { Card, CardContent } from '@/components/ui';

interface DataPoint {
    date: string;
    value: number;
    label?: string;
}

interface TimelineChartProps {
    title: string;
    data: DataPoint[];
    color?: string;
    unit?: string;
    normalRange?: { min: number; max: number };
    showArea?: boolean;
}

export function TimelineChart({
    title,
    data,
    color = 'hsl(var(--primary))',
    unit = '',
    normalRange,
    showArea = false,
}: TimelineChartProps) {
    const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

    // Format date for display
    const formattedData = data.map(d => ({
        ...d,
        displayDate: new Date(d.date).toLocaleDateString('en-US', {
            month: 'short',
            year: '2-digit'
        }),
    }));

    // Calculate trend
    const firstValue = data[0]?.value || 0;
    const lastValue = data[data.length - 1]?.value || 0;
    const change = firstValue ? ((lastValue - firstValue) / firstValue * 100).toFixed(1) : 0;
    const isIncreasing = lastValue > firstValue;

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const point = payload[0].payload;
            return (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium">{new Date(point.date).toLocaleDateString()}</p>
                    <p className="text-lg font-bold" style={{ color }}>
                        {point.value} {unit}
                    </p>
                    {normalRange && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Normal: {normalRange.min}-{normalRange.max} {unit}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    const ChartComponent = showArea ? AreaChart : LineChart;

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <div className={`flex items-center gap-1 text-sm font-medium ${isIncreasing ? 'text-red-500' : 'text-green-500'
                        }`}>
                        <span>{isIncreasing ? '↑' : '↓'}</span>
                        <span>{change}%</span>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <ChartComponent data={formattedData}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                opacity={0.3}
                            />
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 11 }}
                                stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis
                                domain={['dataMin - 10', 'dataMax + 10']}
                                tick={{ fontSize: 11 }}
                                stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Normal range reference lines */}
                            {normalRange && (
                                <>
                                    <ReferenceLine
                                        y={normalRange.max}
                                        stroke="hsl(var(--muted-foreground))"
                                        strokeDasharray="3 3"
                                        label={{ value: 'Max Normal', fontSize: 10 }}
                                    />
                                    <ReferenceLine
                                        y={normalRange.min}
                                        stroke="hsl(var(--muted-foreground))"
                                        strokeDasharray="3 3"
                                    />
                                </>
                            )}

                            {showArea ? (
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={color}
                                    fill={color}
                                    fillOpacity={0.2}
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: color }}
                                    activeDot={{ r: 6, fill: color }}
                                />
                            ) : (
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: color }}
                                    activeDot={{ r: 6, fill: color }}
                                />
                            )}
                        </ChartComponent>
                    </ResponsiveContainer>
                </div>

                {/* Summary */}
                <div className="flex justify-between mt-3 text-sm text-[hsl(var(--muted-foreground))]">
                    <span>First: {firstValue} {unit}</span>
                    <span>Latest: {lastValue} {unit}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export default TimelineChart;
