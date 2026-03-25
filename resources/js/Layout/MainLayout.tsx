import { ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();
    const { url } = usePage();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Sedes', href: '/sedes' },
        { name: 'Facultades', href: '/facultades' },
        { name: 'Programas', href: '/programas' },
        { name: 'Mallas', href: '/mallas' },
        { name: 'Cargas', href: '/cargas' },
    ];

    const isActive = (href: string) => url.startsWith(href);

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-green-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo y título */}
                        <div className="flex items-center space-x-4">
                            <Link href="/dashboard" className="flex items-center space-x-2">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                    <span className="text-green-900 font-bold text-lg">UN</span>
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold">Mallas Académicas</h1>
                                    <p className="text-xs text-green-200">UNAL Manizales</p>
                                </div>
                            </Link>
                        </div>

                        {/* Navegación */}
                        <nav className="hidden md:flex space-x-1">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        isActive(item.href)
                                            ? 'bg-green-800 text-white'
                                            : 'text-green-100 hover:bg-green-800 hover:text-white'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </nav>

                        {/* Usuario y logout */}
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm font-medium">{user?.nombre}</p>
                                <p className="text-xs text-green-200">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-green-800 hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Contenido principal */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <p className="text-center text-sm text-gray-500">
                        © {new Date().getFullYear()} Universidad Nacional de Colombia - Sede Manizales
                    </p>
                </div>
            </footer>
        </div>
    );
}
