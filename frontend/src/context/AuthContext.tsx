import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { User } from '@/types';
import { findUserByCredentials } from '@/mocks/mockUsers';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        // Check for stored user in sessionStorage
        const stored = sessionStorage.getItem('currentUser');
        return stored ? JSON.parse(stored) : null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const foundUser = findUserByCredentials(email, password);

        if (foundUser) {
            setUser(foundUser);
            sessionStorage.setItem('currentUser', JSON.stringify(foundUser));
            setIsLoading(false);
            return true;
        } else {
            setError('Invalid email or password');
            setIsLoading(false);
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        sessionStorage.removeItem('currentUser');
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                login,
                logout,
                isLoading,
                error,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
