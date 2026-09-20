// Año actual resuelto en TIEMPO DE EJECUCIÓN (no en el build): el sitio no
// debe requerir ediciones manuales cuando comienza un año nuevo.
// Los años históricos (normativas, © Copyright de la plantilla UNAL, fechas de
// creación/auditoría) se conservan explícitos y NO usan este helper.
export const anioActual = (): number => new Date().getFullYear();