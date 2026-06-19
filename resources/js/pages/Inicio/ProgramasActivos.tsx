import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';

// --- Interfaces ---
interface Programa {
    ID_Programa: number;
    Nombre_Programa: string;
    Codigo_Programa: number;
    Nivel_Formacion: string | null;
    Creditos_Totales: number | null;
    Duracion_Semestres: number | null;
    Titulo_Otorgado: string | null;
    ID_Malla: number | null;
    Estado_Malla: string | null;
}

interface Facultad {
    ID_Facultad: number;
    Nombre_Facultad: string;
    Codigo_Facultad: number;
    Url_Facultad: string | null;
    programas: Programa[];
}

interface Props {
    facultades: Facultad[];
}

// Imágenes placeholder representativas por área de conocimiento
const imagesPorPrograma: Record<string, string> = {
    'INGENIERÍA CIVIL': 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80',
    'INGENIERÍA ELÉCTRICA': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80',
    'INGENIERÍA MECÁNICA': 'https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600&q=80',
    'INGENIERÍA INDUSTRIAL': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80',
    'INGENIERÍA QUÍMICA': 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=600&q=80',
    'INGENIERÍA DE SISTEMAS': 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=600&q=80',
    'INGENIERÍA AGRÍCOLA': 'https://images.unsplash.com/photo-1586771107445-b3b7cb66f5c6?w=600&q=80',
    'ADMINISTRACIÓN DE EMPRESAS': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80',
    'CONTADURÍA PÚBLICA': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
    'DERECHO': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80',
    'ARQUITECTURA': 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=600&q=80',
    'MEDICINA': 'https://images.unsplash.com/photo-1617317366354-2d9a4080185c?w=600&q=80',
    'ENFERMERÍA': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80',
    'BIOLOGÍA': 'https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?w=600&q=80',
    'MATEMÁTICAS': 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=600&q=80',
    'FÍSICA': 'https://images.unsplash.com/photo-1604871000636-074fa5117945?w=600&q=80',
    'QUÍMICA': 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=600&q=80',
    'CIENCIAS HUMANAS': 'https://images.unsplash.com/photo-1531746790095-e5cb157ad1d5?w=600&q=80',
};

const getImageForPrograma = (nombre: string): string => {
    const upper = nombre.toUpperCase().trim();

    for (const [key, url] of Object.entries(imagesPorPrograma)) {
        if (upper.includes(key)) {
return url;
}
    }

    // Imagen genérica para carreras no listadas
    return 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80';
};

/**
 * Vista de Inicio — Listado de Programas Activos
 * Basada en las imágenes de referencia image_1c015c.jpg y image_1c0139.jpg
 * 
 * Muestra las facultades con sus programas organizados en tarjetas.
 * Solo se muestran programas que tengan una malla en estado ACTIVO.
 */
