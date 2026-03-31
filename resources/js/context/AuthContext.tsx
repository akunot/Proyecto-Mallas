import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, AuthUser } from '../api/auth';

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, code: string) => Promise<void>;
    requestOtp: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Verificar autenticación al cargar (sesión via cookie)
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const userData = await authApi.me();
                setUser(userData.data);
            } catch (error) {
                // No autenticado o sesión expirada
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const requestOtp = async (email: string) => {
        await authApi.requestOtp(email);
    };

    const login = async (email: string, code: string) => {
        const response = await authApi.verifyOtp(email, code);
        // La sesión se establece automáticamente via cookie por auth()->login()
        setUser(response.data.user);
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } finally {
            setUser(null);
        }
    };

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                login,
                requestOtp,
                logout,
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
