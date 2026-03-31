const API_BASE_URL = '/api/v1';

/**
 * Cliente API que usa autenticación de sesión (cookies)
 * en lugar de tokens Bearer para compatibilidad con auth de sesión
 */
class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        return headers;
    }

    private getFetchOptions(method: string, data?: any): RequestInit {
        const options: RequestInit = {
            method,
            headers: this.getHeaders(),
            credentials: 'same-origin', // Incluir cookies de sesión
        };

        if (data !== undefined) {
            options.body = JSON.stringify(data);
        }

        return options;
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
            ...this.getFetchOptions('GET'),
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
            ...this.getFetchOptions('POST', data),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    async put<T>(endpoint: string, data: any): Promise<T> {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const fullUrl = this.baseUrl + '/' + cleanEndpoint;
        const url = new URL(fullUrl, window.location.origin);
        const response = await fetch(url.toString(), {
            method: 'PUT',
            ...this.getFetchOptions('PUT', data),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    async patch<T>(endpoint: string, data?: any): Promise<T> {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const fullUrl = this.baseUrl + '/' + cleanEndpoint;
        const url = new URL(fullUrl, window.location.origin);
        const response = await fetch(url.toString(), {
            method: 'PATCH',
            ...this.getFetchOptions('PATCH', data),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    async delete<T>(endpoint: string): Promise<T> {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const fullUrl = this.baseUrl + '/' + cleanEndpoint;
        const url = new URL(fullUrl, window.location.origin);
        const response = await fetch(url.toString(), {
            method: 'DELETE',
            ...this.getFetchOptions('DELETE'),
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
