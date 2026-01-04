/**
 * DataProvenance - Shows where data came from
 * Timestamp + Source + Entered by (required for clinical trust)
 */

import { Clock, Database, User2, Smartphone, FileText, FlaskConical } from 'lucide-react';

export type DataSource = 'lab' | 'manual' | 'device' | 'system' | 'import';

interface DataProvenanceProps {
    timestamp: string;
    source: DataSource;
    enteredBy?: string;
    className?: string;
    compact?: boolean;
}

const SOURCE_CONFIG = {
    lab: { icon: FlaskConical, label: 'Lab Result' },
    manual: { icon: FileText, label: 'Manual Entry' },
    device: { icon: Smartphone, label: 'Device' },
    system: { icon: Database, label: 'System' },
    import: { icon: Database, label: 'Imported' },
};

export function DataProvenance({
    timestamp,
    source,
    enteredBy,
    className = '',
    compact = false,
}: DataProvenanceProps) {
    const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.manual;
    const SourceIcon = config.icon;

    const formattedTime = new Date(timestamp).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    if (compact) {
        return (
            <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
                <Clock className="h-3 w-3" />
                <span>{formattedTime}</span>
                <span className="text-muted-foreground/50">•</span>
                <SourceIcon className="h-3 w-3" />
                <span>{config.label}</span>
            </div>
        );
    }

    return (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/30 rounded-md px-2 py-1.5 ${className}`}>
            <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">{formattedTime}</span>
            </div>

            <div className="flex items-center gap-1.5">
                <SourceIcon className="h-3.5 w-3.5" />
                <span>{config.label}</span>
            </div>

            {enteredBy && (
                <div className="flex items-center gap-1.5">
                    <User2 className="h-3.5 w-3.5" />
                    <span>{enteredBy}</span>
                </div>
            )}
        </div>
    );
}

export default DataProvenance;
