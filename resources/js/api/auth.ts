import api from './client';

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
        token: string;
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
        // El endpoint devuelve { message, data: { email, expires_at } }
        const response = await api.post<ApiResponse<{ email: string; expires_at: string }>>('/auth/request-otp', { email });
        return response as unknown as OtpRequestResponse;
    },

    /**
     * Paso 2: Verificar código OTP y obtener token
     */
    verifyOtp: async (email: string, code: string): Promise<LoginResponse> => {
        // El endpoint devuelve { message, data: { user, token } }
        const response = await api.post<ApiResponse<{ user: AuthUser; token: string }>>('/auth/verify-otp', { email, code });
        return response as unknown as LoginResponse;
    },

    /**
     * Cerrar sesión
     */
    logout: async (): Promise<void> => {
        await api.post('/auth/logout');
    },

    /**
     * Obtener datos del usuario actual
     */
    me: async (): Promise<ApiResponse<AuthUser>> => {
        // El endpoint devuelve { data: AuthUser }
        console.log('[authApi] Calling me endpoint...');
        const result = await api.get<ApiResponse<AuthUser>>('me');
        console.log('[authApi] me response:', result);
        return result;
    },
};
