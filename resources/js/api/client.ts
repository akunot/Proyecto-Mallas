import { getAuthToken } from '../hooks/useAuthToken';

const API_BASE_URL = '/api/v1';

/**
 * Cliente API que obtiene el token de window.authToken (memoria)
 * en lugar de localStorage para mayor seguridad
 */
class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private getHeaders(): HeadersInit {
        const token = getAuthToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const fullUrl = this.baseUrl + '/' + cleanEndpoint;
        const url = new URL(fullUrl, window.location.origin);
        
        if (params) {
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.append(key, String(params[key]));
                }
            });
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    async post<T>(endpoint: string, data?: any): Promise<T> {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const fullUrl = this.baseUrl + '/' + cleanEndpoint;
        const url = new URL(fullUrl, window.location.origin);
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    async put<T>(endpoint: string, data: any): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    async patch<T>(endpoint: string, data?: any): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    async delete<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    private async handleError(response: Response): Promise<Error> {
        try {
            const data = await response.json();
            return new Error(data.message || data.errors || 'Error en la solicitud');
        } catch {
            return new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }
}

export const apiClient = new ApiClient();
export default apiClient;
