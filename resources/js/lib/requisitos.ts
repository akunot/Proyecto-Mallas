export interface Requisito {
    ID_Asignatura_Requerida: number | null;
    Tipo_Requisito: string;
    Descripcion_Requisito?: string;
    Valor_Creditos?: number;
    asignatura_requerida?: {
        Nombre_Asignatura: string;
        Codigo_Asignatura: string;
    } | null;
}

export const normalizeReqText = (s: string | null | undefined): string =>
    (s ?? '')
        .toString()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

export const requisitoDedupKey = (r: Requisito): string => {
    if (r.ID_Asignatura_Requerida) {
        return `${r.ID_Asignatura_Requerida}|${normalizeReqText(
            r.Tipo_Requisito,
        )}`;
    }
    return `${normalizeReqText(r.Tipo_Requisito)}|${r.Valor_Creditos ?? 0}|${normalizeReqText(
        r.Descripcion_Requisito ?? '',
    )}`;
};

export const getUniqueRequisitos = (
    requisitos: Requisito[] = [],
): Requisito[] => {
    const seen = new Set<string>();
    const unicos: Requisito[] = [];

    requisitos.forEach((r) => {
        const key = requisitoDedupKey(r);
        if (!seen.has(key)) {
            seen.add(key);
            unicos.push(r);
        }
    });

    return unicos;
};
