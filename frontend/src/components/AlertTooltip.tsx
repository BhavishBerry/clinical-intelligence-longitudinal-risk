/**
 * AlertTooltip - Shows "Why am I seeing this alert?"
 * Displays trigger conditions for transparency
 */

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertTooltipProps {
    triggerConditions: string[];
    timeWindow?: string;
    confidence?: number;
    modelUsed?: string;
}

export function AlertTooltip({
    triggerConditions,
    timeWindow = 'Last 30 days',
    confidence,
    modelUsed,
}: AlertTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
                title="Why am I seeing this alert?"
            >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute right-0 top-full mt-2 w-72 bg-card border rounded-lg shadow-lg z-50 p-4"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-sm">Why this alert?</h4>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-0.5 rounded hover:bg-muted"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Trigger Conditions:</p>
                                <ul className="space-y-1">
                                    {triggerConditions.map((condition, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-amber-500 mt-0.5">•</span>
                                            <span>{condition}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                                <span>Time window: {timeWindow}</span>
                                {confidence !== undefined && (
                                    <span>Confidence: {confidence}%</span>
                                )}
                            </div>

                            {modelUsed && (
                                <div className="text-xs text-muted-foreground">
                                    Model: {modelUsed}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default AlertTooltip;
