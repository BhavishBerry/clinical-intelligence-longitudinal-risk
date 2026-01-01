import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { PatientCard, AddPatientModal } from '@/components/patient';
import { Input, Button } from '@/components/ui';
import { useAuth, useAlerts, usePatients } from '@/context';
import { Search, AlertTriangle, Users, UserPlus } from 'lucide-react';
import { RiskLevel } from '@/types';

export function DashboardPage() {
    const { user } = useAuth();
    const { activeAlerts } = useAlerts();
    const { patients: allPatients } = usePatients();
    const [searchQuery, setSearchQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
    const [showAddModal, setShowAddModal] = useState(false);

    // Get patients based on role
    const patients = useMemo(() => {
        if (user?.role === 'admin') {
            return allPatients;
        }
        return allPatients.filter(p => user?.assignedPatientIds?.includes(p.id));
    }, [user, allPatients]);

    // Apply filters
    const filteredPatients = useMemo(() => {
        return patients.filter((patient) => {
            const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                patient.mrn.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRisk = riskFilter === 'all' || patient.currentRiskLevel === riskFilter;
            return matchesSearch && matchesRisk;
        });
    }, [patients, searchQuery, riskFilter]);

    // Sort by risk level (critical first)
    const sortedPatients = useMemo(() => {
        const riskOrder: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return [...filteredPatients].sort(
            (a, b) => riskOrder[a.currentRiskLevel] - riskOrder[b.currentRiskLevel]
        );
    }, [filteredPatients]);

    return (
        <MainLayout>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Patient Dashboard</h1>
                    <p className="text-[hsl(var(--muted-foreground))]">
                        Monitor patient risk levels and trends
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Patient
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[hsl(var(--card))] rounded-lg border p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-[hsl(var(--primary))]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{patients.length}</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Total Patients</p>
                    </div>
                </div>

                <div className="bg-[hsl(var(--card))] rounded-lg border p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[hsl(var(--risk-high))]/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-[hsl(var(--risk-high))]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{activeAlerts.length}</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Active Alerts</p>
                    </div>
                </div>

                <div className="bg-[hsl(var(--card))] rounded-lg border p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[hsl(var(--risk-critical))]/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-[hsl(var(--risk-critical))]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">
                            {patients.filter(p => p.currentRiskLevel === 'critical' || p.currentRiskLevel === 'high').length}
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">High/Critical Risk</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <Input
                        type="text"
                        placeholder="Search patients by name or MRN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex gap-2">
                    {(['all', 'critical', 'high', 'medium', 'low'] as const).map((level) => (
                        <button
                            key={level}
                            onClick={() => setRiskFilter(level)}
                            className={`px-3 py-2 rounded-md text-sm transition-colors ${riskFilter === level
                                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                                : 'bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))]'
                                }`}
                        >
                            {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Patient Grid */}
            {sortedPatients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedPatients.map((patient) => (
                        <PatientCard key={patient.id} patient={patient} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
                    <p className="text-[hsl(var(--muted-foreground))]">
                        {searchQuery || riskFilter !== 'all'
                            ? 'No patients match your filters'
                            : 'No patients assigned to you'}
                    </p>
                </div>
            )}

            {/* Add Patient Modal */}
            <AddPatientModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
        </MainLayout>
    );
}
