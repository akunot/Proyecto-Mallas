import { useEffect, useRef, useState } from 'react';

// Tipado explícito de los datos de configuración
interface Profile {
  label: string;
  href: string;
  hoverClass: string;
}

interface Campus {
  label: string;
  href: string;
}

interface Service {
  label: string;
  href: string;
  icon: string;
}

interface SocialNetwork {
  label: string;
  href: string;
  position: number;
}

interface NavigationItem {
  label: string;
  submenu: { label: string; href: string }[];
}

const PROFILES: Profile[] = [
  { label: 'Aspirantes', href: 'https://aspirantes.unal.edu.co', hoverClass: 'hover:bg-[#ffdd00] hover:text-[#333]' },
  { label: 'Estudiantes', href: 'https://estudiantes.unal.edu.co', hoverClass: 'hover:bg-[#ffb600] hover:text-[#333]' },
  { label: 'Egresados', href: 'https://egresados.unal.edu.co', hoverClass: 'hover:bg-[#51b8be] hover:text-[#333]' },
  { label: 'Docentes', href: 'https://docentes.unal.edu.co', hoverClass: 'hover:bg-[#008c95] hover:text-white' },
  { label: 'Administrativos', href: 'https://administrativos.unal.edu.co', hoverClass: 'hover:bg-[#ff3d30] hover:text-white' },
];

const CAMPUSES: Campus[] = [
  { label: 'Amazonia', href: 'https://amazonia.unal.edu.co' },
  { label: 'Bogotá', href: 'https://bogota.unal.edu.co' },
  { label: 'Caribe', href: 'https://caribe.unal.edu.co' },
  { label: 'De La Paz', href: 'https://delapaz.unal.edu.co' },
  { label: 'Manizales', href: 'https://manizales.unal.edu.co' },
  { label: 'Medellín', href: 'https://medellin.unal.edu.co' },
  { label: 'Orinoquia', href: 'https://orinoquia.unal.edu.co' },
  { label: 'Palmira', href: 'https://palmira.unal.edu.co' },
  { label: 'Tumaco', href: 'https://tumaco-pacifico.unal.edu.co' },
];

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'INFORMACIÓN DE INTERÉS',
    submenu: [
      { label: 'Promedios', href: 'http://www.sae.unal.edu.co/promedios/' },
      { label: 'Cupo De Créditos', href: 'http://www.sae.unal.edu.co/cupo-de-creditos/' },
      { label: 'Dirección Académica', href: 'https://diracademica.manizales.unal.edu.co/' },
      { label: 'Guías Primer Semestre', href: 'http://www.sae.unal.edu.co/informacion-sae/primer-semestre/manizales/' },
      { label: 'Estímulos Y Distinciones', href: 'http://www.sae.unal.edu.co/estimulos-y-distinciones/' },
      { label: 'Procedimientos Administrativos', href: 'http://www.sae.unal.edu.co/procedimientos-administrativos/' },
      { label: 'Pérdida De Calidad De Estudiante', href: 'http://www.sae.unal.edu.co/perdida-de-calidad-de-estudiante/' },
    ],
  },
  {
    label: 'ENLACES NORMATIVA',
    submenu: [
      { label: 'Admisiones', href: 'https://admisiones.unal.edu.co/' },
      { label: 'Estatuto De Bienestar', href: 'https://legal.unal.edu.co/sisjurun/normas/Norma1.jsp?i=37192' },
      { label: 'Estatuto Estudiantil', href: 'https://legal.unal.edu.co/sisjurun/normas/Norma1.jsp?i=34983' },
      { label: 'Lineamientos Básicos De Formación', href: 'https://legal.unal.edu.co/sisjurun/normas/Norma1.jsp?i=34245' },
      { label: 'Sistema De Acompañamiento Estudiantil', href: 'http://www.sae.unal.edu.co/' },
    ],
  },
];

const SERVICES: Service[] = [
  { label: 'Correo institucional', href: 'https://smartkey.xertica.com/cloudkey/a/unal.edu.co/user/login', icon: 'icnServEmail.png' },
  { label: 'DINARA - SIA', href: 'https://dninfoa.unal.edu.co', icon: 'icnServSia.png' },
  { label: 'Bibliotecas', href: 'https://bibliotecas.unal.edu.co', icon: 'icnServLibrary.png' },
  { label: 'Convocatorias', href: 'https://personal.unal.edu.co', icon: 'icnServCall.png' },
  { label: 'Identidad UNAL', href: 'https://identidad.unal.edu.co', icon: 'icnServIdentidad.png' },
];