export default function ProgramasActivos({ facultades }: Props) {
    const [searchTerm, setSearch] = useState('');
    const [scrolled, setScrolled] = useState(false);

    // Efecto para el header sticky sutil
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 100);
        window.addEventListener('scroll', handleScroll);

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Filtrado lógico
    const filteredFacultades = facultades.map(f => ({
        ...f,
        programas: f.programas.filter(p => 
            p.Nombre_Programa.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(f => f.programas.length > 0);

    return (
        <div className="min-h-screen bg-[#f1f5f9] selection:bg-green-200">
            <Head title="Mallas Curriculares - UNAL Manizales" />

            {/* 1. HERO SECTION - Altamente Atractiva */}
            <div className="relative bg-[#00236f] py-20 lg:py-32 overflow-hidden">
                <div className="absolute inset-0">
                    {/* Elementos orgánicos de fondo */}
                    <div className="absolute -top-24 -left-20 w-96 h-96 bg-[#77c53f] rounded-full blur-[120px] opacity-20" />
                    <div className="absolute top-1/2 -right-20 w-80 h-80 bg-blue-400 rounded-full blur-[100px] opacity-10" />
                </div>
                
                <div className="relative max-w-7xl mx-auto px-6 text-center lg:text-left grid lg:grid-cols-2 items-center gap-12">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 animate-fade-in">
                            <span className="w-2 h-2 rounded-full bg-[#77c53f] animate-pulse" />
                            <span className="text-white text-xs font-black uppercase tracking-[3px]">Admisiones 2026</span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight">
                            Tu futuro <br />
                            <span className="text-[#77c53f]">comienza aquí.</span>
                        </h1>
                        <p className="text-blue-100 text-lg max-w-lg leading-relaxed opacity-80">
                            Explora los planes de estudio actualizados de la Universidad Nacional de Colombia. 
                            Transparencia y excelencia académica a un clic.
                        </p>
                        
                        {/* Buscador Integrado en Hero */}
                        <div className="relative max-w-md group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#77c53f] transition-colors">search</span>
                            <input 
                                type="text"
                                placeholder="¿Qué quieres estudiar?"
                                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-2xl focus:ring-4 focus:ring-[#77c53f]/30 transition-all text-slate-900 font-medium"
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Stats rápidos */}
                    <div className="hidden lg:grid grid-cols-2 gap-4">
                        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/10">
                            <span className="text-4xl font-black text-white block mb-1">+{facultades.reduce((s,f) => s+f.programas.length, 0)}</span>
                            <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">Programas Activos</span>
                        </div>
                        <div className="bg-[#77c53f]/10 backdrop-blur-sm p-8 rounded-[2.5rem] border border-[#77c53f]/20">
                            <span className="text-4xl font-black text-[#77c53f] block mb-1">{facultades.length}</span>
                            <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">Facultades</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. BARRA DE NAVEGACIÓN RÁPIDA (Sticky) */}
            <div className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-3' : 'bg-transparent py-0 opacity-0 pointer-events-none'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center gap-4 overflow-x-auto scroll-hide">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Ir a:</span>
                    {facultades.map(f => (
                        <a key={f.ID_Facultad} href={`#fac-${f.ID_Facultad}`} className="text-xs font-bold text-slate-600 hover:text-[#00236f] whitespace-nowrap px-3 py-1 rounded-full hover:bg-slate-100 transition-all">
                            {f.Nombre_Facultad.replace('FACULTAD DE ', '').replace('FACULTAD ', '')}
                        </a>
                    ))}
                </div>
            </div>

            {/* 3. LISTADO DE PROGRAMAS */}
            <div className="max-w-7xl mx-auto px-6 py-12 space-y-20">
                {filteredFacultades.map((facultad) => (
                    <section key={facultad.ID_Facultad} id={`fac-${facultad.ID_Facultad}`} className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                        
                        {/* Banner Facultad - Modernizado */}
                        <div className="flex items-end justify-between border-b-4 border-[#77c53f] pb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-[#77c53f] text-white rounded-2xl flex items-center justify-center facultad-glow">
                                    <span className="material-symbols-outlined !text-3xl">account_balance</span>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                                        {facultad.Nombre_Facultad}
                                    </h2>
                                    <p className="text-slate-500 text-sm font-medium tracking-wide">
                                        {facultad.programas.length} Ofertas académicas vigentes
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Grid de Programas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {facultad.programas.map((programa) => (
                                <Link
                                    key={programa.ID_Programa}
                                    href={`/malla-publica/${programa.ID_Programa}`}
                                    className="group relative h-[320px] rounded-[2rem] overflow-hidden bg-white shadow-xl hover:shadow-2xl transition-all duration-500"
                                >
                                    {/* Imagen de fondo con Zoom al hover */}
                                    <img 
                                        src={getImageForPrograma(programa.Nombre_Programa)} 
                                        alt={programa.Nombre_Programa}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    
                                    {/* Overlay Inteligente */}
                                    <div className="absolute inset-0 program-card-overlay transition-opacity duration-500" />

                                    {/* Contenido de la Tarjeta */}
                                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                        <div className="space-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                            <div className="flex justify-between items-start">
                                                <span className="px-3 py-1 bg-[#77c53f] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                                                    {programa.Nivel_Formacion || 'Pregrado'}
                                                </span>
                                                {programa.Codigo_Programa && (
                                                    <span className="text-white/60 text-[9px] font-mono">SNIES {programa.Codigo_Programa}</span>
                                                )}
                                            </div>
                                            
                                            <h3 className="text-xl font-black text-white leading-tight uppercase group-hover:text-[#77c53f] transition-colors">
                                                {programa.Nombre_Programa}
                                            </h3>

                                            <div className="flex items-center gap-4 text-blue-100/80 text-xs font-bold border-t border-white/10 pt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined !text-sm">history_edu</span>
                                                    {programa.Creditos_Totales} Créditos
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined !text-sm">schedule</span>
                                                    {programa.Duracion_Semestres} Semestres
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botón flotante de acción */}
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#00236f] shadow-xl">
                                            <span className="material-symbols-outlined !text-xl">arrow_outward</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {/* Empty State */}
            {filteredFacultades.length === 0 && (
                <div className="py-40 text-center">
                    <span className="material-symbols-outlined !text-8xl text-slate-200">sentiment_dissatisfied</span>
                    <h3 className="text-2xl font-black text-slate-400 mt-4 uppercase">No encontramos lo que buscas</h3>
                    <p className="text-slate-500">Prueba con otro término de búsqueda.</p>
                </div>
            )}
        </div>
    );
}