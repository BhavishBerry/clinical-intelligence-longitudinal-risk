import { Patient } from '@/types';
import { Card, CardContent } from '@/components/ui';
import { RiskBadge, Sparkline } from './RiskIndicators';
import { getRiskScoreHistory } from '@/mocks/mockVitals';
import { MapPin, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PatientCardProps {
    patient: Patient;
}

export function PatientCard({ patient }: PatientCardProps) {
    const navigate = useNavigate();
    const riskHistory = getRiskScoreHistory(patient.id);

    // Determine sparkline color based on current risk
    const sparklineColor = patient.currentRiskLevel === 'critical' || patient.currentRiskLevel === 'high'
        ? 'hsl(var(--risk-high))'
        : patient.currentRiskLevel === 'medium'
            ? 'hsl(var(--risk-medium))'
            : 'hsl(var(--primary))';

    return (
        <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/patients/${patient.id}`)}
        >
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-lg">{patient.name}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            MRN: {patient.mrn}
                        </p>
                    </div>
                    <RiskBadge
                        level={patient.currentRiskLevel}
                        showChange
                        previousLevel={patient.previousRiskLevel}
                    />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-sm text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{patient.age}y, {patient.sex.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{patient.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(patient.admissionDate).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="mt-2">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Risk Trend (6 months)</p>
                    <Sparkline data={riskHistory} color={sparklineColor} height={50} />
                </div>
            </CardContent>
        </Card>
    );
}
