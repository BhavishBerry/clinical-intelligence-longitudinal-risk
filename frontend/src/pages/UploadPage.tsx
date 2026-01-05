import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Upload, FileText, Check, AlertCircle, X, AlertTriangle, Loader2 } from 'lucide-react';
import { api, ValidationResult, ImportResult } from '@/services/api';

type UploadState = 'idle' | 'preview' | 'uploading' | 'success' | 'error';

export function UploadPage() {
    const [state, setState] = useState<UploadState>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string>('');

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setState('uploading'); // Temporarily show loading while previewing
        setError('');

        try {
            const result = await api.uploadPreview(selectedFile);
            setValidation(result);
            setState('preview');
        } catch (err) {
            console.error('Preview failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to parse file');
            setState('error');
        }
    }, []);

    const handleReset = () => {
        setState('idle');
        setFile(null);
        setValidation(null);
        setImportResult(null);
        setError('');
    };

    const handleImport = async () => {
        if (!file) return;

        setState('uploading');
        try {
            const result = await api.uploadImport(file);
            setImportResult(result);
            if (result.success) {
                setState('success');
            } else {
                setError(result.errors.join('; '));
                setState('error');
            }
        } catch (err) {
            console.error('Import failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to import file');
            setState('error');
        }
    };

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Data Import</h1>
                <p className="text-[hsl(var(--muted-foreground))]">
                    Bulk import patient vitals and labs. Supports CSV files.
                </p>
            </div>

            {/* ERROR STATE */}
            {state === 'error' && (
                <Card className="border-[hsl(var(--destructive))] mb-6">
                    <CardContent className="p-6 flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-[hsl(var(--destructive))] shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-[hsl(var(--destructive))]">Import Failed</h3>
                            <p className="text-sm mt-1">{error}</p>
                            <Button variant="outline" size="sm" onClick={handleReset} className="mt-4">
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* IDLE STATE */}
            {state === 'idle' && (
                <Card>
                    <CardContent className="p-8">
                        <div
                            className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-12 text-center hover:border-[hsl(var(--primary))] transition-colors cursor-pointer"
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <Upload className="w-12 h-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
                            <p className="text-lg font-medium mb-2">Click to select CSV file</p>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                Required columns: mrn, timestamp.
                                Optional: systolic, diastolic, heart_rate, glucose, oxygen_sat, temperature.
                            </p>
                            <input
                                id="file-input"
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* PREVIEW STATE */}
            {state === 'preview' && validation && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
                                    <CardTitle>Preview: {file?.name}</CardTitle>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleReset}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 mb-6">
                                <div className="p-4 rounded-lg bg-[hsl(var(--secondary))] text-center flex-1">
                                    <p className="text-2xl font-bold">{validation.total_rows}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Total Rows</p>
                                </div>
                                <div className="p-4 rounded-lg bg-[hsl(var(--risk-low))]/10 text-center flex-1">
                                    <p className="text-2xl font-bold text-[hsl(var(--risk-low))]">{validation.valid_rows}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Valid</p>
                                </div>
                                <div className="p-4 rounded-lg bg-[hsl(var(--risk-high))]/10 text-center flex-1">
                                    <p className="text-2xl font-bold text-[hsl(var(--risk-high))]">{validation.invalid_rows}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Invalid</p>
                                </div>
                            </div>

                            {validation.invalid_rows > 0 && (
                                <div className="mb-6 p-4 border border-[hsl(var(--risk-high))] rounded-lg bg-[hsl(var(--risk-high))]/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-[hsl(var(--risk-high))]" />
                                        <h4 className="font-bold text-sm">Validation Issues</h4>
                                    </div>
                                    <ul className="text-sm space-y-1 list-disc pl-5">
                                        {validation.details
                                            .filter(d => !d.is_valid)
                                            .slice(0, 5)
                                            .map((d, i) => (
                                                <li key={i}>
                                                    Row {d.row_index}: {d.errors.join(', ')}
                                                </li>
                                            ))}
                                        {validation.invalid_rows > 5 && (
                                            <li className="text-[hsl(var(--muted-foreground))]">
                                                ...and {validation.invalid_rows - 5} more rows
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {validation.columns.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium mb-2">Detected Columns:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {validation.columns.map(col => (
                                            <Badge key={col} variant="secondary">{col}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={handleReset}>Cancel</Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={validation.valid_rows === 0}
                                    className={validation.invalid_rows > 0 ? "bg-[hsl(var(--risk-high))]" : ""}
                                >
                                    {validation.invalid_rows > 0 ? `Import ${validation.valid_rows} Valid Rows` : "Import All"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* UPLOADING/PROCESSING STATE */}
            {state === 'uploading' && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Loader2 className="w-12 h-12 mx-auto text-[hsl(var(--primary))] animate-spin mb-4" />
                        <p className="text-lg font-medium">Processing...</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            Validating and importing records. Risk scores will be recomputed.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* SUCCESS STATE */}
            {state === 'success' && importResult && (
                <Card className="border-[hsl(var(--risk-low))]">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--risk-low))]/10 flex items-center justify-center">
                            <Check className="w-8 h-8 text-[hsl(var(--risk-low))]" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Import Complete!</h2>
                        <div className="py-4 space-y-2">
                            <p className="text-[hsl(var(--muted-foreground))]">
                                Successfully imported <span className="font-bold text-foreground">{importResult.records_count}</span> records.
                            </p>
                            {importResult.risk_recalc_count !== undefined && (
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                    Recomputed risk scores for <span className="font-bold text-foreground">{importResult.risk_recalc_count}</span> patients.
                                </p>
                            )}
                        </div>
                        <Button onClick={handleReset} className="mt-4">
                            Upload Another File
                        </Button>
                    </CardContent>
                </Card>
            )}
        </MainLayout>
    );
}
