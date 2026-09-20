// Constantes y resolución de las imágenes de los programas académicos.
// Las imágenes gestionadas se publican vía /storage (disco "public" de Laravel)
// y las legacy viven en public/images/programas/ (la ruta evita colisionar con
// la ruta SPA /programas manejada por Inertia/React).
export const PROGRAMA_IMAGE_BASE = '/images/programas';

// Placeholder institucional local para programas sin imagen (sustituye a los
// antiguos hotlinks externos de Unsplash).
export const IMAGEN_PLACEHOLDER = `${PROGRAMA_IMAGE_BASE}/placeholder.svg`;

// Mapeo histórico (legacy) de programas a imágenes locales en
// public/images/programas/. Se mantiene como compatibilidad mientras cada
// programa obtiene su imagen en la base de datos (Ruta_Imagen/Url_Imagen del
// modelo Programa). Lo usan tanto el listado público como el panel
// administrativo, para que ambos muestren la misma imagen.
const imagenesLegacy: Record<string, string> = {
    'INGENIERÍA CIVIL': `${PROGRAMA_IMAGE_BASE}/Ingenieria civil.jpg`,
    'INGENIERÍA ELÉCTRICA': `${PROGRAMA_IMAGE_BASE}/Ing. Electrica.jpg`,
    'INGENIERÍA INDUSTRIAL': `${PROGRAMA_IMAGE_BASE}/Ing. Industrial.jpg`,
    'INGENIERÍA QUÍMICA': `${PROGRAMA_IMAGE_BASE}/Ing. Quimica.jpg`,
    'ADMINISTRACIÓN DE SISTEMAS INFORMÁTICOS': `${PROGRAMA_IMAGE_BASE}/Administración de Sistemas Informáticos.jpg`,
    'ADMINISTRACIÓN DE EMPRESAS DIURNO': `${PROGRAMA_IMAGE_BASE}/Administración de Empresas- diurna.jpg`,
    'ADMINISTRACIÓN DE EMPRESAS NOCTURNO': `${PROGRAMA_IMAGE_BASE}/Administracion de empresas - Noctura.png`,
    'ADMINISTRACIÓN DE EMPRESAS': `${PROGRAMA_IMAGE_BASE}/Administración de Empresas.jpg`,
    ARQUITECTURA: `${PROGRAMA_IMAGE_BASE}/ARQUITECTURA.jpg`,
    BIOLOGÍA: `${PROGRAMA_IMAGE_BASE}/Ingeniería Biológica.png`,
    MATEMÁTICAS: `${PROGRAMA_IMAGE_BASE}/Matemáticas.jpg`,
    FÍSICA: `${PROGRAMA_IMAGE_BASE}/Ing. Fisica.jpg`,
    QUÍMICA: `${PROGRAMA_IMAGE_BASE}/Ing. Quimica.jpg`,
    'CIENCIAS DE LA COMPUTACIÓN': `${PROGRAMA_IMAGE_BASE}/Ciencias de la Computación.jpg`,
    ESTADÍSTICA: `${PROGRAMA_IMAGE_BASE}/Estadistica.jpg`,
    'GESTIÓN CULTURAL': `${PROGRAMA_IMAGE_BASE}/Gestión Cultural.jpg`,
    'INGENIERÍA ELECTRÓNICA': `${PROGRAMA_IMAGE_BASE}/Ing. Electrónica.jpg`,
    'INGENIERÍA FÍSICA': `${PROGRAMA_IMAGE_BASE}/Ing. Fisica.jpg`,
    'INGENIERÍA BIOLÓGICA': `${PROGRAMA_IMAGE_BASE}/Ingeniería Biológica.png`,
};

export interface ProgramaConImagen {
    Nombre_Programa: string;
    Url_Imagen?: string | null;
}

/**
 * Resolución de la imagen de un programa, por orden de prioridad:
 *  1) Imagen cargada desde el panel administrativo (Url_Imagen, base de datos).
 *  2) Imagen legacy local (mapeo por nombre, mientras la BD no tenga imagen).
 *  3) Placeholder institucional local.
 * Los hotlinks externos de Unsplash fueron retirados (identidad visual y
 * disponibilidad fuera del control institucional).
 */
export const resolverImagenPrograma = (programa: ProgramaConImagen): string => {
    if (programa.Url_Imagen) {
        return programa.Url_Imagen;
    }

    const upper = programa.Nombre_Programa.toUpperCase().trim();

    // 1) Match específico: la clave aparece como sub-cadena del nombre
    //    (resuelve "Administración de Empresas Nocturno" → clave nocturna,
    //     antes que la genérica de Empresas).
    for (const [key, imagePath] of Object.entries(imagenesLegacy)) {
        if (upper.includes(key)) {
            return imagePath;
        }
    }

    // 2) Match por primera palabra, solo si es inequívoco (no "ADMINISTRACIÓN"
    //    porque colisiona entre Empresas / Sistemas / etc).
    const firstWord = upper.split(' ')[0];
    const EQUIVOCAL_FIRST_WORDS = new Set(['ADMINISTRACIÓN', 'INGENIERÍA']);

    if (!EQUIVOCAL_FIRST_WORDS.has(firstWord)) {
        for (const [key, imagePath] of Object.entries(imagenesLegacy)) {
            if (key.startsWith(firstWord)) {
                return imagePath;
            }
        }
    }

    return IMAGEN_PLACEHOLDER;
};
