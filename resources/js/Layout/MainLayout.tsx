import { ReactNode, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();
    const { url } = usePage();
    const [catalogOpen, setCatalogOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Cargas', href: '/cargas' },
        { name: 'Usuarios', href: '/usuarios' },
    ];

    const catalogNavigation = [
        { name: 'Sedes', href: '/sedes' },
        { name: 'Facultades', href: '/facultades' },
        { name: 'Programas', href: '/programas' },
        { name: 'Normativas', href: '/normativas' },
        { name: 'Asignaturas', href: '/asignaturas' },
        { name: 'Componentes', href: '/componentes' },
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
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo y título */}
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/dashboard"
                                className="flex items-center space-x-2"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                                    <span className="text-lg font-bold text-green-900">
                                        UN
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold">
                                        Mallas Académicas
                                    </h1>
                                    <p className="text-xs text-green-200">
                                        UNAL Manizales
                                    </p>
                                </div>
                            </Link>
                        </div>

                        {/* Navegación */}
                        <nav className="hidden items-center space-x-1 md:flex">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        isActive(item.href)
                                            ? 'bg-green-800 text-white'
                                            : 'text-green-100 hover:bg-green-800 hover:text-white'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            ))}

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setCatalogOpen(!catalogOpen)}
                                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        catalogNavigation.some((item) => isActive(item.href)) || catalogOpen
                                            ? 'bg-green-800 text-white'
                                            : 'text-green-100 hover:bg-green-800 hover:text-white'
                                    }`}
                                >
                                    Catálogos
                                </button>
                                {catalogOpen && (
                                    <div
                                        onMouseLeave={() => setCatalogOpen(false)}
                                        className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5"
                                    >
                                        <div className="py-1">
                                            {catalogNavigation.map((item) => (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                >
                                                    {item.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </nav>

                        {/* Usuario y logout */}
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm font-medium">
                                    {user?.nombre}
                                </p>
                                <p className="text-xs text-green-200">
                                    {user?.email}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-green-700"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Contenido principal */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-gray-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-500">
                        © {new Date().getFullYear()} Universidad Nacional de
                        Colombia - Sede Manizales
                    </p>
                </div>
            </footer>
        </div>
    );
}
