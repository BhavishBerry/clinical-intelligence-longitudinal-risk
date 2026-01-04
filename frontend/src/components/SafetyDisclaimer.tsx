/**
 * SafetyDisclaimer - Clinical decision support disclaimer
 * Required for compliance and trust
 */

import { AlertTriangle } from 'lucide-react';

interface SafetyDisclaimerProps {
    variant?: 'footer' | 'inline' | 'banner';
    className?: string;
}

const DISCLAIMER_TEXT =
    "This system provides risk monitoring support. Clinical decisions remain the responsibility of the care team.";

export function SafetyDisclaimer({
    variant = 'footer',
    className = ''
}: SafetyDisclaimerProps) {
    if (variant === 'banner') {
        return (
            <div className={`bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2 flex items-center gap-2 ${className}`}>
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                    {DISCLAIMER_TEXT}
                </p>
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <p className={`text-xs text-muted-foreground italic ${className}`}>
                {DISCLAIMER_TEXT}
            </p>
        );
    }

    // Footer variant (default)
    return (
        <footer className={`border-t bg-muted/30 py-3 px-4 ${className}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground text-center">
                    {DISCLAIMER_TEXT}
                </p>
            </div>
        </footer>
    );
}

export default SafetyDisclaimer;
