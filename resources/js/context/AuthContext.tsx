import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, AuthUser } from '../api/auth';

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, code: string) => Promise<void>;
    requestOtp: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Variable global para almacenar el token (en memoria, no localStorage)
declare global {
    interface Window {
        authToken: string | null;
    }
}

window.authToken = null;

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(window.authToken);
    const [isLoading, setIsLoading] = useState(true);

    // Verificar autenticación al cargar
    useEffect(() => {
        const checkAuth = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const userData = await authApi.me();
                setUser(userData.data);
            } catch (error) {
                // Token inválido
                window.authToken = null;
                setToken(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [token]);

    const requestOtp = async (email: string) => {
        await authApi.requestOtp(email);
    };

    const login = async (email: string, code: string) => {
        const response = await authApi.verifyOtp(email, code);
        const newToken = response.data.token;
        
        window.authToken = newToken;
        setToken(newToken);
        setUser(response.data.user);
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } finally {
            window.authToken = null;
            setToken(null);
            setUser(null);
        }
    };

    const isAuthenticated = !!user && !!token;

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
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
