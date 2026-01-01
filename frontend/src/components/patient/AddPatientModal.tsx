import { useState, FormEvent } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter, Badge } from '@/components/ui';
import { usePatients } from '@/context';
import { X, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddPatientModal({ isOpen, onClose }: AddPatientModalProps) {
    const { addPatient } = usePatients();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        sex: 'male' as 'male' | 'female' | 'other',
        mrn: '',
        location: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Generate MRN if not provided
        const mrn = formData.mrn || `MRN-${Date.now().toString().slice(-6)}`;

        const newPatient = addPatient({
            name: formData.name,
            age: parseInt(formData.age),
            sex: formData.sex,
            mrn,
            location: formData.location || 'Ward 1A',
            admissionDate: new Date().toISOString(),
        });

        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        setIsSubmitting(false);
        onClose();

        // Navigate to the new patient's detail page
        navigate(`/patients/${newPatient.id}`);
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-[hsl(var(--primary))]" />
                            <CardTitle>Add New Patient</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Patient Name *</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="Enter full name"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Age *</label>
                                <Input
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => handleChange('age', e.target.value)}
                                    placeholder="Years"
                                    min="0"
                                    max="150"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sex *</label>
                                <select
                                    value={formData.sex}
                                    onChange={(e) => handleChange('sex', e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))]"
                                    required
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">MRN (Optional)</label>
                            <Input
                                value={formData.mrn}
                                onChange={(e) => handleChange('mrn', e.target.value)}
                                placeholder="Auto-generated if empty"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Location/Ward</label>
                            <Input
                                value={formData.location}
                                onChange={(e) => handleChange('location', e.target.value)}
                                placeholder="e.g., Ward 3A, ICU-1"
                            />
                        </div>

                        <div className="p-3 bg-[hsl(var(--secondary))] rounded-md">
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                Initial risk level will be set to <Badge variant="low">Low</Badge> and will update as you record patient data.
                            </p>
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Patient'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
