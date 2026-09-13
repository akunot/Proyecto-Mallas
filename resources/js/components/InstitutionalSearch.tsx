/**
 * Buscador institucional del header (punto 2 de la revisión).
 * Réplica propia de la caja de la plantilla UNAL: fondo blanco, lupa oscura a
 * la izquierda y placeholder "Buscar en la Universidad". Envía la consulta a
 * la página de resultados de búsqueda de la Universidad en una ventana nueva,
 * sin depender del script de Google CSE.
 */
export default function InstitutionalSearch({
    className = '',
    fullWidth = false,
}: {
    className?: string;
    fullWidth?: boolean;
}) {
    return (
        <form
            role="search"
            action="https://unal.edu.co/resultados-de-la-busqueda/"
            method="get"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Buscar en la Universidad"
            className={`buscador ${fullWidth ? 'buscador--full' : ''} ${className}`}
        >
            <div
                className={`flex h-[38px] items-center gap-2 rounded-[4px] bg-[#6e6e6e] pl-3 pr-2 ${fullWidth ? 'w-full' : 'w-[200px]'}`}
            >
                <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d0d0d0"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    className="shrink-0"
                >
                    <circle cx="10.5" cy="10.5" r="7" />
                    <line x1="16" y1="16" x2="21.5" y2="21.5" />
                </svg>
                <input
                    type="search"
                    name="q"
                    placeholder="Buscar en la Universidad"
                    aria-label="Buscar en la Universidad"
                    className="h-full w-full min-w-0 border-0 bg-transparent p-0 text-center text-[14px] text-[#e8e8e8] outline-none focus:outline-none focus:ring-0"
                />
            </div>
            <button type="submit" className="sr-only">
                Buscar
            </button>
        </form>
    );
}
