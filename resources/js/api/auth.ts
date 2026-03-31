import { apiClient } from './client';

export interface AuthUser {
    id: number;
    nombre: string;
    email: string;
    activo: boolean;
    creado_en?: string;
}

export interface LoginResponse {
    message: string;
    data: {
        user: AuthUser;
    };
}

export interface OtpRequestResponse {
    message: string;
    data: {
        email: string;
        expires_at: string;
    };
}

// Tipos para las respuestas de la API
interface ApiResponse<T> {
    data: T;
    message?: string;
    errors?: Record<string, string[]>;
}

export const authApi = {
    /**
     * Paso 1: Solicitar código OTP
     */
    requestOtp: async (email: string): Promise<OtpRequestResponse> => {
        const response = await fetch('/auth/request-otp', {  // ← ruta web
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ email }),
            credentials: 'same-origin',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al solicitar OTP');
        }
        
        return response.json();
    },

    /**
     * Paso 2: Verificar código OTP
     */
    verifyOtp: async (email: string, code: string): Promise<LoginResponse> => {
        const response = await fetch('/auth/verify-otp', {  // ← ruta web, no API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',  // ← importante para Laravel
            },
            body: JSON.stringify({ email, code }),
            credentials: 'same-origin',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al verificar OTP');
        }
        
        return response.json();
    },

    /**
     * Cerrar sesión
     */
    logout: async (): Promise<void> => {
        await fetch('/api/v1/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            credentials: 'same-origin',
        });
    },

    /**
     * Obtener datos del usuario actual
     */
    me: async (): Promise<ApiResponse<AuthUser>> => {
        const response = await fetch('/api/v1/me', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            credentials: 'same-origin',
        });
        
        if (!response.ok) {
            throw new Error('No autenticado');
        }
        
        return response.json();
    },
};
