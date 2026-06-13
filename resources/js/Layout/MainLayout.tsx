import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useAuth } from '../context/AuthContext';

// --- Subcomponentes Refactorizados ---

const Tooltip = ({ text, children, isCollapsed }: { text: string; children: ReactNode; isCollapsed: boolean }) => {
    if (!isCollapsed) return <>{children}</>;
    return (
        <div className="group relative">
            {children}
            <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
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
            if (mobile) setSidebarOpen(false);
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
        dashboard:  'Dashboard',
        mallas:     'Mallas Académicas',
        cargas:     'Cargas Archivos',
        usuarios:   'Usuarios',
        sedes:      'Sedes',
        programas:  'Programas',
        normativas: 'Normativas',
        auditoria:  'Auditoría',
        visualizar: 'Visualizar',
        editar:     'Editar',
        crear:      'Crear',
        nuevo:      'Nuevo',
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
        <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
            {/* Sidebar Overlay para Móvil */}
            {isMobile && sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Principal */}
            <aside
                className={`transition-sidebar fixed inset-y-0 left-0 z-50 flex flex-col bg-[#00236f] text-white
                    ${sidebarOpen ? 'w-72' : 'w-20'} 
                    ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
            >
                {/* Brand Logo */}
                <div className="h-16 flex items-center px-6 gap-3 border-b border-white/10">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-[#00236f] font-black text-sm">UN</span>
                    </div>
                    {sidebarOpen && (
                        <div className="flex flex-col animate-fade-in">
                            <span className="font-bold tracking-tight">Gestion de mallas</span>
                            <span className="text-[10px] text-blue-200 uppercase tracking-widest font-medium">Manizales</span>
                        </div>
                    )}
                </div>

                {/* Perfil Usuario (Slim) */}
                <div className="p-4">
                    <div className={`flex items-center gap-3 p-2 rounded-xl glass-effect ${!sidebarOpen && 'justify-center'}`}>
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs ring-2 ring-white/20">
                            {user?.nombre?.[0] || 'A'}
                        </div>
                        {sidebarOpen && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold truncate">{user?.nombre || 'Administrador'}</span>
                                <span className="text-[10px] text-blue-300 font-medium">Admin Sede</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navegación */}
                <nav className={`flex-1 px-3 space-y-1 sidebar-scroll ${sidebarOpen ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                    {navigation.map((item) => (
                        <Tooltip key={item.name} text={item.name} isCollapsed={!sidebarOpen}>
                            <Link
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                                    ${isActive(item.href) ? 'bg-white/10 text-white shadow-lg' : 'text-blue-200 hover:bg-white/5 hover:text-white'}`}
                            >
                                <span className={`material-symbols-outlined text-[22px] ${isActive(item.href) && 'text-orange-400'}`}>
                                    {item.icon}
                                </span>
                                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                                {isActive(item.href) && sidebarOpen && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_#f39461]" />
                                )}
                            </Link>
                        </Tooltip>
                    ))}

                    {/* Sección Catálogos */}
                    <div className="pt-4 mt-4 border-t border-white/10">
                        {sidebarOpen ? (
                            <>
                                <button
                                    onClick={() => setCatalogOpen(!catalogOpen)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-blue-300 hover:text-white transition-colors"
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-[2px]">Catálogos</span>
                                    <span className={`material-symbols-outlined text-sm transition-transform ${catalogOpen && 'rotate-180'}`}>expand_more</span>
                                </button>
                                {catalogOpen && (
                                    <div className="mt-1 space-y-1 pl-4">
                                        {catalogs.map(cat => (
                                            <Link key={cat.name} href={cat.href} 
                                                className={`block py-2 px-4 text-sm rounded-md transition-colors ${isActive(cat.href) ? 'text-white font-bold bg-white/5' : 'text-blue-300 hover:text-white hover:bg-white/5'}`}>
                                                {cat.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <Tooltip text="Catálogos" isCollapsed={true}>
                                <div className="flex justify-center p-2 text-blue-300">
                                    <span className="material-symbols-outlined">library_books</span>
                                </div>
                            </Tooltip>
                        )}
                    </div>
                </nav>

                {/* Logout Footer */}
                <div className="p-4 border-t border-white/10">
                    <Tooltip text="Salir" isCollapsed={!sidebarOpen}>
                        <button
                            onClick={logout}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors ${!sidebarOpen && 'justify-center'}`}
                        >
                            <span className="material-symbols-outlined">logout</span>
                            {sidebarOpen && <span className="text-sm font-medium">Salir</span>}
                        </button>
                    </Tooltip>
                </div>
            </aside>

            {/* Contenido Principal */}
            <div className={`flex-1 flex flex-col transition-sidebar ${sidebarOpen && !isMobile ? 'ml-72' : isMobile ? 'ml-0' : 'ml-20'}`}>
                {/* Header Dinámico */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        
                        {/* Breadcrumbs */}
                        <nav className="hidden md:flex items-center gap-1 text-sm">
                            <Link href="/dashboard" className="text-slate-400 hover:text-[#00236f] transition-colors">
                                Inicio
                            </Link>
                            {crumbs.map((crumb, index) => (
                                <span key={crumb.href} className="flex items-center gap-1">
                                    <span className="text-slate-300">/</span>
                                    {index === crumbs.length - 1 ? (
                                        <span className="text-slate-800 font-semibold capitalize">
                                            {crumb.label}
                                        </span>
                                    ) : (
                                        <Link
                                            href={crumb.href}
                                            className="text-slate-400 hover:text-[#00236f] transition-colors capitalize"
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
                <main className="p-8 overflow-y-auto">
                    <div className="animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}