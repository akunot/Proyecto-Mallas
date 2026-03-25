/**
 * Hook para obtener el token de autenticación desde window.authToken
 * Utiliza la variable global para mantener el token en memoria (no localStorage)
 */

// Variable global declarada en AuthContext
declare global {
    interface Window {
        authToken: string | null;
    }
}

/**
 * Hook para obtener el token de autenticación
 * Útil para componentes que usan hooks
 */
export function useAuthToken(): string | null {
    return window.authToken;
}

/**
 * Función helper para obtener el token actual
 * Útil para usar en funciones que no pueden usar hooks
 */
export function getAuthToken(): string | null {
    return window.authToken;
}
