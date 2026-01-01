import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@/components/ui';
import { Upload, FileText, Check, AlertCircle, X } from 'lucide-react';
import { cn } from '@/utils/cn';

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

interface ParsedColumn {
    name: string;
    sample: string;
    mapping: string;
}

const fieldOptions = [
    { value: 'skip', label: 'Skip this column' },
    { value: 'patientName', label: 'Patient Name' },
    { value: 'mrn', label: 'MRN' },
    { value: 'heartRate', label: 'Heart Rate' },
    { value: 'bloodPressure', label: 'Blood Pressure' },
    { value: 'glucose', label: 'Blood Glucose' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'oxygenSat', label: 'Oxygen Saturation' },
    { value: 'timestamp', label: 'Timestamp' },
];

export function UploadPage() {
    const [state, setState] = useState<UploadState>('idle');
    const [fileName, setFileName] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [columns, setColumns] = useState<ParsedColumn[]>([]);
    const [error, setError] = useState<string>('');

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setState('selected');
        setError('');

        // Simulate parsing
        const mockColumns: ParsedColumn[] = [
            { name: 'Patient_Name', sample: 'John Doe', mapping: 'patientName' },
            { name: 'MRN', sample: 'MRN-001234', mapping: 'mrn' },
            { name: 'HR', sample: '72', mapping: 'heartRate' },
            { name: 'BP', sample: '120/80', mapping: 'bloodPressure' },
            { name: 'Glucose', sample: '95', mapping: 'glucose' },
            { name: 'Date', sample: '2024-12-31', mapping: 'timestamp' },
        ];
        setColumns(mockColumns);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setState('selected');

        // Simulate parsing
        const mockColumns: ParsedColumn[] = [
            { name: 'Patient_Name', sample: 'John Doe', mapping: 'patientName' },
            { name: 'MRN', sample: 'MRN-001234', mapping: 'mrn' },
            { name: 'HR', sample: '72', mapping: 'heartRate' },
        ];
        setColumns(mockColumns);
    }, []);

    const handleMappingChange = (columnName: string, newMapping: string) => {
        setColumns(prev =>
            prev.map(col =>
                col.name === columnName ? { ...col, mapping: newMapping } : col
            )
        );
    };

    const handleUpload = async () => {
        setState('uploading');
        setProgress(0);

        // Simulate upload progress
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            setProgress(i);
        }

        // Random success/error for demo
        if (Math.random() > 0.2) {
            setState('success');
        } else {
            setState('error');
            setError('Missing required column: Timestamp');
        }
    };

    const handleReset = () => {
        setState('idle');
        setFileName('');
        setColumns([]);
        setProgress(0);
        setError('');
    };

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Data Upload</h1>
                <p className="text-[hsl(var(--muted-foreground))]">
                    Upload patient data files (CSV, JSON, or PDF) for processing
                </p>
            </div>

            {/* Upload Area */}
            {state === 'idle' && (
                <Card>
                    <CardContent className="p-8">
                        <div
                            className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-12 text-center hover:border-[hsl(var(--primary))] transition-colors cursor-pointer"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <Upload className="w-12 h-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
                            <p className="text-lg font-medium mb-2">Drop files here or click to upload</p>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                Supports CSV, JSON, and PDF files
                            </p>
                            <input
                                id="file-input"
                                type="file"
                                accept=".csv,.json,.pdf"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* File Selected - Preview & Mapping */}
            {state === 'selected' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
                                    <CardTitle>{fileName}</CardTitle>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleReset}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                                Map the columns from your file to the system fields:
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-3">Source Column</th>
                                            <th className="text-left py-2 px-3">Sample Value</th>
                                            <th className="text-left py-2 px-3">Map To Field</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {columns.map((col) => (
                                            <tr key={col.name} className="border-b">
                                                <td className="py-2 px-3 font-medium">{col.name}</td>
                                                <td className="py-2 px-3 text-[hsl(var(--muted-foreground))]">{col.sample}</td>
                                                <td className="py-2 px-3">
                                                    <select
                                                        value={col.mapping}
                                                        onChange={(e) => handleMappingChange(col.name, e.target.value)}
                                                        className="w-full px-2 py-1 rounded border border-[hsl(var(--input))] bg-[hsl(var(--background))]"
                                                    >
                                                        {fieldOptions.map((opt) => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={handleReset}>Cancel</Button>
                        <Button onClick={handleUpload}>
                            <Upload className="w-4 h-4 mr-2" />
                            Start Import
                        </Button>
                    </div>
                </div>
            )}

            {/* Uploading */}
            {state === 'uploading' && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
                        <p className="text-lg font-medium mb-4">Importing data...</p>

                        <div className="max-w-md mx-auto">
                            <div className="h-2 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[hsl(var(--primary))] transition-all duration-200"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">{progress}%</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Success */}
            {state === 'success' && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--risk-low))]/10 flex items-center justify-center">
                            <Check className="w-8 h-8 text-[hsl(var(--risk-low))]" />
                        </div>
                        <p className="text-xl font-bold mb-2">Import Successful!</p>
                        <p className="text-[hsl(var(--muted-foreground))] mb-6">
                            Imported 1 patient with 30 records
                        </p>
                        <Button onClick={handleReset}>Upload Another File</Button>
                    </CardContent>
                </Card>
            )}

            {/* Error */}
            {state === 'error' && (
                <Card className="border-[hsl(var(--destructive))]">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--destructive))]/10 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
                        </div>
                        <p className="text-xl font-bold mb-2">Import Failed</p>
                        <p className="text-[hsl(var(--destructive))] mb-6">{error}</p>
                        <div className="flex justify-center gap-3">
                            <Button variant="outline" onClick={handleReset}>Cancel</Button>
                            <Button onClick={() => setState('selected')}>Try Again</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </MainLayout>
    );
}
