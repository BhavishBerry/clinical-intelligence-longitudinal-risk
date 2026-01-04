import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { api } from '@/services/api';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

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

        try {
            // Call real database API
            const response = await api.login(email, password);

            setUser(response.user);
            sessionStorage.setItem('currentUser', JSON.stringify(response.user));
            sessionStorage.setItem('authToken', response.token);
            setIsLoading(false);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            setIsLoading(false);
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('authToken');
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

