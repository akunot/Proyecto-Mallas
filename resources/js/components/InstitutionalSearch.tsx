import { type FormEvent } from 'react';

/** URL de la página de resultados de búsqueda de la Universidad. */
const RESULTADOS_URL = 'https://unal.edu.co/resultados-de-la-busqueda/';
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
    /**
     * Abre la búsqueda en una pestaña nueva. Lo hacemos por JS porque la página
     * de resultados de la UNAL (Google CSE) solo ejecuta la búsqueda si carga
     * "fresca": si el navegador sirve una copia en caché, la pestaña se abre
     * vacía y hay que pulsar F5. Ojo: esa página devuelve 404 (o se queda
     * colgada) si la URL lleva parámetros extra (`s`, `cx`, `cof`, ...), por eso
     * usamos solo `q` y añadimos un fragmento `#unj=<ts>` que NO viaja al
     * servidor pero cambia la clave de caché del navegador y obliga a recargar.
     */
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const raw = new FormData(event.currentTarget).get('q') as string | null;
        const term = (raw ?? '').trim();
        if (!term) {
            return;
        }

        const params = new URLSearchParams({ q: term });
        const url = `${RESULTADOS_URL}?${params}#unj=${Date.now()}`;
        window.open(url, '_blank', 'noopener');
    };

    return (
        <form
            role="search"
            action={RESULTADOS_URL}
            method="get"
            target="_blank"
            rel="noreferrer noopener"
            onSubmit={handleSubmit}
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
