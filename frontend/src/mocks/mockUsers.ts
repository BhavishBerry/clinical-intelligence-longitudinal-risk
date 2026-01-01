import { User } from '@/types';

export const mockUsers: User[] = [
    {
        id: 'user-1',
        email: 'doctor1@hospital',
        password: 'password',
        name: 'Dr. Sarah Chen',
        role: 'doctor',
        assignedPatientIds: ['patient-1', 'patient-2', 'patient-3'],
    },
    {
        id: 'user-2',
        email: 'nurse1@hospital',
        password: 'password',
        name: 'Nurse Michael Johnson',
        role: 'nurse',
        assignedPatientIds: ['patient-1', 'patient-4', 'patient-5'],
    },
    {
        id: 'user-3',
        email: 'admin@hospital',
        password: 'adminpass',
        name: 'Admin User',
        role: 'admin',
        assignedPatientIds: [], // Admin sees all patients
    },
];

export const findUserByCredentials = (email: string, password: string): User | null => {
    return mockUsers.find(
        (user) => user.email === email && user.password === password
    ) || null;
};
