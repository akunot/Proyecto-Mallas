<?php

namespace App\Services;

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Asignatura;
use App\Models\CargaMalla;
use App\Models\Componente;
use App\Models\ErrorCarga;
use App\Models\Facultad;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\Programa;
use App\Models\Requisito;
use App\Models\Sede;
use App\Services\CodeNormalizationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class ExcelParserService
{
    private CargaMalla $carga;
    private MallaCurricular $malla;
    private array $errors = [];
    private array $warnings = [];
    private array $asignaturasProcessed = [];
    private int $totalRows = 0;
    private int $processedRows = 0;

    // Cache de catálogos para evitar N+1 queries
    private array $asignaturasCache = [];      // Codigo_Base => ID_Asignatura
    private array $componentesCache = [];      // Nombre_Componente => ID_Componente
    private array $agrupacionesCache = [];     // "ID_Malla|ID_Componente|Nombre" => ID_Agrupacion

    // Batch size para inserts
    private const BATCH_SIZE = 500;

    public function procesar(int $cargaId): array
    {
        $this->carga = CargaMalla::with([
            'archivoAsignaturas',
            'archivoElectivas',
            'archivoMalla',
            'malla.normativa.programa.facultad.sede',
        ])->findOrFail($cargaId);

        $tipoCarga = $this->carga->tipo_carga;

        if ($tipoCarga === 'malla') {
            if (!$this->carga->ID_Archivo_Asignaturas || !$this->carga->ID_Archivo_Electivas || !$this->carga->ID_Archivo_Malla) {
                $this->recordError(
                    0,
                    'Carga',
                    'Faltan los tres archivos necesarios para procesar la carga de malla.',
                    null,
                    'error'
                );

                $this->carga->update(['Estado_Carga' => 'con_errores']);

                return [
                    'success' => false,
                    'errors_count' => count($this->errors),
                    'warnings_count' => count($this->warnings),
                    'processed_rows' => $this->processedRows,
                    'total_rows' => $this->totalRows,
                ];
            }
            if (!$this->malla) {
                throw new \RuntimeException('La carga no tiene una malla asociada para procesar.');
            }
        } elseif ($tipoCarga === 'asignaturas') {
            if (!$this->carga->ID_Archivo_Asignaturas) {
                $this->recordError(
                    0,
                    'Carga',
                    'Falta el archivo de asignaturas.',
                    null,
                    'error'
                );

                $this->carga->update(['Estado_Carga' => 'con_errores']);

                return [
                    'success' => false,
                    'errors_count' => count($this->errors),
                    'warnings_count' => count($this->warnings),
                    'processed_rows' => $this->processedRows,
                    'total_rows' => $this->totalRows,
                ];
            }
        } elseif ($tipoCarga === 'electivas') {
            if (!$this->carga->ID_Archivo_Electivas) {
                $this->recordError(
                    0,
                    'Carga',
                    'Falta el archivo de electivas.',
                    null,
                    'error'
                );

                $this->carga->update(['Estado_Carga' => 'con_errores']);

                return [
                    'success' => false,
                    'errors_count' => count($this->errors),
                    'warnings_count' => count($this->warnings),
                    'processed_rows' => $this->processedRows,
                    'total_rows' => $this->totalRows,
                ];
            }
        }

        ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)->delete();
        $this->errors = [];
        $this->warnings = [];

        $this->carga->update(['Estado_Carga' => 'validando']);

         try {
             if ($tipoCarga === 'malla') {
                 // Pre-cargar catálogos en cache para evitar N+1 queries
                 $this->preloadCatalogs();

                 $asignaturasSpreadsheet = $this->loadSpreadsheetFromField('archivoAsignaturas');
                 $this->parseAsignaturasFile($asignaturasSpreadsheet);

                 $electivasSpreadsheet = $this->loadSpreadsheetFromField('archivoElectivas');
                 $this->parseElectivasFile($electivasSpreadsheet);

                 $mallaSpreadsheet = $this->loadSpreadsheetFromField('archivoMalla');
                 $this->parseAgglomerationSheets($mallaSpreadsheet);
                 $result = $this->parseMalla($mallaSpreadsheet);
             } elseif ($tipoCarga === 'asignaturas') {
                 // Para carga simple de asignaturas, también precarga para búsquedas
                 $this->preloadAsignaturasCache();
                 $asignaturasSpreadsheet = $this->loadSpreadsheetFromField('archivoAsignaturas');
                 $this->parseAsignaturasFile($asignaturasSpreadsheet);
                 $result = true;
             } elseif ($tipoCarga === 'electivas') {
                 // Para electivas, precarga asignaturas
                 $this->preloadAsignaturasCache();
                 $electivasSpreadsheet = $this->loadSpreadsheetFromField('archivoElectivas');
                 $this->parseElectivasFile($electivasSpreadsheet);
                 $result = true;
             }

            $this->updateCargaStatus();

            return [
                'success' => $result,
                'errors_count' => count($this->errors),
                'warnings_count' => count($this->warnings),
                'processed_rows' => $this->processedRows,
                'total_rows' => $this->totalRows,
            ];
        } catch (\Throwable $e) {
            $this->recordError(0, 'Procesamiento', $e->getMessage(), null, 'error');
            $this->carga->update(['Estado_Carga' => 'con_errores']);
            if ($tipoCarga === 'malla' && $this->malla) {
                $this->malla->update(['Estado' => 'borrador']);
            }
            throw $e;
        }
    }

    private function loadSpreadsheetFromField(string $field): Spreadsheet
    {
        $archivo = $this->carga->{$field};

        if (!$archivo) {
            throw new \RuntimeException("El archivo requerido '{$field}' no está disponible para esta carga.");
        }

        $tempDir = storage_path('tmp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $tempPath = tempnam($tempDir, 'malla_xlsx_');

        if (!$tempPath) {
            throw new \RuntimeException('No se pudo crear el archivo temporal para procesar el Excel.');
        }

        try {
            file_put_contents($tempPath, $archivo->Contenido_Archivo);
            
            // Leer solo datos, ignorando imágenes y estilos
            $inputFileType = IOFactory::identify($tempPath);
            $reader = IOFactory::createReader($inputFileType);
            $reader->setReadDataOnly(true);
            
            return $reader->load($tempPath);
        } finally {
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
        }
    }

    /**
     * Procesa archivo de asignaturas con bulk upsert.
     * Optimizado: una sola query de búsqueda + bulk insert de nuevas.
     */
    private function parseAsignaturasFile(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->getSheet(0);
        if (!$sheet) {
            $this->recordError(0, 'Asignaturas', 'Hoja de asignaturas no encontrada.', null, 'error');
            return;
        }

        $rows = $sheet->toArray();
        if (count($rows) < 2) {
            return;
        }

        $batch = []; // Batch de nuevas asignaturas para insertar
        $codigosProcesados = []; // Para detectar duplicados dentro del mismo Excel

        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];

            $codigoOriginal = $this->cleanCodeCell($data[0] ?? null);
            $nombre = $this->cleanCell($data[1] ?? '');
            $creditos = !empty($data[2]) ? (int)$data[2] : 0;
            $horasPresencial = !empty($data[3]) ? (int)$data[3] : null;
            $horasEstudiante = !empty($data[4]) ? (int)$data[4] : null;

            if (empty($codigoOriginal) || empty($nombre)) {
                if (!empty($nombre)) {
                    $this->recordError(
                        $i + 1,
                        'Asignaturas',
                        'Fila incompleta en archivo de asignaturas. Código o nombre inexistente.',
                        $nombre,
                        'error'
                    );
                }
                continue;
            }

            // Normalizar código
            $codigoBase = $this->normalizeCodigo($codigoOriginal);

            // Validar consistencia dentro del mismo Excel (múltiples filas mismo código base)
            if (isset($codigosProcesados[$codigoBase])) {
                $filaAnterior = $codigosProcesados[$codigoBase];
                $this->recordError(
                    $i + 1,
                    'Asignatura',
                    "Código base '{$codigoBase}' aparece múltiples veces en el Excel (fila anterior: {$filaAnterior}).",
                    $codigoOriginal,
                    'error'
                );
                continue;
            }
            $codigosProcesados[$codigoBase] = $i + 1;

            // Verificar si ya existe en BD (usando cache de Codigo_Base)
            if (isset($this->asignaturasCache[$codigoBase])) {
                // Ya existe → solo advertencia si el nombre difiere
                $asignaturaId = $this->asignaturasCache[$codigoBase];
                // Podemos obtener el nombre real haciendo query si needed, pero para performance solo advertimos
                $this->recordWarningIfNameDiffers($asignaturaId, $nombre, $i + 1);
                continue;
            }

            // Agregar a batch para insertar
            $batch[] = [
                'Codigo_Asignatura' => $codigoOriginal,
                'Codigo_Base' => $codigoBase,
                'Nombre_Asignatura' => $nombre,
                'Creditos_Asignatura' => $creditos,
                'Horas_Presencial' => $horasPresencial,
                'Horas_Estudiante' => $horasEstudiante,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Marcar en cache provisional para evitar duplicados en este batch
            $this->asignaturasCache[$codigoBase] = 'PENDING_' . count($batch);
        }

        // Bulk insert en chunks
        $this->bulkInsertAsignaturas($batch);
    }

    /**
     * Procesa archivo de electivas con bulk upsert (similar a asignaturas pero Tipo='electiva').
     */
    private function parseElectivasFile(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->getSheet(0);
        if (!$sheet) {
            $this->recordError(0, 'Electivas', 'Hoja de electivas no encontrada.', null, 'error');
            return;
        }

        $rows = $sheet->toArray();
        if (count($rows) < 2) {
            return;
        }

        $batch = [];
        $codigosProcesados = [];

        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];

            $codigoOriginal = $this->cleanCodeCell($data[0] ?? null);
            $nombre = $this->cleanCell($data[1] ?? '');
            $creditos = !empty($data[2]) ? (int)$data[2] : 0;

            if (empty($codigoOriginal) || empty($nombre)) {
                if (!empty($nombre)) {
                    $this->recordError(
                        $i + 1,
                        'Electivas',
                        'Fila incompleta en archivo de electivas. Código o nombre inexistente.',
                        $nombre,
                        'error'
                    );
                }
                continue;
            }

            $codigoBase = $this->normalizeCodigo($codigoOriginal);

            // Detectar duplicados dentro del Excel
            if (isset($codigosProcesados[$codigoBase])) {
                $filaAnterior = $codigosProcesados[$codigoBase];
                $this->recordError(
                    $i + 1,
                    'Electiva',
                    "Código base '{$codigoBase}' aparece múltiples veces en el Excel (fila anterior: {$filaAnterior}).",
                    $codigoOriginal,
                    'error'
                );
                continue;
            }
            $codigosProcesados[$codigoBase] = $i + 1;

            // Verificar existencia en BD
            if (isset($this->asignaturasCache[$codigoBase])) {
                $asignaturaId = $this->asignaturasCache[$codigoBase];
                $this->recordWarningIfNameDiffers($asignaturaId, $nombre, $i + 1);
                continue;
            }

            $batch[] = [
                'Codigo_Asignatura' => $codigoOriginal,
                'Codigo_Base' => $codigoBase,
                'Nombre_Asignatura' => $nombre,
                'Creditos_Asignatura' => $creditos,
                'Horas_Presencial' => null,
                'Horas_Estudiante' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $this->asignaturasCache[$codigoBase] = 'PENDING_' . count($batch);
        }

        $this->bulkInsertAsignaturas($batch);
    }

    private function parseAgglomerationSheets(Spreadsheet $spreadsheet): void
    {
        $this->parseAgrupaciones($spreadsheet);
    }

    private function parseAgrupaciones(Spreadsheet $spreadsheet): void
    {
        $sheetName = $this->findSheetContaining($spreadsheet, 'Agrupacion');
        if (!$sheetName) {
            return;
        }

        $sheet = $spreadsheet->getSheetByName($sheetName);
        $rows = $sheet->toArray();

        if (count($rows) < 2) {
            return;
        }

        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];

            if (empty($data[2]) || empty($data[3])) {
                continue;
            }

            $componenteNombre = $this->cleanCell($data[0]);
            $agrupacionNombre = $this->cleanCell($data[2]);

            if (empty($componenteNombre) || empty($agrupacionNombre)) {
                continue;
            }

            $componente = Componente::firstOrCreate(
                ['Nombre_Componente' => $componenteNombre]
            );

            $esObligatoria = strtoupper($this->cleanCell($data[1] ?? '')) === 'OBLIGATORIA' ? 1 : 0;
            $creditosRequeridos = !empty($data[3]) ? (int) $data[3] : null;

            Agrupacion::firstOrCreate(
                [
                    'ID_Malla' => $this->malla->ID_Malla,
                    'ID_Componente' => $componente->ID_Componente,
                    'Nombre_Agrupacion' => $agrupacionNombre,
                ],
                [
                    'ID_Malla' => $this->malla->ID_Malla,
                    'ID_Componente' => $componente->ID_Componente,
                    'Nombre_Agrupacion' => $agrupacionNombre,
                    'Creditos_Requeridos' => $creditosRequeridos,
                    'Es_Obligatoria' => $esObligatoria,
                ]
            );
        }
    }

    private function findSheetContaining(Spreadsheet $spreadsheet, string $needle): ?string
    {
        foreach ($spreadsheet->getSheetNames() as $name) {
            if (stripos($name, $needle) !== false) {
                return $name;
            }
        }
        return null;
    }

    /**
     * Parsea la hoja MALLA con optimización bulk.
     * Estrategia: precarga de catálogos en memoria + batch building + bulk inserts.
     */
    private function parseMalla(Spreadsheet $spreadsheet): bool
    {
        $sheetName = $this->findSheetContaining($spreadsheet, 'MALLA');
        if (!$sheetName) {
            $this->recordError(1, 'MALLA', 'No se encontró la hoja MALLA en el archivo');
            return false;
        }

        $sheet = $spreadsheet->getSheetByName($sheetName);
        $rows = $sheet->toArray();

        if (count($rows) < 2) {
            return true;
        }

        $this->totalRows = count($rows) - 1;

        // Crear la malla si no existe (ya no se parsea desde Excel)
        if (!$this->malla) {
            $normativa = Normativa::with(['programa.facultad.sede'])->find($this->carga->ID_Normativa);
            if (!$normativa) {
                $this->recordError(0, 'Malla', 'La carga no tiene normativa asociada.', null, 'error');
                return false;
            }

            $programa = $normativa->programa;
            $facultad = $programa->facultad;
            $sede = $facultad->sede;

            $this->malla = MallaCurricular::create([
                'ID_Normativa' => $normativa->ID_Normativa,
                'ID_Programa' => $programa->ID_Programa,
                'ID_Facultad' => $facultad->ID_Facultad,
                'ID_Sede' => $sede->ID_Sede,
                'Version_Numero' => $this->getNextVersionNumber($programa->ID_Programa),
                'Fecha_Inicio_Vigencia' => now(),
                'Estado' => 'borrador',
                'Es_Vigente' => 0,
            ]);

            $this->carga->update(['ID_Malla' => $this->malla->ID_Malla]);
        }

        // === BATCHES ===
        $batchComponentes = [];    // Nuevos componentes a insertar
        $batchAgrupaciones = [];  // Nuevas agrupaciones
        $batchRelaciones = [];    // agrupacion_asignatura
        $batchRequisitos = [];    // requisitos

        // Maps temporales para IDs de objetos recién creados en este batch
        $componentesTempMap = []; // "Nombre" => tempID (se resolverá post-insert)
        $agrupacionesTempMap = []; // "compID|nombre" => tempID

        $emptyRowCount = 0;
        $maxEmptyRows = 10;

        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];

            if ($this->isRowEmpty($data)) {
                $emptyRowCount++;
                if ($emptyRowCount >= $maxEmptyRows) {
                    break;
                }
                continue;
            }
            $emptyRowCount = 0;

            // Procesar fila y acumular en batches
            $this->accumulateMallaRow($data, $i + 1, $batchComponentes, $batchAgrupaciones, $batchRelaciones, $batchRequisitos, $componentesTempMap, $agrupacionesTempMap);

            $this->processedRows++;
        }

        // === BULK INSERTS (en orden dependiente) ===

        // 1. Insertar nuevos componentes
        if (!empty($batchComponentes)) {
            $this->bulkInsertModel($batchComponentes, 'componentes');
        }

        // 2. Refrescar cache de componentes (incluye los recién insertados)
        $this->componentesCache = Componente::pluck('ID_Componente', 'Nombre_Componente')->toArray();

        // 3. Insertar nuevas agrupaciones
        if (!empty($batchAgrupaciones)) {
            $this->bulkInsertModel($batchAgrupaciones, 'agrupaciones');
        }

        // 4. Refrescar cache de agrupaciones de esta malla
        $agrupaciones = Agrupacion::where('ID_Malla', $this->malla->ID_Malla)
            ->get(['ID_Agrupacion', 'ID_Componente', 'Nombre_Agrupacion']);
        $this->agrupacionesCache = [];
        foreach ($agrupaciones as $agrup) {
            $key = $agrup->ID_Componente . '|' . $agrup->Nombre_Agrupacion;
            $this->agrupacionesCache[$key] = $agrup->ID_Agrupacion;
        }

        // 5. Resolver IDs reales en batchRelaciones (reemplazar temp IDs)
        $this->resolveRelacionIds($batchRelaciones);

        // 6. Insertar relaciones agrupacion_asignatura
        if (!empty($batchRelaciones)) {
            $this->bulkInsertModel($batchRelaciones, 'agrupacion_asignatura');
        }

        // 7. Insertar requisitos
        if (!empty($batchRequisitos)) {
            $this->bulkInsertModel($batchRequisitos, 'requisitos');
        }

        return count($this->errors) === 0;
    }

    /**
     * Acumula una fila de la hoja MALLA en los batches.
     * No hace queries, solo construye arrays.
     */
    private function accumulateMallaRow(
        array $data,
        int $rowNumber,
        array &$batchComponentes,
        array &$batchAgrupaciones,
        array &$batchRelaciones,
        array &$batchRequisitos,
        array &$compTempMap,
        array &$agrupTempMap
    ): void {
        $componenteNombre = $this->cleanCell($data[1] ?? '');
        $agrupacionNombre = $this->cleanCell($data[2] ?? '');
        $codigo = $this->cleanCodeCell($data[3] ?? null);
        $nombreAsignatura = $this->cleanCell($data[4] ?? '');

        if (empty($codigo)) {
            $this->recordError($rowNumber, 'Código Asignatura', 'Fila sin código de asignatura', $nombreAsignatura ?: 'Sin nombre', 'error');
            return;
        }

        // Resolver asignatura (puede ser existente o nueva)
        $asignatura = $this->resolveAsignatura($codigo, $nombreAsignatura, $data[5] ?? null, $rowNumber, 'regular');
        if (!$asignatura) {
            $this->recordError($rowNumber, 'Asignatura', 'No se pudo resolver la asignatura', "codigo: {$codigo}, nombre: {$nombreAsignatura}", 'error');
            return;
        }

        // Componente
        if (empty($componenteNombre)) {
            $this->recordError($rowNumber, 'Componente', 'Componente vacío', $codigo, 'error');
            return;
        }

        $componenteKey = $componenteNombre;
        if (!isset($this->componentesCache[$componenteKey])) {
            // No existe → agregar a batch
            $batchComponentes[] = [
                'Nombre_Componente' => $componenteNombre,
                'Descripcion_Componente' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            // Asignar ID temporal (último + offset)
            $tempId = count($batchComponentes) * -1; // negativo para identificar temporales
            $compTempMap[$componenteKey] = $tempId;
            $this->componentesCache[$componenteKey] = $tempId; // provisional
        }

        $componenteId = $this->componentesCache[$componenteKey];

        // Agrupación
        if (empty($agrupacionNombre)) {
            $this->recordError($rowNumber, 'Agrupación', 'Agrupación vacía', $codigo, 'error');
            return;
        }

        $agrupKey = $componenteId . '|' . $agrupacionNombre;
        if (!isset($this->agrupacionesCache[$agrupKey])) {
            // No existe → agregar a batch
            $batchAgrupaciones[] = [
                'ID_Malla' => $this->malla->ID_Malla,
                'ID_Componente' => is_int($componenteId) ? $componenteId : null, // se resolverá después
                'Nombre_Agrupacion' => $agrupacionNombre,
                'Creditos_Requeridos' => null,
                'Es_Obligatoria' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $tempAgrupId = count($batchAgrupaciones) * -1;
            $agrupTempMap[$agrupKey] = $tempAgrupId;
            $this->agrupacionesCache[$agrupKey] = $tempAgrupId;
        }

        // Nota: los IDs reales se resolverán después de los inserts

        // Relación agrupacion_asignatura
        $tipoAsignatura = $this->mapObligatoria($data[6] ?? '');
        $semestre = !empty($data[7]) ? (int)$data[7] : null;

        $batchRelaciones[] = [
            'ID_Agrupacion' => $agrupKey, // temporal, se resolverá después
            'ID_Asignatura' => $asignatura->ID_Asignatura,
            'Tipo_Asignatura' => $tipoAsignatura,
            'Semestre_Sugerido' => $semestre,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $this->asignaturasProcessed[$asignatura->Codigo_Asignatura] = true;

        // Requisitos
        $this->processRequisitoBatch(
            $batchRelaciones[count($batchRelaciones) - 1],
            $data[8] ?? null,
            $data[9] ?? null,
            $rowNumber,
            $batchRequisitos
        );
    }

    private function isRowEmpty(array $row): bool
    {
        foreach ($row as $cell) {
            if (!empty($cell)) {
                return false;
            }
        }
        return true;
    }

    
    /**
     * Resuelve una asignatura: busca por Codigo_Base (cache) o crea nueva.
     * Para carga malla, Tipo_Asignatura se determina según el archivo de origen.
     * NOTA: No actualiza asignaturas existentes (solo warning si nombre difiere).
     *
     * @param string $codigoOriginal Código tal como viene del Excel
     * @param string $nombre Nombre de la asignatura
     * @param float|int|null $creditos Créditos (puede venir del Excel)
     * @param int $rowNumber Número de fila para logs
     * @param string $tipo 'regular' o 'electiva'
     * @return Asignatura
     */
    private function resolveAsignatura(string $codigoOriginal, string $nombre, $creditos, int $rowNumber, string $tipo = 'regular'): ?Asignatura
    {
        $codigoBase = $this->normalizeCodigo($codigoOriginal);

        // 1. Buscar en cache
        if (isset($this->asignaturasCache[$codigoBase])) {
            $cachedId = $this->asignaturasCache[$codigoBase];

            // Si es un ID entero, existe en BD
            if (is_int($cachedId)) {
                $asignatura = Asignatura::find($cachedId);
                if ($asignatura) {
                    // Validar nombre (solo warning)
                    $this->recordWarningIfNameDiffers($cachedId, $nombre, $rowNumber);
                    return $asignatura;
                }
            }

            // Si es 'PENDING_X', está en batch pendiente de insertar
            // Retornar null y se resolverá después del bulk insert
            return null;
        }

        // 2. No existe ni en cache ni en BD (raro, pero posible)
        // Crear directamente (secuencial, no bulk). Esto es para casos的边缘
        try {
            $asignatura = Asignatura::create([
                'Codigo_Asignatura' => $codigoOriginal,
                'Codigo_Base' => $codigoBase,
                'Nombre_Asignatura' => $nombre,
                'Creditos_Asignatura' => (int)$creditos,
                'Horas_Presencial' => $tipo === 'regular' ? 0 : null, // temporal, se rellenará después si hay datos
                'Horas_Estudiante' => $tipo === 'regular' ? 0 : null,
            ]);

            // Actualizar cache
            $this->asignaturasCache[$codigoBase] = $asignatura->ID_Asignatura;

            return $asignatura;
        } catch (\Throwable $e) {
            $this->recordError($rowNumber, 'Asignatura', 'Error al crear asignatura: ' . $e->getMessage(), $codigoOriginal, 'error');
            return null;
        }
    }

    private function resolveComponente(string $nombre, int $rowNumber): ?Componente
    {
        if (empty($nombre)) {
            $this->recordError($rowNumber, 'Componente', 'Componente vacío', null, 'error');
            return null;
        }

        return Componente::firstOrCreate(
            ['Nombre_Componente' => $this->cleanCell($nombre)]
        );
    }

    private function resolveAgrupacion(int $componenteId, string $nombre, int $rowNumber): ?Agrupacion
    {
        if (empty($nombre)) {
            $this->recordError($rowNumber, 'Agrupación', 'Agrupación vacía', null, 'error');
            return null;
        }

        return Agrupacion::firstOrCreate(
            [
                'ID_Malla' => $this->malla->ID_Malla,
                'ID_Componente' => $componenteId,
                'Nombre_Agrupacion' => $this->cleanCell($nombre),
            ],
            [
                'ID_Malla' => $this->malla->ID_Malla,
                'ID_Componente' => $componenteId,
                'Nombre_Agrupacion' => $this->cleanCell($nombre),
                'Es_Obligatoria' => 0,
            ]
        );
    }

    private function mapObligatoria(string $valor): string
    {
        $valorLimpio = strtoupper($this->cleanCell($valor));

        if ($valorLimpio === 'SI') {
            return 'obligatoria';
        }

        if ($valorLimpio === 'NO') {
            return 'optativa';
        }

        return 'optativa';
    }

    /**
     * Pre-carga todos los catálogos necesarios en memoria (cache).
     * Para carga de tipo 'malla'.
     */
    private function preloadCatalogs(): void
    {
        // 1. Cache de asignaturas existentes (por Codigo_Base)
        $this->asignaturasCache = Asignatura::pluck('ID_Asignatura', 'Codigo_Base')
            ->toArray();

        // 2. Cache de componentes (por nombre)
        $this->componentesCache = Componente::pluck('ID_Componente', 'Nombre_Componente')
            ->toArray();

        // 3. Cache de agrupaciones existentes de esta malla
        // Key: "ID_Componente|Nombre_Agrupacion" => ID_Agrupacion
        $agrupaciones = Agrupacion::where('ID_Malla', $this->malla->ID_Malla)
            ->get(['ID_Agrupacion', 'ID_Componente', 'Nombre_Agrupacion']);

        foreach ($agrupaciones as $agrup) {
            $key = $agrup->ID_Componente . '|' . $agrup->Nombre_Agrupacion;
            $this->agrupacionesCache[$key] = $agrup->ID_Agrupacion;
        }
    }

    /**
     * Pre-carga solo asignaturas (para cargas de tipo 'asignaturas' y 'electivas').
     */
    private function preloadAsignaturasCache(): void
    {
        $this->asignaturasCache = Asignatura::pluck('ID_Asignatura', 'Codigo_Base')
            ->toArray();
    }

    /**
     * Busca una asignatura por Codigo_Base usando el cache.
     * Retorna ID_Asignatura o null.
     */
    private function buscarAsignaturaPorCodigoBase(string $codigoBase): ?int
    {
        if (isset($this->asignaturasCache[$codigoBase])) {
            $id = $this->asignaturasCache[$codigoBase];
            return is_int($id) ? $id : null;
        }

        // Fallback: query directa
        $asignatura = Asignatura::where('Codigo_Base', $codigoBase)->first();
        if ($asignatura) {
            $this->asignaturasCache[$codigoBase] = $asignatura->ID_Asignatura;
            return $asignatura->ID_Asignatura;
        }

        return null;
    }

    /**
     * Normaliza un código usando CodeNormalizationService.
     */
    private function normalizeCodigo($codigo): string
    {
        return CodeNormalizationService::normalize($codigo);
    }

    /**
     * Bulk insert de asignaturas con transacción.
     */
    private function bulkInsertAsignaturas(array $batch): void
    {
        if (empty($batch)) {
            return;
        }

        $chunks = array_chunk($batch, self::BATCH_SIZE);

        foreach ($chunks as $chunk) {
            try {
                DB::transaction(function () use ($chunk) {
                    Asignatura::insert($chunk);
                });
            } catch (\Throwable $e) {
                $this->recordError(
                    0,
                    'Asignatura',
                    'Error en batch insert de asignaturas: ' . $e->getMessage(),
                    null,
                    'error'
                );
            }
        }
    }

    /**
     * Bulk insert genérico para otras tablas.
     */
    private function bulkInsertModel(array $batch, string $table): void
    {
        if (empty($batch)) {
            return;
        }

        $chunks = array_chunk($batch, self::BATCH_SIZE);

        foreach ($chunks as $chunk) {
            try {
                DB::transaction(function () use ($chunk, $table) {
                    DB::table($table)->insert($chunk);
                });
            } catch (\Throwable $e) {
                $this->recordError(
                    0,
                    ucfirst($table),
                    'Error en bulk insert de ' . $table . ': ' . $e->getMessage(),
                    null,
                    'error'
                );
            }
        }
    }

    /**
     * Resuelve IDs reales de agrupaciones después del insert.
     */
    private function resolveRelacionIds(array &$batchRelaciones): void
    {
        foreach ($batchRelaciones as &$rel) {
            $agrupKey = $rel['ID_Agrupacion'];
            if (isset($this->agrupacionesCache[$agrupKey])) {
                $realId = $this->agrupacionesCache[$agrupKey];
                if (is_int($realId)) {
                    $rel['ID_Agrupacion'] = $realId;
                } else {
                    // Temporal: buscar recién insertado
                    $keyParts = explode('|', $agrupKey);
                    $componentePart = $keyParts[0];
                    $nombreAgrup = $keyParts[1] ?? '';

                    $componenteId = is_int($componentePart) ? $componentePart
                        : (int)str_replace('PENDING_', '', $componentePart);

                    $agrup = Agrupacion::where('ID_Malla', $this->malla->ID_Malla)
                        ->where('Nombre_Agrupacion', $nombreAgrup)
                        ->where('ID_Componente', $componenteId)
                        ->orderBy('ID_Agrupacion', 'desc')
                        ->first();

                    if ($agrup) {
                        $rel['ID_Agrupacion'] = $agrup->ID_Agrupacion;
                        $this->agrupacionesCache[$agrupKey] = $agrup->ID_Agrupacion;
                    }
                }
            }
            unset($rel);
        }
    }


    /**
     * Registra advertencia si el nombre de la asignatura difiere del catálogo.
     * Optimizado: evita query adicional si ya tenemos el objeto en cache.
     */
    private function recordWarningIfNameDiffers(int $asignaturaId, string $nombreExcel, int $fila): void
    {
        $asignatura = Asignatura::find($asignaturaId);
        if (!$asignatura) return;

        if ($asignatura->Nombre_Asignatura !== $this->cleanCell($nombreExcel)) {
            $this->recordError(
                $fila,
                'Asignatura',
                'El nombre en el Excel difiere del catálogo existente.',
                "Excel: {$nombreExcel}, BD: {$asignatura->Nombre_Asignatura}",
                'advertencia'
            );
        }
    }

    private function cleanCell($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $cleaned = trim(str_replace(["\n", "\r", "\t"], ' ', (string) $value));
        $cleaned = preg_replace('/\s+/', ' ', $cleaned);

        if ($cleaned === '' || $cleaned === null) {
            return null;
        }

        return $this->sanitizeUtf8($cleaned);
    }

    private function sanitizeUtf8(string $value): string
    {
        // Convertir a UTF-8 ignorando secuencias inválidas
        $converted = @iconv('UTF-8', 'UTF-8//IGNORE', $value);
        if ($converted === false) {
            return '';
        }
        // Eliminar caracteres de control no imprimibles (excepto \n, \r, \t)
        $converted = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $converted);
        return $converted;
    }

    private function cleanCodeCell($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $value = $this->cleanCell($value);

        if ($value === null) {
            return null;
        }

        if (is_numeric($value)) {
            $value = (string) $value;
        }

        if (strpos($value, '.') !== false) {
            $value = explode('.', $value)[0];
        }

        return $value ?: null;
    }

    private function recordError(
        int $fila,
        string $columna,
        string $mensaje,
        ?string $valor = null,
        string $severidad = 'error'
    ): void {
        ErrorCarga::create([
            'ID_Carga' => $this->carga->ID_Carga,
            'Fila_Error' => $fila,
            'Columna_Error' => $columna,
            'Mensaje_Error' => $mensaje,
            'Valor_Recibido' => $valor,
            'Severidad_Error' => $severidad,
        ]);

        if ($severidad === 'error') {
            $this->errors[] = ['fila' => $fila, 'columna' => $columna, 'mensaje' => $mensaje];
        } else {
            $this->warnings[] = ['fila' => $fila, 'columna' => $columna, 'mensaje' => $mensaje];
        }
    }

    private function updateCargaStatus(): void
    {
        $hasErrors = ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)
            ->where('Severidad_Error', 'error')
            ->exists();

        $estadoCarga = $hasErrors ? 'con_errores' : 'borrador';

        $this->carga->update([
            'Estado_Carga' => $estadoCarga,
            'Finalizacion_Carga' => now(),
        ]);

        if (isset($this->malla) && $this->malla) {
            $this->malla->update([
                'Estado' => 'borrador',
            ]);
        }

        $archivoRelations = [
            $this->carga->archivoAsignaturas,
            $this->carga->archivoElectivas,
            $this->carga->archivoMalla,
        ];

        foreach ($archivoRelations as $archivo) {
            if ($archivo) {
                $archivo->update([
                    'Estado_Procesamiento' => 'exitoso',
                ]);
            }
        }
    }

    /**
     * Procesa requisitos para una relación agrupación-asignatura en batch.
     */
    private function processRequisitoBatch(array $relacion, ?string $reqTipo, ?string $reqCodigo, int $rowNumber, array &$batchRequisitos): void
    {
        if (empty($reqTipo) && empty($reqCodigo)) {
            return;
        }

        $reqCodigo = $this->cleanCodeCell($reqCodigo);
        if (empty($reqCodigo)) {
            return;
        }

        // Buscar asignatura requisito por código base
        $asignaturaReqId = $this->buscarAsignaturaPorCodigoBase($this->normalizeCodigo($reqCodigo));
        if (!$asignaturaReqId) {
            $this->recordError(
                $rowNumber,
                'Requisito',
                'Asignatura requisito no encontrada: ' . $reqCodigo,
                $reqCodigo,
                'advertencia'
            );
            return;
        }

        $batchRequisitos[] = [
            'ID_Agrupacion_Asignatura' => null, // Se resolverá después del insert
            'ID_Asignatura_Requisito' => $asignaturaReqId,
            'Tipo_Requisito' => $this->mapTipoRequisito($reqTipo),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * Procesa requisitos para una relación agrupación-asignatura individual.
     */
    private function processRequisito(AgrupacionAsignatura $relacion, ?string $reqTipo, ?string $reqCodigo, int $rowNumber): void
    {
        if (empty($reqTipo) && empty($reqCodigo)) {
            return;
        }

        $reqCodigo = $this->cleanCodeCell($reqCodigo);
        if (empty($reqCodigo)) {
            return;
        }

        // Buscar asignatura requisito por código base
        $asignaturaReqId = $this->buscarAsignaturaPorCodigoBase($this->normalizeCodigo($reqCodigo));
        if (!$asignaturaReqId) {
            $this->recordError(
                $rowNumber,
                'Requisito',
                'Asignatura requisito no encontrada: ' . $reqCodigo,
                $reqCodigo,
                'advertencia'
            );
            return;
        }

        Requisito::create([
            'ID_Agrupacion_Asignatura' => $relacion->ID_Agrupacion_Asignatura,
            'ID_Asignatura_Requisito' => $asignaturaReqId,
            'Tipo_Requisito' => $this->mapTipoRequisito($reqTipo),
        ]);
    }

    /**
     * Mapea el tipo de requisito desde el Excel.
     */
    private function mapTipoRequisito(?string $tipo): string
    {
        $tipoLimpio = strtoupper($this->cleanCell($tipo));

        if ($tipoLimpio === 'OBLIGATORIO' || $tipoLimpio === 'REQUERIDO') {
            return 'obligatorio';
        }

        return 'opcional';
    }

    /**
     * Obtiene el siguiente número de versión para un programa.
     */
    private function getNextVersionNumber(int $programaId): int
    {
        $ultimaVersion = MallaCurricular::where('ID_Programa', $programaId)
            ->max('Version_Numero');

        return ($ultimaVersion ?? 0) + 1;
    }

    /**
     * Resuelve ID de componente por nombre o ID.
     */
    private function resolveComponenteId($componenteValue): ?int
    {
        if (empty($componenteValue)) {
            return null;
        }

        // Si es numérico, asumir que es ID
        if (is_numeric($componenteValue)) {
            return (int) $componenteValue;
        }

        // Buscar por nombre
        if (isset($this->componentesCache[$componenteValue])) {
            return $this->componentesCache[$componenteValue];
        }

        // Buscar en BD si no está en cache
        $componente = Componente::where('Nombre_Componente', $componenteValue)->first();
        if ($componente) {
            $this->componentesCache[$componenteValue] = $componente->ID_Componente;
            return $componente->ID_Componente;
        }

        return null;
    }

    /**
     * Resuelve ID de agrupación por nombre o ID, dentro de un componente y malla.
     */
    private function resolveAgrupacionId($agrupacionValue, int $componenteId): ?int
    {
        if (empty($agrupacionValue)) {
            return null;
        }

        // Si es numérico, asumir que es ID
        if (is_numeric($agrupacionValue)) {
            return (int) $agrupacionValue;
        }

        // Buscar por nombre dentro del componente y malla actual
        $key = $componenteId . '|' . $agrupacionValue;
        if (isset($this->agrupacionesCache[$key])) {
            return $this->agrupacionesCache[$key];
        }

        // Buscar en BD si no está en cache
        $agrupacion = Agrupacion::where('ID_Malla', $this->malla->ID_Malla)
            ->where('ID_Componente', $componenteId)
            ->where('Nombre_Agrupacion', $agrupacionValue)
            ->first();

        if ($agrupacion) {
            $this->agrupacionesCache[$key] = $agrupacion->ID_Agrupacion;
            return $agrupacion->ID_Agrupacion;
        }

        return null;
    }

    /**
     * Mapea el campo "Obligatoria" a Tipo_Asignatura contextual.
     */
    private function mapTipoAsignatura(?string $obligatoria): string
    {
        $valorLimpio = strtoupper($this->cleanCell($obligatoria));
        
        return ($valorLimpio === 'SI') ? 'regular' : 'electiva';
    }

    /**
     * Procesa una fila del archivo de mallas.
     */
    private function processMallaRow(array $data, int $rowNumber): void
    {
        // Extraer datos de las columnas
        $normativaId = $this->cleanCell($data[0] ?? null);
        $componenteValue = $this->cleanCell($data[1] ?? null);
        $agrupacionValue = $this->cleanCell($data[2] ?? null);
        $codigoAsignatura = $this->cleanCodeCell($data[3] ?? null);
        $obligatoria = $this->cleanCell($data[4] ?? null);
        $tipoRequisito = $this->cleanCell($data[5] ?? null);
        $codigoRequisito = $this->cleanCodeCell($data[6] ?? null);
        $semestre = $this->cleanCell($data[7] ?? null);

        // Validaciones básicas
        if (empty($codigoAsignatura)) {
            $this->recordError($rowNumber, 'Malla', 'Código de asignatura vacío', null, 'error');
            return;
        }

        // Resolver IDs
        $componenteId = $this->resolveComponenteId($componenteValue);
        if (!$componenteId) {
            $this->recordError($rowNumber, 'Malla', "Componente no encontrado: {$componenteValue}", $codigoAsignatura, 'error');
            return;
        }

        $agrupacionId = $this->resolveAgrupacionId($agrupacionValue, $componenteId);
        if (!$agrupacionId) {
            $this->recordError($rowNumber, 'Malla', "Agrupación no encontrada: {$agrupacionValue}", $codigoAsignatura, 'error');
            return;
        }

        // Obtener o crear asignatura
        $asignatura = $this->resolveAsignatura($codigoAsignatura, '', 0, $rowNumber);
        if (!$asignatura) {
            $this->recordError($rowNumber, 'Malla', "No se pudo resolver asignatura: {$codigoAsignatura}", $codigoAsignatura, 'error');
            return;
        }

        // Crear o actualizar relación agrupación-asignatura
        $tipoAsignatura = $this->mapTipoAsignatura($obligatoria);
        $semestreNum = is_numeric($semestre) ? (int) $semestre : null;

        $relacion = AgrupacionAsignatura::updateOrCreate([
            'ID_Agrupacion' => $agrupacionId,
            'ID_Asignatura' => $asignatura->ID_Asignatura,
        ], [
            'Tipo_Asignatura' => $tipoAsignatura,
            'Semestre_Sugerido' => $semestreNum,
        ]);

        // Procesar requisitos si existen
        if (!empty($tipoRequisito) || !empty($codigoRequisito)) {
            $this->processRequisito($relacion, $tipoRequisito, $codigoRequisito, $rowNumber);
        }
    }

    /**
     * Procesa el archivo de mallas curriculares.
     */
    public function processMallaFile($filePath): bool
    {
        try {
            $spreadsheet = IOFactory::load($filePath);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            if (count($rows) < 2) {
                $this->recordError(0, 'Malla', 'El archivo no tiene datos suficientes', null, 'error');
                return false;
            }

            $this->totalRows = count($rows) - 1;

            // Crear la malla si no existe
            if (!$this->malla) {
                $normativa = Normativa::with(['programa.facultad.sede'])->find($this->carga->ID_Normativa);
                if (!$normativa) {
                    $this->recordError(0, 'Malla', 'La carga no tiene normativa asociada', null, 'error');
                    return false;
                }

                $programa = $normativa->programa;
                $facultad = $programa->facultad;
                $sede = $facultad->sede;

                $this->malla = MallaCurricular::create([
                    'ID_Normativa' => $normativa->ID_Normativa,
                    'ID_Programa' => $programa->ID_Programa,
                    'ID_Facultad' => $facultad->ID_Facultad,
                    'ID_Sede' => $sede->ID_Sede,
                    'Version_Numero' => $this->getNextVersionNumber($programa->ID_Programa),
                    'Fecha_Inicio_Vigencia' => now(),
                    'Estado' => 'borrador',
                    'Es_Vigente' => 0,
                ]);
            }

            // Pre-cargar catálogos necesarios
            $this->preloadCatalogs();

            // Procesar cada fila (omitir encabezado)
            for ($i = 1; $i < count($rows); $i++) {
                $this->processMallaRow($rows[$i], $i + 1);
            }

            return true;

        } catch (\Throwable $e) {
            $this->recordError(0, 'Malla', 'Error procesando archivo: ' . $e->getMessage(), null, 'error');
            return false;
        }
    }
}