const SOCIAL_NETWORKS: SocialNetwork[] = [
  { label: 'Facebook', href: 'https://www.facebook.com/UNALOficial', position: -21 },
  { label: 'X', href: 'https://twitter.com/UNALOficial', position: 0 },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UCnE6Zj2llVxcvL5I38B0Ceg', position: -84 },
];

export default function InstitutionalHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [campusesOpen, setCampusesOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [socialHover, setSocialHover] = useState<string | null>(null);
  const [navigationOpen, setNavigationOpen] = useState<string | null>(null);

  const [fontPercent, setFontPercent] = useState(100);
  const [contrast, setContrast] = useState(0);
  const [invertedColors, setInvertedColors] = useState(false);

  const navRef = useRef<HTMLElement>(null);

  // Manejo de accesibilidad global
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontPercent}%`;
    const contrastFilter =
      contrast === 1
        ? 'contrast(1.15)'
        : contrast === 2
          ? 'contrast(1.35) saturate(1.1)'
          : contrast === 3
            ? 'contrast(1.6) grayscale(1)'
            : '';
    document.documentElement.style.filter = [
      contrastFilter,
      invertedColors ? 'invert(100%)' : '',
    ]
      .filter(Boolean)
      .join(' ');
    document.body.dataset.accessibilityContrast = contrast
      ? String(contrast)
      : '';

    return () => {
      document.documentElement.style.fontSize = '';
      document.documentElement.style.filter = '';
      delete document.body.dataset.accessibilityContrast;
    };
  }, [contrast, fontPercent, invertedColors]);

  // Cerrar menús al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCampusesOpen(false);
        setAccessibilityOpen(false);
        setServicesOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="relative z-[20010] font-['Ancizar_Sans'] text-[14px] leading-normal" ref={navRef}>
      {/* Barra Superior - Desktop */}
      <div className="relative hidden h-[30px] bg-[#666] md:block">
        <div className="flex h-full items-stretch justify-end pr-[70px] lg:pr-[85px]">
          {/* Perfiles */}
          <nav aria-label="Perfiles institucionales" className="flex shrink-0">
            {PROFILES.map(({ label, href, hoverClass }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className={`whitespace-nowrap border-l border-[#3d3d3d] px-2.5 pt-[5px] text-[14px] leading-6 text-white no-underline transition-colors ${hoverClass}`}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Redes Sociales */}
          <nav aria-label="Redes sociales" className="ml-4 flex shrink-0 items-center gap-1">
            {SOCIAL_NETWORKS.map(({ label, href, position }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${label} UNAL`}
                title={`${label} UNAL`}
                onMouseEnter={() => setSocialHover(label)}
                onMouseLeave={() => setSocialHover(null)}
                className="h-5 w-5 bg-[url('/unal/images/icnSocial.png')] bg-no-repeat transition-all"
                style={{
                  backgroundPosition: `${position}px ${socialHover === label ? -21 : 0}px`,
                }}
              />
            ))}
          </nav>

        </div>
      </div>

      {/* Header Principal */}
      <div className="relative flex h-[50px] items-center bg-[url('/unal/images/navigationBack.png')] bg-repeat px-4 text-white md:block md:pt-[11px] md:pl-[200px] lg:pl-[250px] lg:pr-[85px]">
        {/* Escudo Institucional - versión compacta para móvil, sin recortes */}
        <a
          href="https://unal.edu.co"
          target="_blank"
          rel="noreferrer noopener"
          className="flex shrink-0 items-center md:hidden"
          aria-label="Universidad Nacional de Colombia"
        >
          <img
            src="/unal/images/escudoUnal.svg"
            alt="Universidad Nacional de Colombia"
            className="h-10 w-auto"
          />
        </a>

        {/* Escudo Institucional - insignia completa desde tablet/desktop */}
        <a
          href="https://unal.edu.co"
          target="_blank"
          rel="noreferrer noopener"
          className="absolute z-30 -top-[30px] left-0 hidden h-[114px] w-[195px] items-center justify-center bg-[url('/unal/images/sealBck.png')] bg-contain bg-bottom bg-no-repeat px-5 md:flex lg:left-[10px] lg:h-[135px] lg:w-[234px] lg:px-7"
          aria-label="Universidad Nacional de Colombia"
        >
          <img
            src="/unal/images/escudoUnal.svg"
            alt="Escudo de la Universidad Nacional de Colombia"
            className="h-auto w-full"
          />
        </a>

        {/* Dominio de Sede */}
        <div className="hidden items-center gap-2 text-[22px] leading-[18px] sm:text-[27px] md:flex">
          <span className="h-[17px] w-[14px] shrink-0 bg-[url('/unal/images/locDot.png')] bg-no-repeat" aria-hidden="true" />
          <a href="/" className="truncate text-white no-underline hover:text-white">
            mallas.manizales.unal.edu.co
          </a>
        </div>

        <img
          src="/unal/images/sealColombia.png"
          alt="Escudo de la República de Colombia"
          className="absolute z-30 right-[10px] top-[4px] hidden h-[66px] w-[66px] md:block"
        />

        {/* Botón Menú Móvil */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label="Abrir menú de navegación"
          className="ml-auto shrink-0 border-0 bg-transparent p-2 text-2xl text-white md:hidden"
        >
          ☰
        </button>
      </div>

      {/* Navegación Secundaria - Desktop */}
      <nav aria-label="Navegación principal" className="relative z-[20] hidden h-[23px] items-center bg-[url('/unal/images/navigationBack.png')] bg-repeat pl-[200px] text-white md:flex lg:pl-[250px] lg:pr-[70px]">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {NAVIGATION_ITEMS.map(({ label, submenu }) => (
            <div key={label} className="relative h-full">
              <button
                type="button"
                onClick={() => setNavigationOpen((current) => current === label ? null : label)}
                aria-expanded={navigationOpen === label}
                aria-haspopup="true"
                className="flex h-full items-center px-3 py-0 text-[15px] font-sans-serif uppercase no-underline transition-colors duration-150 hover:bg-[#666] hover:text-white"
              >
                {label} <span className="ml-1 text-[#94b43b]">▼</span>
              </button>
                {navigationOpen === label && (
                  <ul className="absolute left-0 top-full z-50 min-w-56 border border-[#222] bg-[#333] py-1 shadow-lg">
                    {submenu.map(({ label, href }) => (
                      <li key={label}>
                        <a href={href} className="block whitespace-nowrap px-3 py-1 text-[14px] text-white hover:bg-[#4b4b4b]">
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          ))}
        </div>

        {/* Menú Desplegable Sedes */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCampusesOpen((prev) => !prev)}
            aria-expanded={campusesOpen}
            aria-haspopup="true"
            className="flex h-full items-center px-4 py-0 text-[15px] font-bold uppercase transition-colors duration-150 hover:bg-[#666]"
          >
            Sedes <span className="ml-1 text-[#94b43b]">▼</span>
          </button>
          {campusesOpen && (
            <ul className="absolute right-0 top-full z-50 min-w-44 border border-[#222] bg-[#333] py-1 shadow-lg">
              {CAMPUSES.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block px-4 py-1.5 text-white hover:bg-[#4b4b4b]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      {/* Menú Desplegable Móvil */}
      {mobileOpen && (
        <div className="bg-[#333] p-4 text-white md:hidden">
          <div className="mb-3 grid grid-cols-2 gap-2 border-b border-white/20 pb-3">
            {PROFILES.map(({ label, href, hoverClass }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className={`rounded px-2 py-2 text-sm ${hoverClass}`}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="mb-3">
            {NAVIGATION_ITEMS.map(({ label, submenu }) => (
              <div key={label} className="border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setNavigationOpen((current) => current === label ? null : label)}
                  aria-expanded={navigationOpen === label}
                  className="flex w-full items-center justify-between py-2 text-left text-sm font-bold uppercase"
                >
                  {label}
                  <span className="text-[#94b43b]">▼</span>
                </button>
                {navigationOpen === label && (
                  <div className="pb-2 pl-3">
                    {submenu.map(({ label, href }) => (
                      <a key={label} href={href} className="block py-1 text-sm text-white hover:text-[#94b43b]">
                        {label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCampusesOpen((prev) => !prev)}
            aria-expanded={campusesOpen}
            className="flex w-full justify-between border-b border-white/20 px-2 py-3 text-left uppercase font-bold"
          >
            Sedes <span className="text-[#94b43b]">▼</span>
          </button>
          {campusesOpen && (
            <div className="grid grid-cols-2 gap-1 py-2">
              {CAMPUSES.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-2 py-2 text-sm hover:bg-[#666]"
                >
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panel de Accesibilidad */}
      <div className="absolute right-0 top-full z-[100]">
        <button
          type="button"
          onClick={() => setAccessibilityOpen((prev) => !prev)}
          aria-expanded={accessibilityOpen}
          aria-haspopup="true"
          className="relative h-[35px] bg-[rgba(41,41,41,0.8)] pl-[45px] pr-[10px] text-[13px] font-bold leading-[35px] text-white sm:text-[14px]"
        >
          <span
            className="absolute left-0 top-0 h-[35px] w-[35px] bg-cover bg-center bg-[url('/unal/images/access-icon.jpg')]"
            aria-hidden="true"
          />
          Panel de Accesibilidad
        </button>
        {accessibilityOpen && (
          <div className="absolute right-0 top-[35px] grid w-[min(100vw-2rem,960px)] grid-cols-1 gap-5 border border-[#444] bg-white p-5 text-sm text-[#333] shadow-lg sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="mb-2 text-xl font-normal text-[#111]">Tamaño letra</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="bg-[#292929] px-3 py-2 font-bold text-white hover:bg-[#94b43b]"
                  onClick={() => setFontPercent((value) => Math.max(100, value - 10))}
                  aria-label="Disminuir tamaño de letra"
                >
                  A<sup>-</sup>
                </button>
                <button
                  type="button"
                  className="bg-[#292929] px-3 py-2 font-bold text-white hover:bg-[#94b43b]"
                  onClick={() => setFontPercent((value) => Math.min(200, value + 10))}
                  aria-label="Aumentar tamaño de letra"
                >
                  A<sup>+</sup>
                </button>
                <span className="min-w-24 bg-[#d4d4d4] px-3 py-2 text-center font-bold text-[#31506f]">
                  {fontPercent}%
                </span>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xl font-normal text-[#111]">Cambiar Contrastes</h4>
              <div className="flex gap-2">
                {[1, 2, 3].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`px-3 py-2 font-bold text-white ${contrast === value ? 'bg-[#94b43b]' : 'bg-[#292929] hover:bg-[#94b43b]'}`}
                    onClick={() => setContrast(value)}
                    aria-pressed={contrast === value}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xl font-normal text-[#111]">Invertir colores</h4>
              <button
                type="button"
                className={`px-3 py-2 font-bold text-white ${invertedColors ? 'bg-[#94b43b]' : 'bg-[#292929] hover:bg-[#94b43b]'}`}
                onClick={() => setInvertedColors((value) => !value)}
                aria-pressed={invertedColors}
              >
                Aplicar
              </button>
            </div>
            <div>
              <h4 className="mb-2 text-xl font-normal text-[#111]">Restablecer ajustes</h4>
              <button
                type="button"
                className="bg-[#292929] px-3 py-2 font-bold text-white hover:bg-[#94b43b]"
                onClick={() => {
                  setFontPercent(100);
                  setContrast(0);
                  setInvertedColors(false);
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Menú Lateral de Servicios */}
      <button
        type="button"
        onClick={() => setServicesOpen((prev) => !prev)}
        aria-expanded={servicesOpen}
        aria-controls="institutional-services"
        className="fixed top-[150px] right-0 z-[110] hidden h-[126px] w-[34px] bg-[#94b43b] bg-[url('/unal/images/backServices.png')] bg-[position:0_0] bg-no-repeat text-transparent transition-transform duration-300 ease-in-out md:block"
        style={{ transform: servicesOpen ? 'translateX(-240px)' : 'translateX(0)' }}
      >
        Servicios
      </button>

      {servicesOpen && (
        <aside
          id="institutional-services"
          className="fixed top-0 right-0 z-[100] hidden h-screen w-[240px] bg-[#333] shadow-[-4px_0_12px_rgba(0,0,0,0.2)] md:block"
          aria-label="Servicios institucionales"
        >
          <ul className="m-0 h-full w-[240px] overflow-y-auto overflow-x-hidden px-[10px] py-[150px] text-[13px] leading-8">
          {SERVICES.map(({ label, href, icon }) => (
            <li
              key={label}
              className="flex h-[52px] items-center border-b border-t border-[#222] first:border-t-0 last:border-b-0 hover:bg-[#444]"
            >
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center whitespace-nowrap text-white no-underline"
              >
                <img src={`/unal/images/${icon}`} alt="" width="32" height="32" className="mr-1" />
                {label}
              </a>
            </li>
          ))}
          </ul>
        </aside>
      )}
    </header>
  );
}