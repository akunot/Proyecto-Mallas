import { useState } from 'react';

const profiles = [
    ['Aspirantes', 'https://aspirantes.unal.edu.co', 'bg-[#ffdd00] text-slate-900'],
    ['Estudiantes', 'https://estudiantes.unal.edu.co', 'bg-[#ffb600] text-slate-900'],
    ['Egresados', 'https://egresados.unal.edu.co', 'bg-[#51b8be] text-slate-900'],
    ['Docentes', 'https://docentes.unal.edu.co', 'bg-[#008c95] text-white'],
    ['Administrativos', 'https://administrativos.unal.edu.co', 'bg-[#ff3d30] text-white'],
];

const campuses = [
    ['Amazonia', 'https://amazonia.unal.edu.co'],
    ['Bogota', 'https://bogota.unal.edu.co'],
    ['Caribe', 'https://caribe.unal.edu.co'],
    ['De La Paz', 'https://delapaz.unal.edu.co'],
    ['Manizales', 'https://manizales.unal.edu.co'],
    ['Medellin', 'https://medellin.unal.edu.co'],
    ['Orinoquia', 'https://orinoquia.unal.edu.co'],
    ['Palmira', 'https://palmira.unal.edu.co'],
    ['Tumaco', 'https://tumaco-pacifico.unal.edu.co'],
];

export default function InstitutionalHeader() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [campusesOpen, setCampusesOpen] = useState(false);

    return (
        <header className="relative z-40 font-['Ancizar_Sans']">
            <div className="flex min-h-8 items-center justify-end bg-[#666] px-4 lg:px-8">
                <nav aria-label="Perfiles institucionales" className="hidden md:flex">
                    {profiles.map(([label, href, color]) => (
                        <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className={`px-3 py-1 text-sm font-semibold transition-opacity hover:opacity-80 ${color}`}
                        >
                            {label}
                        </a>
                    ))}
                </nav>
                <div className="ml-3 hidden items-center gap-3 text-white md:flex">
                    <a href="https://www.facebook.com/UNALOficial" target="_blank" rel="noreferrer" aria-label="Facebook UNAL" className="text-sm hover:text-[#94b43b]">f</a>
                    <a href="https://twitter.com/UNALOficial" target="_blank" rel="noreferrer" aria-label="X UNAL" className="text-sm hover:text-[#94b43b]">x</a>
                    <a href="https://www.youtube.com/channel/UCnE6Zj2llVxcvL5I38B0Ceg" target="_blank" rel="noreferrer" aria-label="YouTube UNAL" className="text-sm hover:text-[#94b43b]">▶</a>
                </div>
            </div>

            <div className="relative flex min-h-[104px] items-center bg-[url('/unal/images/navigationBack.png')] px-4 pl-28 text-white shadow-sm sm:pl-36 lg:pl-[250px] lg:pr-24">
                <a href="https://unal.edu.co" target="_blank" rel="noreferrer" className="absolute -top-8 left-3 z-10 flex h-[135px] w-[110px] items-center justify-center bg-[url('/unal/images/sealBck.png')] bg-cover bg-bottom px-3 sm:w-[145px] lg:left-3 lg:w-[225px]" aria-label="Universidad Nacional de Colombia">
                    <img src="/unal/images/escudoUnal.svg" alt="Escudo de la Universidad Nacional de Colombia" className="h-auto w-full" />
                </a>
                <div className="flex min-w-0 flex-1 items-center gap-2 text-lg sm:text-2xl">
                    <span className="text-[#94b43b]">•</span>
                    <span className="truncate">mallas.unal.edu.co</span>
                </div>
                <img src="/unal/images/sealColombia.png" alt="Escudo de la República de Colombia" className="hidden h-14 w-14 sm:block" />
                <button type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-controls="institutional-mobile-menu" className="ml-3 rounded border border-white/40 px-3 py-2 text-xl md:hidden">☰</button>
            </div>

            <nav aria-label="Navegación institucional" className="hidden items-center justify-end gap-2 bg-[#333] px-4 py-2 text-white md:flex lg:px-24">
                <div className="relative">
                    <button type="button" onClick={() => setCampusesOpen(!campusesOpen)} aria-expanded={campusesOpen} className="px-4 py-1.5 text-base uppercase hover:bg-[#666]">Sedes <span className="text-[#94b43b]">⌄</span></button>
                    {campusesOpen && <div className="absolute right-0 top-full z-50 min-w-44 bg-[#333] py-1 shadow-lg">{campuses.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="block px-4 py-2 text-sm hover:bg-[#666]">{label}</a>)}</div>}
                </div>
                <a href="https://unal.edu.co" target="_blank" rel="noreferrer" className="px-4 py-1.5 text-base uppercase hover:bg-[#666]">Universidad Nacional</a>
            </nav>

            {mobileOpen && <div id="institutional-mobile-menu" className="bg-[#333] p-3 text-white md:hidden">
                <button type="button" onClick={() => setCampusesOpen(!campusesOpen)} aria-expanded={campusesOpen} className="flex w-full justify-between border-b border-white/20 px-2 py-3 text-left uppercase">Sedes <span className="text-[#94b43b]">⌄</span></button>
                {campusesOpen && <div className="grid grid-cols-2 gap-1 py-2">{campuses.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="px-2 py-2 text-sm hover:bg-[#666]">{label}</a>)}</div>}
                <a href="https://unal.edu.co" target="_blank" rel="noreferrer" className="block border-t border-white/20 px-2 py-3 uppercase">Universidad Nacional</a>
            </div>}
        </header>
    );
}