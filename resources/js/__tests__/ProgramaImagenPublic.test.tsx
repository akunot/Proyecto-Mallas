import { describe, expect, it } from 'vitest';

import { IMAGEN_PLACEHOLDER, resolverImagenPrograma } from '../lib/programas';

describe('resolverImagenPrograma (Tarea 2: imágenes de programas)', () => {
    it('prioriza la imagen cargada en la base de datos (Url_Imagen)', () => {
        expect(
            resolverImagenPrograma({
                Nombre_Programa: 'Ingeniería Civil',
                Url_Imagen: '/storage/programas/ingenieria-civil-ab12cd34.jpg',
            }),
        ).toBe('/storage/programas/ingenieria-civil-ab12cd34.jpg');
    });

    it('usa la imagen legacy local cuando no hay imagen en la base de datos', () => {
        expect(
            resolverImagenPrograma({ Nombre_Programa: 'Ingeniería Civil', Url_Imagen: null }),
        ).toBe('/images/programas/Ingenieria civil.jpg');

        expect(
            resolverImagenPrograma({ Nombre_Programa: 'Arquitectura', Url_Imagen: null }),
        ).toBe('/images/programas/ARQUITECTURA.jpg');
    });

    it('usa el placeholder institucional para programas sin imagen (sin Unsplash externo)', () => {
        expect(
            resolverImagenPrograma({ Nombre_Programa: 'Ingeniería Mecánica', Url_Imagen: null }),
        ).toBe(IMAGEN_PLACEHOLDER);

        expect(
            resolverImagenPrograma({ Nombre_Programa: 'Derecho', Url_Imagen: null }),
        ).toBe(IMAGEN_PLACEHOLDER);

        expect(
            resolverImagenPrograma({ Nombre_Programa: 'Programa Inventado XYZ', Url_Imagen: null }),
        ).toBe(IMAGEN_PLACEHOLDER);

        expect(IMAGEN_PLACEHOLDER).toBe('/images/programas/placeholder.svg');
    });
});
