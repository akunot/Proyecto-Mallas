import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { getAuthToken } from './hooks/useAuthToken';
import '../css/app.css';

const appName = import.meta.env.VITE_APP_NAME || 'Mallas UNAL';

// Configurar el router de Inertia para incluir el token Bearer en todas las navegaciones
router.on('start', (event: any) => {
    const token = getAuthToken();
    if (token && event.detail?.options) {
        event.detail.options.headers = {
            ...event.detail.options.headers,
            'Authorization': `Bearer ${token}`,
        };
    }
});

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <AuthProvider>
                <App {...props} />
            </AuthProvider>
        );
    },
    progress: {
        color: '#1a4a2e',
    },
});
