import { usePage } from '@inertiajs/react';

// Query string del listado actual (página, búsqueda y orden). Se arrastra al
// formulario de edición y de vuelta, para que al guardar o cancelar el usuario
// regrese a la misma página del catálogo y no a la página 1.
export function useQueryListado(): string {
    const { url } = usePage();
    const inicio = url.indexOf('?');

    return inicio === -1 ? '' : url.slice(inicio);
}
