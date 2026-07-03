import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// --- Subcomponentes Refactorizados ---

const Tooltip = ({
    text,
    children,
    isCollapsed,
}: {
    text: string;
    children: ReactNode;
    isCollapsed: boolean;
}) => {
    if (!isCollapsed) {
        return <>{children}</>;
    }

    return (
        <div className="group relative">
            {children}
            <div className="pointer-events-none absolute left-full z-[100] ml-3 rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                {text}
            </div>
        </div>
    );
};

export default function Layout({ children }: { children: ReactNode }) {
    const { user, logout } = useAuth();
    const { url } = usePage();
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        return localStorage.getItem('sidebarOpen') === 'true';
    });
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);

            if (mobile) {
                setSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        localStorage.setItem('sidebarOpen', String(sidebarOpen));
    }, [sidebarOpen]);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
        { name: 'Mallas Académicas', href: '/mallas', icon: 'grid_view' },
        { name: 'Cargas Archivos', href: '/cargas', icon: 'pending_actions' },
        { name: 'Usuarios', href: '/usuarios', icon: 'group' },
    ];

    const catalogs = [
        { name: 'Sedes', href: '/sedes' },
        { name: 'Programas', href: '/programas' },
        { name: 'Agrupaciones', href: '/agrupaciones' },
        { name: 'Normativas', href: '/normativas' },
        { name: 'Auditoría', href: '/auditoria' },
    ];

    const isActive = (href: string) => url.startsWith(href);

    // Lógica de Breadcrumbs
    const routeNames: Record<string, string> = {
        dashboard: 'Dashboard',
        mallas: 'Mallas Académicas',
        cargas: 'Cargas Archivos',
        usuarios: 'Usuarios',
        sedes: 'Sedes',
        programas: 'Programas',
        normativas: 'Normativas',
        auditoria: 'Auditoría',
        visualizar: 'Visualizar',
        editar: 'Editar',
        crear: 'Crear',
        nuevo: 'Nuevo',
    };

    // Quitar query string y separar segmentos
    const pathnames = url.split('?')[0].split('/').filter(Boolean);

    // Construir crumbs: cada uno con label y href acumulado
    const crumbs = pathnames.map((segment, index) => {
        const href = '/' + pathnames.slice(0, index + 1).join('/');
        // Si es un número (ID), mostrarlo como "#123"
        const label = /^\d+$/.test(segment)
            ? `#${segment}`
            : (routeNames[segment.toLowerCase()] ?? segment.replace(/-/g, ' '));

        return { label, href };
    });

    return (
        <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 antialiased">
            {/* Sidebar Overlay para Móvil */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Principal */}
            <aside
                className={`transition-sidebar fixed inset-y-0 left-0 z-50 flex flex-col bg-[#00236f] text-white ${sidebarOpen ? 'w-72' : 'w-20'} ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
            >
                {/* Brand Logo */}
                <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                        <span className="text-sm font-black text-[#00236f]">
                            UN
                        </span>
                    </div>
                    {sidebarOpen && (
                        <div className="flex flex-col animate-in fade-in">
                            <span className="font-bold tracking-tight">
                                Gestion de mallas
                            </span>
                            <span className="text-[10px] font-medium tracking-widest text-blue-200 uppercase">
                                Manizales
                            </span>
                        </div>
                    )}
                </div>

                {/* Perfil Usuario (Slim) */}
                <div className="p-4">
                    <div
                        className={`glass-effect flex items-center gap-3 rounded-xl p-2 ${!sidebarOpen && 'justify-center'}`}
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold ring-2 ring-white/20">
                            {user?.nombre?.[0] || 'A'}
                        </div>
                        {sidebarOpen && (
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-semibold">
                                    {user?.nombre || 'Administrador'}
                                </span>
                                <span className="text-[10px] font-medium text-blue-300">
                                    Admin Sede
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navegación */}
                <nav
                    className={`sidebar-scroll flex-1 space-y-1 px-3 ${sidebarOpen ? 'overflow-y-auto' : 'overflow-hidden'}`}
                >
                    {navigation.map((item) => (
                        <Tooltip
                            key={item.name}
                            text={item.name}
                            isCollapsed={!sidebarOpen}
                        >
                            <Link
                                href={item.href}
                                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${isActive(item.href) ? 'bg-white/10 text-white shadow-lg' : 'text-blue-200 hover:bg-white/5 hover:text-white'}`}
                            >
                                <span
                                    className={`material-symbols-outlined text-[22px] ${isActive(item.href) && 'text-orange-400'}`}
                                >
                                    {item.icon}
                                </span>
                                {sidebarOpen && (
                                    <span className="text-sm font-medium">
                                        {item.name}
                                    </span>
                                )}
                                {isActive(item.href) && sidebarOpen && (
                                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_#f39461]" />
                                )}
                            </Link>
                        </Tooltip>
                    ))}

                    {/* Sección Catálogos */}
                    <div className="mt-4 border-t border-white/10 pt-4">
                        {sidebarOpen ? (
                            <>
                                <button
                                    onClick={() => setCatalogOpen(!catalogOpen)}
                                    className="flex w-full items-center justify-between px-3 py-2 text-blue-300 transition-colors hover:text-white"
                                >
                                    <span className="text-[10px] font-bold tracking-[2px] uppercase">
                                        Catálogos
                                    </span>
                                    <span
                                        className={`material-symbols-outlined text-sm transition-transform ${catalogOpen && 'rotate-180'}`}
                                    >
                                        expand_more
                                    </span>
                                </button>
                                {catalogOpen && (
                                    <div className="mt-1 space-y-1 pl-4">
                                        {catalogs.map((cat) => (
                                            <Link
                                                key={cat.name}
                                                href={cat.href}
                                                className={`block rounded-md px-4 py-2 text-sm transition-colors ${isActive(cat.href) ? 'bg-white/5 font-bold text-white' : 'text-blue-300 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                {cat.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <Tooltip text="Catálogos" isCollapsed={true}>
                                <div className="flex justify-center p-2 text-blue-300">
                                    <span className="material-symbols-outlined">
                                        library_books
                                    </span>
                                </div>
                            </Tooltip>
                        )}
                    </div>
                </nav>

                {/* Logout Footer */}
                <div className="border-t border-white/10 p-4">
                    <button
                        onClick={logout}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-rose-300 transition-colors hover:bg-rose-500/10 ${!sidebarOpen ? 'justify-center' : ''}`}
                    >
                        <span className="material-symbols-outlined">
                            logout
                        </span>
                        {sidebarOpen && (
                            <span className="text-sm font-medium">Salir</span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Contenido Principal */}
            <div
                className={`transition-sidebar flex flex-1 flex-col ${sidebarOpen && !isMobile ? 'ml-72' : isMobile ? 'ml-0' : 'ml-20'}`}
            >
                {/* Header Dinámico */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
                        >
                            <span className="material-symbols-outlined">
                                menu
                            </span>
                        </button>

                        {/* Breadcrumbs */}
                        <nav className="hidden items-center gap-1 text-sm md:flex">
                            <Link
                                href="/dashboard"
                                className="text-slate-400 transition-colors hover:text-[#00236f]"
                            >
                                Inicio
                            </Link>
                            {crumbs.map((crumb, index) => (
                                <span
                                    key={crumb.href}
                                    className="flex items-center gap-1"
                                >
                                    <span className="text-slate-300">/</span>
                                    {index === crumbs.length - 1 ? (
                                        <span className="font-semibold text-slate-800 capitalize">
                                            {crumb.label}
                                        </span>
                                    ) : (
                                        <Link
                                            href={crumb.href}
                                            className="text-slate-400 capitalize transition-colors hover:text-[#00236f]"
                                        >
                                            {crumb.label}
                                        </Link>
                                    )}
                                </span>
                            ))}
                        </nav>
                    </div>
                </header>

                {/* Main View */}
                <main className="overflow-y-auto bg-[#f8fafc] p-4 sm:p-8">
                    <div className="animate-in fade-in">{children}</div>
                </main>
            </div>
        </div>
    );
}
