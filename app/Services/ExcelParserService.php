<?php

namespace App\Services;

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Asignatura;
use App\Models\CargaMalla;
use App\Models\Componente;
use App\Models\ErrorCarga;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use App\Models\Requisito;
use App\Models\SlotAgrupacion;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class ExcelParserService
{
    private CargaMalla $carga;

    private ?MallaCurricular $malla = null;

    private array $errors = [];

    private array $warnings = [];

    private array $asignaturasProcessed = [];

    private int $totalRows = 0;

    private int $processedRows = 0;

    // Cache de catálogos para evitar N+1 queries
    private array $asignaturasCache = [];      // Codigo_Base => ID_Asignatura

    private array $componentesCache = [];      // Nombre_Componente => ID_Componente

    private array $agrupacionesCache = [];     // "ID_Malla|ID_Componente|Nombre" => ID_Agrupacion

    private array $processedRels = [];

    private array $processedReqs = [];

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
            if (! $this->carga->ID_Archivo_Malla) {
                $this->recordError(
                    0,
                    'Carga',
                    'Falta el archivo principal de la malla.',
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

            // Si no hay malla ID en la carga, la crearemos en prepareMalla
            if ($this->carga->ID_Malla) {
                $this->malla = MallaCurricular::find($this->carga->ID_Malla);
            }
        } elseif ($tipoCarga === 'asignaturas') {
            if (! $this->carga->ID_Archivo_Asignaturas) {
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
            if (! $this->carga->ID_Archivo_Electivas) {
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
        } elseif ($tipoCarga === 'optativa') {
            if (! $this->carga->ID_Archivo_Electivas) {
                $this->recordError(0, 'Carga', 'Falta el archivo de optativas.', null, 'error');
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
                $mallaSpreadsheet = $this->loadSpreadsheetFromField('archivoMalla');
                if (! $this->prepareMalla($mallaSpreadsheet)) {
                    return [
                        'success' => false,
                        'errors_count' => count($this->errors),
                        'warnings_count' => count($this->warnings),
                        'processed_rows' => $this->processedRows,
                        'total_rows' => $this->totalRows,
                    ];
                }

                // Pre-cargar catálogos DESPUÉS de asegurar que $this->malla existe
                $this->preloadCatalogs();

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
            } elseif ($tipoCarga === 'optativa') {
                $this->preloadAsignaturasCache();
                $optativaSpreadsheet = $this->loadSpreadsheetFromField('archivoElectivas');
                $this->parseOptativaFile($optativaSpreadsheet);
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

        if (! $archivo) {
            throw new \RuntimeException("El archivo requerido '{$field}' no está disponible para esta carga.");
        }

        $tempDir = storage_path('tmp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $tempPath = tempnam($tempDir, 'malla_xlsx_');

        if (! $tempPath) {
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
        if (! $sheet) {
            $this->recordError(0, 'Asignaturas', 'Hoja de asignaturas no encontrada.', null, 'error');

            return;
        }

        $rows = $sheet->toArray();
        if (count($rows) < 2) {
            return;
        }

        $this->validateAsignaturasHeaders($rows[0]);

        $batch = []; // Batch de nuevas asignaturas para insertar
        $codigosProcesados = []; // Para detectar duplicados dentro del mismo Excel

        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];

            $codigoOriginal = $this->cleanCodeCell($data[0] ?? null);
            $nombreRaw = $this->cleanCell($data[1] ?? '');
            $nombre = $nombreRaw !== null ? $this->normalizeNombreAsignatura($nombreRaw) : null;
            $creditos = ! empty($data[2]) ? (int) $data[2] : 0;
            $horasPresencial = ! empty($data[3]) ? (int) $data[3] : null;
            $horasEstudiante = ! empty($data[4]) ? (int) $data[4] : null;

            if (empty($codigoOriginal) || empty($nombre)) {
                if (! empty($nombreRaw)) {
                    $this->recordError(
                        $i + 1,
                        'Asignaturas',
                        'Fila incompleta en archivo de asignaturas. Código o nombre inexistente.',
                        $nombreRaw,
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
            $this->asignaturasCache[$codigoBase] = 'PENDING_'.count($batch);
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
        if (! $sheet) {
            $this->recordError(0, 'Electivas', 'Hoja de electivas no encontrada.', null, 'error');

            return;
        }

        $rows = $sheet->toArray();
        if (count($rows) < 2) {
            return;
        }

        $this->validateAsignaturasHeaders($rows[0]);

        $batch = [];
        $codigosProcesados = [];

        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];

            $codigoOriginal = $this->cleanCodeCell($data[0] ?? null);
            $nombreRaw = $this->cleanCell($data[1] ?? '');
            $nombre = $nombreRaw !== null ? $this->normalizeNombreAsignatura($nombreRaw) : null;
            $creditos = ! empty($data[2]) ? (int) $data[2] : 0;

            if (empty($codigoOriginal) || empty($nombre)) {
                if (! empty($nombreRaw)) {
                    $this->recordError(
                        $i + 1,
                        'Electivas',
                        'Fila incompleta en archivo de electivas. Código o nombre inexistente.',
                        $nombreRaw,
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

            $this->asignaturasCache[$codigoBase] = 'PENDING_'.count($batch);
        }

        $this->bulkInsertAsignaturas($batch);

        // Marcar todas las asignaturas procesadas como electivas de libre elección
        if (! empty($codigosProcesados)) {
            DB::table('asignaturas')
                ->whereIn('Codigo_Base', array_map('strval', array_keys($codigosProcesados)))
                ->update(['es_electiva_libre' => true, 'updated_at' => now()]);
        }
    }

    /**
     * Procesa FORMATO DE CARGA - OPTATIVA.xlsx.
     *
     * Estructura por fila (a partir de fila 2):
     *   Col 0: Codigo_Programa  Col 1: ID_Componente  Col 2: ID_Plantilla_Agrupacion
     *   Col 3: Codigo           Col 4: Nombre         Col 5: Creditos  Col 6: Obligatoria
     *   Col 7: Codigo_Requisito (o '-')  Col 8: Nombre_Requisito (referencia o texto condición)
     *   Col 9: Tipo_Requisito
     *
     * Una asignatura con múltiples requisitos ocupa una fila por requisito.
     * Filas con Col 3 null son separadores y se omiten.
     * El mismo archivo puede contener múltiples programas.
     */
    private function parseOptativaFile(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->getSheet(0);
        if (! $sheet) {
            $this->recordError(0, 'Optativa', 'Hoja de optativas no encontrada.', null, 'error');

            return;
        }

        $rows = $sheet->toArray();
        if (count($rows) < 2) {
            return;
        }

        $batch = [];
        $codigosPorPrograma = [];
        $codigosProcesados = []; // prog|codigoBase => fila primera ocurrencia
        $programasCache = []; // Codigo_Programa => ID_Programa|null
        $optativaGroupMeta = []; // [programaId][codigoBase] => ['ID_Componente'=>..., 'ID_Plantilla_Agrupacion'=>...]
        // Cada entrada: [codigoBase, programaId, tipoReq, reqCodigo|null, esTexto, descripcion|null, fila]
        $requisitosData = [];

        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];

            $codigoPrograma = ! empty($data[0]) ? trim((string) $this->cleanCodeCell($data[0])) : null;
            $componenteId = ! empty($data[1]) ? (int) $data[1] : null;
            $plantillaId = ! empty($data[2]) ? (int) $data[2] : null;
            $codigoOriginal = $this->cleanCodeCell($data[3] ?? null);
            $nombreRaw = $this->cleanCell($data[4] ?? '');
            $nombre = $nombreRaw !== null ? $this->normalizeNombreAsignatura($nombreRaw) : null;
            $creditos = ! empty($data[5]) ? (int) $data[5] : 0;

            if (empty($codigoOriginal) || empty($nombre)) {
                continue;
            }

            if (! $codigoPrograma) {
                $this->recordError($i + 1, 'Optativa', 'Fila sin código de programa.', $codigoOriginal, 'advertencia');

                continue;
            }

            if (! array_key_exists($codigoPrograma, $programasCache)) {
                $prog = Programa::where('Codigo_Programa', $codigoPrograma)->first(['ID_Programa']);
                $programasCache[$codigoPrograma] = $prog?->ID_Programa;
            }
            $programaId = $programasCache[$codigoPrograma];

            if (! $programaId) {
                $this->recordError($i + 1, 'Optativa', "Programa con código '{$codigoPrograma}' no encontrado en la base de datos.", $codigoOriginal, 'error');

                continue;
            }

            $codigoBase = $this->normalizeCodigo($codigoOriginal);
            $key = $programaId.'|'.$codigoBase;

            // Primera ocurrencia: registrar asignatura y vincular al programa
            if (! isset($codigosProcesados[$key])) {
                $codigosProcesados[$key] = $i + 1;

                if (! isset($codigosPorPrograma[$programaId])) {
                    $codigosPorPrograma[$programaId] = [];
                }
                $codigosPorPrograma[$programaId][] = $codigoBase;
                $optativaGroupMeta[$programaId][$codigoBase] = [
                    'ID_Componente' => $componenteId,
                    'ID_Plantilla_Agrupacion' => $plantillaId,
                ];

                if (! isset($this->asignaturasCache[$codigoBase])) {
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
                    $this->asignaturasCache[$codigoBase] = 'PENDING_'.count($batch);
                }
            }

            // Todas las ocurrencias: recolectar prerequisito de esta fila
            // Col 7 = código req (puede ser '-' o vacío), Col 8 = nombre/texto, Col 9 = tipo
            $rCodigo = $this->cleanCodeCell($data[7] ?? null);
            $rNombre = $this->cleanCell($data[8] ?? null);
            $rTipo = $this->cleanCell($data[9] ?? null);

            $tipoValido = ! empty($rTipo) && $rTipo !== '-';

            if (! $tipoValido) {
                continue; // fila sin requisito
            }

            if (! empty($rCodigo) && $rCodigo !== '-') {
                // Requisito referenciado por código de asignatura
                $requisitosData[] = [$codigoBase, $programaId, $rTipo, $rCodigo, false, null, $i + 1];
            } elseif (! empty($rNombre) && $rNombre !== '-') {
                // Requisito de texto (condición de créditos o nombre sin código)
                $requisitosData[] = [$codigoBase, $programaId, $rTipo, null, true, $rNombre, $i + 1];
            }
        }

        $this->bulkInsertAsignaturas($batch);
        $this->preloadAsignaturasCache();

        if (! empty($this->errors)) {
            return;
        }

        // Vincular cada programa a sus asignaturas y, si es posible, crear vínculos hacia la malla vigente.
        foreach ($codigosPorPrograma as $programaId => $codigos) {
            $this->vincularElectivasAPrograma($programaId, $codigos);
            $this->persistOptativaAgrupacionLinkages($programaId, $codigos, $optativaGroupMeta[$programaId] ?? []);
        }

        // Insertar requisitos
        if (! empty($requisitosData)) {
            $batchRequisitos = [];
            $seenInBatch = [];

            // Cargar requisitos ya existentes para estos programas (dedup en re-subida)
            $programaIdsAfectados = array_unique(array_column($requisitosData, 1));
            $requisitosExistentes = DB::table('requisitos')
                ->whereIn('ID_Programa', $programaIdsAfectados)
                ->select('ID_Asignatura', 'ID_Programa', 'ID_Asignatura_Requerida', 'Descripcion_Requisito')
                ->get()
                ->mapWithKeys(fn ($r) => [
                    "{$r->ID_Asignatura}|{$r->ID_Programa}|".
                    ($r->ID_Asignatura_Requerida ?? 'null').'|'.
                    ($r->Descripcion_Requisito ?? '') => true,
                ])
                ->all();

            foreach ($requisitosData as [$codigoBase, $programaId, $tipoReq, $reqCodigo, $esTexto, $descripcion, $rowNumber]) {
                $asignaturaId = $this->asignaturasCache[$codigoBase] ?? null;
                if (! is_int($asignaturaId)) {
                    continue;
                }

                if ($esTexto) {
                    // Requisito de texto: condición de créditos u otro
                    $tipoMapeado = $this->isConditionRequirement($descripcion)
                        ? 'creditos'
                        : $this->mapTipoRequisito($tipoReq);

                    $dupKey = "{$asignaturaId}|{$programaId}|null|{$descripcion}";
                    if (isset($requisitosExistentes[$dupKey]) || isset($seenInBatch[$dupKey])) {
                        continue;
                    }
                    $seenInBatch[$dupKey] = true;

                    $batchRequisitos[] = [
                        'ID_Asignatura' => $asignaturaId,
                        'ID_Programa' => $programaId,
                        'ID_Asignatura_Requerida' => null,
                        'Tipo_Requisito' => $tipoMapeado,
                        'Valor_Creditos' => null,
                        'Descripcion_Requisito' => $descripcion,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                } else {
                    // Requisito por código de asignatura
                    $reqBase = $this->normalizeCodigo($reqCodigo);
                    $reqAsignaturaId = $this->asignaturasCache[$reqBase] ?? null;
                    if (! is_int($reqAsignaturaId)) {
                        $this->recordError($rowNumber, 'Optativa', "Requisito '{$reqCodigo}' no encontrado en catálogo.", $codigoBase, 'advertencia');

                        continue;
                    }

                    $dupKey = "{$asignaturaId}|{$programaId}|{$reqAsignaturaId}|";
                    if (isset($requisitosExistentes[$dupKey]) || isset($seenInBatch[$dupKey])) {
                        continue;
                    }
                    $seenInBatch[$dupKey] = true;

                    $batchRequisitos[] = [
                        'ID_Asignatura' => $asignaturaId,
                        'ID_Programa' => $programaId,
                        'ID_Asignatura_Requerida' => $reqAsignaturaId,
                        'Tipo_Requisito' => $this->mapTipoRequisito($tipoReq),
                        'Valor_Creditos' => null,
                        'Descripcion_Requisito' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            if (! empty($batchRequisitos)) {
                // Limpiar requisitos obsoletos que no aparecen en el nuevo batch
                $this->cleanupObsoleteRequisitos($batchRequisitos, $programaId);
                $this->bulkInsertModel($batchRequisitos, 'requisitos');
            }
        }
    }

    /**
     * Upsert en programa_electivas para los códigos dados y un programa.
     */
    private function vincularElectivasAPrograma(int $programaId, array $codigosBase): void
    {
        if (empty($codigosBase)) {
            return;
        }

        $ids = Asignatura::whereIn('Codigo_Base', $codigosBase)
            ->pluck('ID_Asignatura')
            ->all();

        if (empty($ids)) {
            return;
        }

        $now = now();
        $lote = array_map(fn ($id) => [
            'ID_Programa' => $programaId,
            'ID_Asignatura' => $id,
            'created_at' => $now,
            'updated_at' => $now,
        ], $ids);

        foreach (array_chunk($lote, self::BATCH_SIZE) as $chunk) {
            DB::table('programa_electivas')->upsert(
                $chunk,
                ['ID_Programa', 'ID_Asignatura'],
                ['updated_at']
            );
        }
    }

    private function persistOptativaAgrupacionLinkages(int $programaId, array $codigosBase, array $metaByCodigo): void
    {
        $malla = $this->resolveMallaForOptativaPrograma($programaId);
        if (! $malla || empty($codigosBase)) {
            return;
        }

        $plantillasCache = PlantillaAgrupacion::where('ID_Programa', $programaId)
            ->get()
            ->keyBy('ID_Plantilla_Agrupacion');

        $rowsByAgrupacion = []; // Agrupar filas por agrupación para mejor control
        $now = now();

        foreach ($codigosBase as $codigoBase) {
            $asignaturaId = $this->asignaturasCache[$codigoBase] ?? null;
            if (! is_int($asignaturaId)) {
                continue;
            }

            $agrupacionId = null;
            $meta = $metaByCodigo[$codigoBase] ?? [];
            $plantillaId = $meta['ID_Plantilla_Agrupacion'] ?? null;

            if (! empty($plantillaId) && isset($plantillasCache[$plantillaId])) {
                $plantilla = $plantillasCache[$plantillaId];
                $componenteId = $meta['ID_Componente'] ?? null;

                if ($componenteId) {
                    // Buscar si la agrupación ya existe en la malla
                    $agrupacion = Agrupacion::where('ID_Malla', $malla->ID_Malla)
                        ->where('ID_Componente', $componenteId)
                        ->where('Nombre_Agrupacion', $plantilla->Nombre_Agrupacion)
                        ->first();

                    if ($agrupacion) {
                        $agrupacionId = $agrupacion->ID_Agrupacion;
                    } else {
                        // La agrupación NO existe aún → crearla desde la plantilla
                        $nuevaAgrupacion = $plantilla->generarAgrupacion($malla->ID_Malla);
                        $agrupacionId = $nuevaAgrupacion->ID_Agrupacion;
                    }
                } else {
                    // No tiene componente → no se puede determinar agrupación
                    $this->recordError(
                        0,
                        'Optativa',
                        "La optativa '{$codigoBase}' no tiene componente asociado en la plantilla. No se puede vincular automáticamente.",
                        $codigoBase,
                        'advertencia'
                    );

                    continue;
                }
            } else {
                // No tiene plantilla de agrupación → no se puede determinar destino
                $this->recordError(
                    0,
                    'Optativa',
                    "La optativa '{$codigoBase}' no tiene plantilla de agrupación asociada. ".
                    'Debes asignarla manualmente desde el panel de administración.',
                    $codigoBase,
                    'advertencia'
                );

                continue;
            }

            if (! isset($rowsByAgrupacion[$agrupacionId])) {
                $rowsByAgrupacion[$agrupacionId] = [];
            }

            $rowsByAgrupacion[$agrupacionId][] = [
                'ID_Malla' => $malla->ID_Malla,
                'ID_Agrupacion' => $agrupacionId,
                'ID_Asignatura' => $asignaturaId,
                'Tipo_Asignatura' => 'optativa',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Insertar por agrupación para mantener consistencia
        foreach ($rowsByAgrupacion as $agrupacionId => $rows) {
            if (! empty($rows)) {
                DB::table('agrupacion_asignatura')
                    ->upsert($rows, ['ID_Agrupacion', 'ID_Asignatura', 'ID_Malla'], ['Tipo_Asignatura', 'updated_at']);
            }
        }
    }

    private function resolveMallaForOptativaPrograma(int $programaId): ?MallaCurricular
    {
        if ($this->carga->ID_Malla) {
            return $this->carga->malla;
        }

        return MallaCurricular::where('ID_Programa', $programaId)
            ->where('Es_Vigente', 1)
            ->first();
    }

    private function findOrCreateAgrupacionFromPlantilla(MallaCurricular $malla, ?int $componenteId, PlantillaAgrupacion $plantilla): ?int
    {
        if (! $componenteId) {
            return null;
        }

        $agrupacion = Agrupacion::firstOrCreate(
            [
                'ID_Malla' => $malla->ID_Malla,
                'ID_Componente' => $componenteId,
                'Nombre_Agrupacion' => $plantilla->Nombre_Agrupacion,
            ],
            [
                'ID_Malla' => $malla->ID_Malla,
                'ID_Programa' => $malla->ID_Programa,
                'ID_Componente' => $componenteId,
                'Nombre_Agrupacion' => $plantilla->Nombre_Agrupacion,
                'Tipo_Agrupacion' => $plantilla->Tipo_Agrupacion,
                'Creditos_Requeridos' => $plantilla->Creditos_Requeridos,
                'Creditos_Maximos' => $plantilla->Creditos_Maximos,
                'Es_Obligatoria' => $plantilla->Es_Obligatoria,
            ]
        );

        return $agrupacion->ID_Agrupacion;
    }

    private function findOrCreateDefaultOptativaAgrupacion(MallaCurricular $malla): ?int
    {
        $componente = Componente::firstOrCreate(['Nombre_Componente' => 'Libre Elección']);

        $agrupacion = Agrupacion::firstOrCreate(
            [
                'ID_Malla' => $malla->ID_Malla,
                'ID_Componente' => $componente->ID_Componente,
                'Nombre_Agrupacion' => 'Optativas',
            ],
            [
                'ID_Programa' => $malla->ID_Programa,
                'Creditos_Requeridos' => null,
                'Creditos_Maximos' => null,
                'Es_Obligatoria' => 0,
            ]
        );

        return $agrupacion->ID_Agrupacion;
    }

    private function parseAgglomerationSheets(Spreadsheet $spreadsheet): void
    {
        $this->parseAgrupaciones($spreadsheet);
    }

    private function parseAgrupaciones(Spreadsheet $spreadsheet): void
    {
        $sheetName = $this->findSheetContaining($spreadsheet, 'Agrupacion');
        if (! $sheetName) {
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

            $tipoAgrupacionRaw = strtoupper($this->cleanCell($data[1] ?? ''));
            $esObligatoria = $tipoAgrupacionRaw === 'OBLIGATORIA' ? 1 : 0;
            $creditosRequeridos = ! empty($data[3]) ? (int) $data[3] : null;

            Agrupacion::firstOrCreate(
                [
                    'ID_Malla' => $this->malla->ID_Malla,
                    'ID_Componente' => $componente->ID_Componente,
                    'Nombre_Agrupacion' => $agrupacionNombre,
                ],
                [
                    'ID_Malla' => $this->malla->ID_Malla,
                    'ID_Programa' => $this->malla->ID_Programa,
                    'ID_Componente' => $componente->ID_Componente,
                    'Nombre_Agrupacion' => $agrupacionNombre,
                    'Tipo_Agrupacion' => $tipoAgrupacionRaw,
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

        // Fallback to first sheet only for MALLA (file may just be named "Hoja 1")
        if (strtoupper($needle) === 'MALLA') {
            return $spreadsheet->getSheetNames()[0] ?? null;
        }

        return null;
    }

    private function prepareMalla(Spreadsheet $spreadsheet): bool
    {
        if ($this->malla) {
            return true;
        }

        $sheetName = $this->findSheetContaining($spreadsheet, 'MALLA');
        if (! $sheetName) {
            $this->recordError(1, 'MALLA', 'No se encontró la hoja MALLA en el archivo');

            return false;
        }

        $sheet = $spreadsheet->getSheetByName($sheetName);
        $rows = $sheet->toArray();

        if (count($rows) < 2) {
            $this->recordError(1, 'MALLA', 'La hoja MALLA está vacía');

            return false;
        }

        // Extraer normativa del Excel si no viene en la carga
        if (! $this->carga->ID_Normativa) {
            for ($i = 1; $i < count($rows); $i++) {
                if (! $this->isRowEmpty($rows[$i]) && ! empty($rows[$i][0])) {
                    $normativaIdStr = $this->cleanCell($rows[$i][0]);
                    $normativaId = is_numeric($normativaIdStr) ? (int) $normativaIdStr : null;
                    if ($normativaId) {
                        $this->carga->ID_Normativa = $normativaId;
                        break;
                    }
                }
            }
        }

        $normativa = Normativa::with(['programa.facultad.sede'])->find($this->carga->ID_Normativa);
        if (! $normativa) {
            $this->recordError(0, 'Malla', 'La carga no tiene normativa asociada ni se encontró en el archivo.', null, 'error');

            return false;
        }

        $programa = $normativa->programa;
        $facultad = $programa->facultad;
        $sede = $facultad->sede;

        // Actualizamos la carga con el programa y normativa extraídos
        $this->carga->update([
            'ID_Normativa' => $normativa->ID_Normativa,
            'ID_Programa' => $programa->ID_Programa,
        ]);

        $this->malla = MallaCurricular::create([
            'ID_Normativa' => $normativa->ID_Normativa,
            'ID_Programa' => $programa->ID_Programa,
            'Version_Numero' => $this->getNextVersionNumber($programa->ID_Programa),
            'Fecha_Vigencia' => now(), // Corregido de Fecha_Inicio_Vigencia a Fecha_Vigencia
            'Estado' => 'borrador',
            'Es_Vigente' => null,
        ]);

        $this->carga->update(['ID_Malla' => $this->malla->ID_Malla]);

        // Ya que la malla fue recién creada, también aseguramos que su info esté disponible para la caché
        return true;
    }

    /**
     * Parsea la hoja MALLA con optimización bulk.
     * Estrategia: precarga de catálogos en memoria + batch building + bulk inserts.
     */
    private function parseMalla(Spreadsheet $spreadsheet): bool
    {
        $sheetName = $this->findSheetContaining($spreadsheet, 'MALLA');
        if (! $sheetName) {
            $this->recordError(1, 'MALLA', 'No se encontró la hoja MALLA en el archivo');

            return false;
        }

        $sheet = $spreadsheet->getSheetByName($sheetName);
        $rows = $sheet->toArray();

        if (count($rows) < 2) {
            return true;
        }

        $this->validateMallaHeaders($rows[0]);

        $this->totalRows = count($rows) - 1;

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
        if (! empty($batchComponentes)) {
            $this->bulkInsertModel($batchComponentes, 'componentes');
        }

        // 2. Refrescar cache de componentes (incluye los recién insertados)
        $this->componentesCache = Componente::pluck('ID_Componente', 'Nombre_Componente')->toArray();

        // 3. Insertar nuevas agrupaciones
        if (! empty($batchAgrupaciones)) {
            $this->bulkInsertModel($batchAgrupaciones, 'agrupaciones');
        }

        // 4. Refrescar cache de agrupaciones de esta malla
        $agrupaciones = Agrupacion::where('ID_Malla', $this->malla->ID_Malla)
            ->get(['ID_Agrupacion', 'ID_Componente', 'Nombre_Agrupacion']);
        $this->agrupacionesCache = [];
        foreach ($agrupaciones as $agrup) {
            $key = $agrup->ID_Componente.'|'.$agrup->Nombre_Agrupacion;
            $this->agrupacionesCache[$key] = $agrup->ID_Agrupacion;
        }

        // 5. Resolver IDs reales en batchRelaciones (reemplazar temp IDs)
        $this->resolveRelacionIds($batchRelaciones);

        // 6. Insertar relaciones agrupacion_asignatura
        if (! empty($batchRelaciones)) {
            $this->bulkInsertModel($batchRelaciones, 'agrupacion_asignatura');
        }

        // 7. Insertar requisitos (usando upsert para evitar duplicados por re-upload)
        if (! empty($batchRequisitos)) {
            // Limpiar requisitos obsoletos que no aparecen en el nuevo batch
            $this->cleanupObsoleteRequisitos($batchRequisitos, $this->malla->ID_Programa);

            $chunks = array_chunk($batchRequisitos, self::BATCH_SIZE);
            foreach ($chunks as $chunk) {
                try {
                    DB::transaction(function () use ($chunk) {
                        DB::table('requisitos')->upsert(
                            $chunk,
                            ['ID_Asignatura', 'ID_Programa', 'ID_Asignatura_Requerida'],
                            ['Tipo_Requisito', 'Valor_Creditos', 'Descripcion_Requisito', 'updated_at']
                        );
                    });
                } catch (\Throwable $e) {
                    $this->recordError(
                        0,
                        'Requisitos',
                        'Error en upsert de requisitos: '.$e->getMessage(),
                        null,
                        'error'
                    );
                }
            }
        }

        // 8. Segunda pasada: procesar placeholders (LIBRE1-11, OPTATIVA1-8, NIVELATORIO1-2).
        // No se pueden acumular en batch porque crean slots, no relaciones.
        // Se ejecutan después de los inserts para que las agrupaciones ya existan.
        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];
            if ($this->isRowEmpty($data)) {
                continue;
            }
            $codigoAsignatura = $this->cleanCodeCell($data[3] ?? null);
            if (! empty($codigoAsignatura) && $this->esPlaceholder($codigoAsignatura)) {
                $this->procesarPlaceholder($data, $i + 1);
            }
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
        $componenteRaw = $this->cleanCell($data[1] ?? '');
        if ($componenteRaw !== null && ! is_numeric($componenteRaw)) {
            $this->recordError($rowNumber, 'Componente', "El valor '{$componenteRaw}' no es un ID de componente válido (se esperaba un número).", $componenteRaw, 'error');

            return;
        }
        $componenteId = (int) $componenteRaw;
        $plantillaRaw = $this->cleanCell($data[2] ?? '');
        $codigoAsignatura = $this->cleanCodeCell($data[3] ?? '');
        $obligatoriaVal = $this->cleanCell($data[4] ?? '');
        $reqTipo = $this->cleanCell($data[5] ?? null);
        $reqCodigo = $this->cleanCodeCell($data[6] ?? null);
        $semestreRaw = $this->cleanCell($data[7] ?? null);
        if ($semestreRaw !== null && $semestreRaw !== '') {
            if (! is_numeric($semestreRaw)) {
                $this->recordError($rowNumber, 'Semestre', "El valor de semestre '{$semestreRaw}' no es un número válido.", $semestreRaw, 'error');
                $semestre = null;
            } else {
                $semestre = (int) $semestreRaw;
                if ($semestre < 1 || $semestre > 20) {
                    $this->recordError($rowNumber, 'Semestre', "El semestre {$semestre} está fuera del rango permitido (1-20).", (string) $semestre, 'advertencia');
                }
            }
        } else {
            $semestre = null;
        }

        if (empty($codigoAsignatura)) {
            $this->recordError($rowNumber, 'Codigo Asignatura', 'Fila sin codigo de asignatura', '', 'error');

            return;
        }

        if (empty($plantillaRaw) || ! is_numeric($plantillaRaw)) {
            $this->recordError($rowNumber, 'Plantilla Agrupacion', "El valor '{$plantillaRaw}' no es un ID de plantilla válido (se esperaba un número).", $codigoAsignatura, 'error');

            return;
        }

        $plantillaAgrupacionId = (int) $plantillaRaw;

        // Placeholders (OPTATIVA*, LIBRE*, NIVELATORIO*) are processed in the second pass
        if ($this->esPlaceholder($codigoAsignatura)) {
            return;
        }

        $asignaturaReqId = $this->buscarAsignaturaPorCodigoBase($this->normalizeCodigo($codigoAsignatura));
        if (! $asignaturaReqId) {
            $this->recordError($rowNumber, 'Asignatura', 'Asignatura no encontrada en el catalogo. Asegurese de subirla primero.', $codigoAsignatura, 'error');

            return;
        }

        static $plantillasCache = null;
        if ($plantillasCache === null) {
            $plantillasCache = PlantillaAgrupacion::all()->keyBy('ID_Plantilla_Agrupacion');
        }

        if (! isset($plantillasCache[$plantillaAgrupacionId])) {
            $this->recordError($rowNumber, 'Agrupacion', "Plantilla de Agrupacion ({$plantillaAgrupacionId}) no valida.", $codigoAsignatura, 'error');

            return;
        }

        $plantilla = $plantillasCache[$plantillaAgrupacionId];
        $agrupKey = $componenteId.'|'.$plantilla->Nombre_Agrupacion;

        if (! isset($this->agrupacionesCache[$agrupKey])) {
            $batchAgrupaciones[] = [
                'ID_Malla' => $this->malla->ID_Malla,
                'ID_Programa' => $this->malla->ID_Programa,
                'ID_Componente' => $componenteId,
                'Nombre_Agrupacion' => $plantilla->Nombre_Agrupacion,
                'Tipo_Agrupacion' => $plantilla->Tipo_Agrupacion,
                'Creditos_Requeridos' => $plantilla->Creditos_Requeridos,
                'Es_Obligatoria' => $plantilla->Es_Obligatoria,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $tempAgrupId = count($batchAgrupaciones) * -1;
            $agrupTempMap[$agrupKey] = $tempAgrupId;
            $this->agrupacionesCache[$agrupKey] = $tempAgrupId;
        }

        if ($obligatoriaVal !== null) {
            $obligatoriaUpper = strtoupper($obligatoriaVal);
            if ($obligatoriaUpper !== 'SI' && $obligatoriaUpper !== 'NO') {
                $this->recordError($rowNumber, 'Obligatoria', "Valor '{$obligatoriaVal}' no reconocido. Se esperaba 'SI' o 'NO'. Se usará 'NO' por defecto.", $obligatoriaVal, 'advertencia');
            }
        }
        $obligatoriaEmpty = $obligatoriaVal === null;
        $tipoAsignatura = $this->mapObligatoria($obligatoriaVal ?? 'NO');

        // Procesar requisitos ANTES del dedup: así si una materia tiene
        // múltiples prerequisitos en filas separadas, todos se registran.
        $reqColumns = [[5, 6], [8, 9], [10, 11]];
        foreach ($reqColumns as $cols) {
            $rTipo = $this->cleanCell($data[$cols[0]] ?? null);
            $rCodigo = $this->cleanCodeCell($data[$cols[1]] ?? null);

            if (! empty($rTipo) && (! empty($rCodigo) || str_contains(strtoupper($rTipo), 'CREDITOS'))) {
                $this->processRequisitoBatch(
                    $asignaturaReqId,
                    $this->malla->ID_Programa,
                    $rTipo,
                    $rCodigo,
                    $rowNumber,
                    $batchRequisitos
                );
            }
        }

        // Prevenir duplicados en el mismo batch antes de insert,
        // y detectar contradicciones en el campo Obligatoria.
        // NOTA: una misma asignatura puede aparecer en múltiples filas
        // dentro de la misma agrupación (requisitos múltiples). El dedup
        // evita duplicar agrupacion_asignatura sin perder los requisitos.
        // Si Obligatoria está vacía en la fila duplicada, se hereda el valor anterior.
        $relKey = $agrupKey.'|'.$asignaturaReqId;
        if (isset($this->processedRels[$relKey])) {
            if ($obligatoriaEmpty) {
                return;
            }
            if ($this->processedRels[$relKey] !== $tipoAsignatura) {
                $this->recordError(
                    $rowNumber,
                    'Obligatoria',
                    "La asignatura {$codigoAsignatura} aparece con valor Obligatoria '{$obligatoriaVal}' ".
                    "contradictorio al valor anterior '".($this->processedRels[$relKey] === 'obligatoria' ? 'SI' : 'NO').
                    "' en la misma agrupación.",
                    $obligatoriaVal,
                    'error'
                );
            }

            return;
        }
        $this->processedRels[$relKey] = $tipoAsignatura;

        $batchRelaciones[] = [
            'ID_Malla' => $this->malla->ID_Malla,
            'ID_Agrupacion' => $agrupKey,
            'ID_Asignatura' => $asignaturaReqId,
            'Tipo_Asignatura' => $tipoAsignatura,
            'Semestre_Sugerido' => $semestre,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $this->asignaturasProcessed[$codigoAsignatura] = true;
    }

    private function isRowEmpty(array $row): bool
    {
        foreach ($row as $cell) {
            if (! empty($cell)) {
                return false;
            }
        }

        return true;
    }

    private function validateHeaders(array $headerRow, array $expectedPatterns, string $sheetName): void
    {
        $headerRow = array_map(fn ($v) => strtolower(trim((string) $v)), $headerRow);

        foreach ($expectedPatterns as $colIndex => $patterns) {
            if (! isset($headerRow[$colIndex])) {
                continue;
            }

            $headerValue = $headerRow[$colIndex];
            if (empty($headerValue)) {
                continue;
            }

            $matches = false;
            foreach ($patterns as $pattern) {
                if (str_contains($headerValue, $pattern)) {
                    $matches = true;
                    break;
                }
            }

            if (! $matches) {
                $this->recordError(
                    1,
                    $sheetName,
                    "Encabezado inesperado en columna {$colIndex}: '{$headerValue}'. ".
                    'Se esperaba un nombre que contenga: '.implode(', ', $patterns).'.',
                    $headerValue,
                    'advertencia'
                );
            }
        }
    }

    private function validateMallaHeaders(array $headerRow): void
    {
        $this->validateHeaders($headerRow, [
            1 => ['componente'],
            2 => ['plantilla', 'agrupaci'],
            3 => ['codigo', 'código'],
            4 => ['obligatoria', 'tipo'],
            5 => ['requisito', 'tipo'],
            7 => ['semestre'],
        ], 'MALLA');
    }

    private function validateAsignaturasHeaders(array $headerRow): void
    {
        $this->validateHeaders($headerRow, [
            0 => ['codigo', 'código'],
            1 => ['nombre'],
            2 => ['credito', 'crédito'],
        ], 'Asignaturas');
    }

    /**
     * Resuelve una asignatura: busca por Codigo_Base (cache) o crea nueva.
     * Para carga malla, Tipo_Asignatura se determina según el archivo de origen.
     * NOTA: No actualiza asignaturas existentes (solo warning si nombre difiere).
     *
     * @param  string  $codigoOriginal  Código tal como viene del Excel
     * @param  string  $nombre  Nombre de la asignatura
     * @param  float|int|null  $creditos  Créditos (puede venir del Excel)
     * @param  int  $rowNumber  Número de fila para logs
     * @param  string  $tipo  'regular' o 'electiva'
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
                'Creditos_Asignatura' => (int) $creditos,
                'Horas_Presencial' => $tipo === 'regular' ? 0 : null, // temporal, se rellenará después si hay datos
                'Horas_Estudiante' => $tipo === 'regular' ? 0 : null,
            ]);

            // Actualizar cache
            $this->asignaturasCache[$codigoBase] = $asignatura->ID_Asignatura;

            return $asignatura;
        } catch (\Throwable $e) {
            $this->recordError($rowNumber, 'Asignatura', 'Error al crear asignatura: '.$e->getMessage(), $codigoOriginal, 'error');

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
                'ID_Programa' => $this->malla->ID_Programa,
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
            $key = $agrup->ID_Componente.'|'.$agrup->Nombre_Agrupacion;
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
                    'Error en batch insert de asignaturas: '.$e->getMessage(),
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
                    'Error en bulk insert de '.$table.': '.$e->getMessage(),
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
                        : (int) str_replace('PENDING_', '', $componentePart);

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
        if (! $asignatura) {
            return;
        }

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

    /**
     * Normaliza el nombre de una asignatura a formato título.
     * Ej: "BASES DE DATOS II" → "Base de Datos II"
     * - Primera letra de cada palabra en mayúscula (excepto artículos/preposiciones cortas)
     * - Números romanos (I, II, III, IV, V, VI, etc.) se mantienen en mayúsculas
     * - Palabras como "DE", "DEL", "LA", "LAS", "LOS", "Y", "E", "O", "A", "EN", "AL", "POR", "PARA", "CON", "SIN" en minúscula (excepto si son la primera palabra)
     */
    private function normalizeNombreAsignatura(string $nombre): string
    {
        $nombre = trim($nombre);
        if (empty($nombre)) {
            return $nombre;
        }

        // Palabras que deben ir en minúscula (excepto si son la primera)
        $lowercaseWords = [
            'de', 'del', 'la', 'las', 'los', 'el', 'lo',
            'y', 'e', 'o', 'a', 'en', 'al', 'por', 'para',
            'con', 'sin', 'su', 'un', 'una', 'que', 'es',
        ];

        // Números romanos que deben mantenerse en mayúscula
        $romanNumerals = [
            'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
            'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
        ];
        $romanSet = array_flip(array_map('strtoupper', $romanNumerals));

        // Dividir en palabras
        $words = explode(' ', $nombre);
        $result = [];

        foreach ($words as $index => $word) {
            $upperWord = mb_strtoupper($word);
            $lowerWord = mb_strtolower($word);

            // Si es un número romano, mantenerlo en mayúsculas
            if (isset($romanSet[$upperWord])) {
                $result[] = $upperWord;

                continue;
            }

            // Si es la primera palabra, capitalizar
            if ($index === 0) {
                $result[] = mb_convert_case($lowerWord, MB_CASE_TITLE, 'UTF-8');

                continue;
            }

            // Si es una palabra que debe ir en minúscula
            if (in_array($lowerWord, $lowercaseWords)) {
                $result[] = $lowerWord;

                continue;
            }

            // Para el resto, capitalizar primera letra
            $result[] = mb_convert_case($lowerWord, MB_CASE_TITLE, 'UTF-8');
        }

        return implode(' ', $result);
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
    private function processRequisitoBatch(int $asignaturaBaseId, int $idPrograma, ?string $reqTipo, ?string $reqCodigo, int $rowNumber, array &$batchRequisitos): void
    {
        if (empty($reqTipo) && empty($reqCodigo)) {
            return;
        }

        $reqCodigoLimpiado = $this->cleanCell($reqCodigo); // Usamos cleanCell para no perder texto largo
        $tipoMapeado = $this->mapTipoRequisito($reqTipo);

        $asignaturaReqId = null;
        $valorCreditos = null;
        $descripcion = null;

        if (! empty($reqCodigoLimpiado)) {
            // 1. Detectar si es una condición de créditos por texto
            if ($this->isConditionRequirement($reqCodigoLimpiado)) {
                $descripcion = $reqCodigoLimpiado;
                $tipoMapeado = 'creditos';

                // Intentar extraer el primer número que aparezca como créditos razonables
                if (preg_match('/(\d+)\s*(?:créditos|creditos)/i', $reqCodigoLimpiado, $matches)) {
                    $valorCreditos = (int) $matches[1];
                }
            } else {
                // 2. Intentar buscar como asignatura (flujo normal)
                $codigoLimpio = $this->cleanCodeCell($reqCodigoLimpiado);
                $asignaturaReqId = $this->buscarAsignaturaPorCodigoBase($this->normalizeCodigo($codigoLimpio));

                if (! $asignaturaReqId) {
                    if ($tipoMapeado === 'prerrequisito' || $tipoMapeado === 'correquisito') {
                        $this->recordError(
                            $rowNumber,
                            'Requisito',
                            "Asignatura requisito con código '{$codigoLimpio}' no encontrada en el catálogo.",
                            $reqCodigoLimpiado,
                            'error'
                        );

                        return;
                    }

                    // 3. Si no es asignatura y es numérico, es requisito de créditos simple
                    if (is_numeric($codigoLimpio)) {
                        $valorCreditos = (int) $codigoLimpio;
                        $tipoMapeado = 'creditos';
                    } else {
                        // Es un texto que no reconocemos como condición ni como código
                        $this->recordError(
                            $rowNumber,
                            'Requisito',
                            'Asignatura requisito no encontrada: '.$reqCodigoLimpiado,
                            $reqCodigoLimpiado,
                            'advertencia'
                        );

                        return;
                    }
                }
            }
        }

        $dedupKey = $asignaturaBaseId.'|'.($asignaturaReqId ?? 'null').'|'.$idPrograma;
        if ($asignaturaReqId === null) {
            $dedupKey .= '|'.($descripcion ?? '');
        }
        if (isset($this->processedReqs[$dedupKey])) {
            return;
        }
        $this->processedReqs[$dedupKey] = true;

        $batchRequisitos[] = [
            'ID_Asignatura' => $asignaturaBaseId,
            'ID_Programa' => $idPrograma,
            'ID_Asignatura_Requerida' => $asignaturaReqId,
            'Tipo_Requisito' => $tipoMapeado,
            'Valor_Creditos' => $valorCreditos,
            'Descripcion_Requisito' => $descripcion,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function isConditionRequirement(string $text): bool
    {
        $textUC = mb_strtoupper($text);

        return str_contains($textUC, 'HABER APROBADO') ||
               str_contains($textUC, 'CRÉDITOS') ||
               str_contains($textUC, 'CREDITOS') ||
               str_contains($textUC, 'PLAN DE ESTUDIOS') ||
               str_contains($textUC, 'COMPONENTES') ||
               str_contains($textUC, '%');
    }

    private function processRequisito(AgrupacionAsignatura $relacion, ?string $reqTipo, ?string $reqCodigo, int $rowNumber): void
    {
        if (empty($reqTipo) && empty($reqCodigo)) {
            return;
        }

        $reqCodigoLimpiado = $this->cleanCell($reqCodigo);
        if (empty($reqCodigoLimpiado)) {
            return;
        }

        $tipoMapeado = $this->mapTipoRequisito($reqTipo);
        $asignaturaReqId = null;
        $valorCreditos = null;
        $descripcion = null;

        if ($this->isConditionRequirement($reqCodigoLimpiado)) {
            $descripcion = $reqCodigoLimpiado;
            $tipoMapeado = 'creditos';
            if (preg_match('/(\d+)\s*(?:créditos|creditos)/i', $reqCodigoLimpiado, $matches)) {
                $valorCreditos = (int) $matches[1];
            }
        } else {
            $codigoLimpio = $this->cleanCodeCell($reqCodigoLimpiado);
            $asignaturaReqId = $this->buscarAsignaturaPorCodigoBase($this->normalizeCodigo($codigoLimpio));

            if (! $asignaturaReqId) {
                if ($tipoMapeado === 'prerrequisito' || $tipoMapeado === 'correquisito') {
                    $this->recordError(
                        $rowNumber,
                        'Requisito',
                        "Asignatura requisito con código '{$codigoLimpio}' no encontrada en el catálogo.",
                        $reqCodigoLimpiado,
                        'error'
                    );

                    return;
                }

                if (is_numeric($codigoLimpio)) {
                    $valorCreditos = (int) $codigoLimpio;
                    $tipoMapeado = 'creditos';
                } else {
                    $this->recordError(
                        $rowNumber,
                        'Requisito',
                        'Asignatura requisito no encontrada: '.$reqCodigoLimpiado,
                        $reqCodigoLimpiado,
                        'advertencia'
                    );

                    return;
                }
            }
        }

        Requisito::create([
            'ID_Asignatura' => $relacion->ID_Asignatura,
            'ID_Programa' => $this->malla ? $this->malla->ID_Programa : null,
            'ID_Asignatura_Requerida' => $asignaturaReqId,
            'Tipo_Requisito' => $tipoMapeado,
            'Valor_Creditos' => $valorCreditos,
            'Descripcion_Requisito' => $descripcion,
        ]);
    }

    /**
     * Mapea el tipo de requisito desde el Excel.
     */
    private function mapTipoRequisito(?string $tipo): string
    {
        $tipoLimpio = strtoupper($this->cleanCell($tipo));

        // Mapeo detallado para términos comunes en UNAL
        if (str_contains($tipoLimpio, 'PREREQUISITO') || str_contains($tipoLimpio, 'PRE-REQUISITO') || $tipoLimpio === 'OBLIGATORIO') {
            return 'prerrequisito';
        }

        if (str_contains($tipoLimpio, 'CORREQUISITO') || str_contains($tipoLimpio, 'COREQUISITO') || str_contains($tipoLimpio, 'CO-REQUISITO')) {
            return 'correquisito';
        }

        if (str_contains($tipoLimpio, 'CREDITOS') || str_contains($tipoLimpio, 'CRÉDITOS')) {
            return 'creditos';
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

        // Si es numérico, verificar que exista antes de usarlo como ID
        if (is_numeric($agrupacionValue)) {
            $id = (int) $agrupacionValue;
            if (Agrupacion::where('ID_Agrupacion', $id)->exists()) {
                return $id;
            }
            // El ID numérico no existe en BD; el Excel usa número de columna, no ID real.
            // Buscar la agrupación por componente y malla como fallback.
            $agrupacion = Agrupacion::where('ID_Malla', $this->malla->ID_Malla)
                ->where('ID_Componente', $componenteId)
                ->first();
            if ($agrupacion) {
                return $agrupacion->ID_Agrupacion;
            }

            return null;
        }

        // Buscar por nombre dentro del componente y malla actual
        $key = $componenteId.'|'.$agrupacionValue;
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

        // Verificar si es un placeholder (slot)
        if ($this->esPlaceholder($codigoAsignatura)) {
            $this->procesarPlaceholder($data, $rowNumber);

            return;
        }

        // Resolver IDs
        $componenteId = $this->resolveComponenteId($componenteValue);
        if (! $componenteId) {
            $this->recordError($rowNumber, 'Malla', "Componente no encontrado: {$componenteValue}", $codigoAsignatura, 'error');

            return;
        }

        $agrupacionId = $this->resolveAgrupacionId($agrupacionValue, $componenteId);
        if (! $agrupacionId) {
            $this->recordError($rowNumber, 'Malla', "Agrupación no encontrada: {$agrupacionValue}", $codigoAsignatura, 'error');

            return;
        }

        // Obtener o crear asignatura
        $asignatura = $this->resolveAsignatura($codigoAsignatura, '', 0, $rowNumber);
        if (! $asignatura) {
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
        if (! empty($tipoRequisito) || ! empty($codigoRequisito)) {
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

            // Obtener ID de normativa desde la primera fila de datos
            $firstRow = $rows[1] ?? null;
            if (! $firstRow) {
                $this->recordError(0, 'Malla', 'No hay datos en el archivo', null, 'error');

                return false;
            }

            $normativaId = $this->cleanCell($firstRow[0] ?? null);
            if (empty($normativaId)) {
                $this->recordError(0, 'Malla', 'El ID de normativa es obligatorio en la columna A', null, 'error');

                return false;
            }

            // Crear la malla si no existe
            if (! $this->malla) {
                $normativa = Normativa::with(['programa.facultad.sede'])->find($normativaId);
                if (! $normativa) {
                    $this->recordError(0, 'Malla', "Normativa no encontrada con ID: {$normativaId}", null, 'error');

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
                    'Es_Vigente' => null,
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
            $this->recordError(0, 'Malla', 'Error procesando archivo: '.$e->getMessage(), null, 'error');

            return false;
        }
    }

    /**
     * Verifica si un código de asignatura es un placeholder (slot).
     */
    private function esPlaceholder(string $codigoAsignatura): bool
    {
        $placeholders = [
            'OPTATIVA1', 'OPTATIVA2', 'OPTATIVA3', 'OPTATIVA4', 'OPTATIVA5', 'OPTATIVA6', 'OPTATIVA7', 'OPTATIVA8',
            'LIBRE1', 'LIBRE2', 'LIBRE3', 'LIBRE4', 'LIBRE5',
            'LIBRE6', 'LIBRE7', 'LIBRE8', 'LIBRE9', 'LIBRE10', 'LIBRE11',
            'NIVELATORIO1', 'NIVELATORIO2',
        ];

        $normalized = preg_replace('/\s+/', '', strtoupper(trim($codigoAsignatura)));

        return in_array($normalized, $placeholders);
    }

    /**
     * Procesa un placeholder creando un slot en lugar de una relación con asignatura.
     */
    private function procesarPlaceholder(array $data, int $rowNumber): void
    {
        $componenteId = (int) $this->cleanCell($data[1] ?? null);
        $plantillaRaw = $this->cleanCell($data[2] ?? null);
        $codigoPlaceholder = trim((string) $this->cleanCell($data[3] ?? null));
        $semestre = $this->cleanCell($data[7] ?? null);

        if (! $componenteId || empty($plantillaRaw) || empty($codigoPlaceholder)) {
            $this->recordError($rowNumber, 'Malla', 'Fila de placeholder incompleta.', $codigoPlaceholder, 'error');

            return;
        }

        if (! is_numeric($plantillaRaw)) {
            $this->recordError($rowNumber, 'Plantilla Agrupacion', "El valor '{$plantillaRaw}' no es un ID de plantilla válido (se esperaba un número).", $codigoPlaceholder, 'error');

            return;
        }

        $plantillaAgrupacionId = (int) $plantillaRaw;

        // Same PlantillaAgrupacion lookup used in accumulateMallaRow
        static $plantillasCache = null;
        if ($plantillasCache === null) {
            $plantillasCache = PlantillaAgrupacion::all()->keyBy('ID_Plantilla_Agrupacion');
        }

        if (! isset($plantillasCache[$plantillaAgrupacionId])) {
            $this->recordError($rowNumber, 'Agrupacion', "Plantilla de Agrupacion ({$plantillaAgrupacionId}) no válida.", $codigoPlaceholder, 'error');

            return;
        }

        $plantilla = $plantillasCache[$plantillaAgrupacionId];
        $agrupKey = $componenteId.'|'.$plantilla->Nombre_Agrupacion;

        if (isset($this->agrupacionesCache[$agrupKey]) && is_int($this->agrupacionesCache[$agrupKey])) {
            $agrupacionId = $this->agrupacionesCache[$agrupKey];
        } else {
            $agrup = Agrupacion::where('ID_Malla', $this->malla->ID_Malla)
                ->where('ID_Componente', $componenteId)
                ->where('Nombre_Agrupacion', $plantilla->Nombre_Agrupacion)
                ->first();

            if (! $agrup) {
                // Si la agrupación no existe aún, crearla desde la plantilla para que el slot pueda generarse.
                $agrup = $plantilla->generarAgrupacion($this->malla->ID_Malla);
            }

            $agrupacionId = $agrup->ID_Agrupacion;
            $this->agrupacionesCache[$agrupKey] = $agrupacionId;
        }

        $tipoSlot = $this->determinarTipoSlot($codigoPlaceholder);
        $semestreNum = is_numeric($semestre) ? (int) $semestre : null;

        try {
            SlotAgrupacion::create([
                'ID_Agrupacion' => $agrupacionId,
                'Nombre_Slot' => $codigoPlaceholder,
                'Tipo_Slot' => $tipoSlot,
                'Semestre' => $semestreNum,
            ]);
            $this->processedRows++;
        } catch (\Exception $e) {
            $this->recordError($rowNumber, 'Malla', "Error creando slot '{$codigoPlaceholder}': ".$e->getMessage(), $codigoPlaceholder, 'error');
        }
    }

    /**
     * Determina el tipo de slot basado en el nombre del placeholder.
     */
    private function determinarTipoSlot(string $nombrePlaceholder): string
    {
        $nombreUpper = strtoupper($nombrePlaceholder);

        if (str_contains($nombreUpper, 'OPTATIVA')) {
            return SlotAgrupacion::TIPO_OPTATIVA;
        }

        if (str_contains($nombreUpper, 'LIBRE')) {
            return SlotAgrupacion::TIPO_LIBRE;
        }

        if (str_contains($nombreUpper, 'NIVELATORIO')) {
            return SlotAgrupacion::TIPO_NIVELATORIO;
        }

        // Por defecto, si no se puede determinar
        return SlotAgrupacion::TIPO_LIBRE;
    }

    /**
     * Limpia requisitos obsoletos que ya no aparecen en el batch nuevo.
     *
     * Para cada combinación (ID_Asignatura, ID_Programa) presente en $batchRequisitos,
     * elimina los requisitos existentes en BD que NO coincidan con las claves del batch nuevo.
     *
     * Clave de comparación: ID_Asignatura + ID_Programa + ID_Asignatura_Requerida (o NULL) + Descripcion_Requisito (o vacío)
     *
     * @param array $batchRequisitos Array de requisitos a insertar/actualizar
     * @param int $programaId ID del programa de esta malla
     */
    private function cleanupObsoleteRequisitos(array $batchRequisitos, int $programaId): void
    {
        if (empty($batchRequisitos)) {
            return;
        }

        // 1. Agrupar asignaturas tocadas en el batch
        $asignaturasEnBatch = [];
        $keysDelBatch = []; // Conjunto de claves válidas del batch

        foreach ($batchRequisitos as $req) {
            $asigId = $req['ID_Asignatura'];
            $asignaturasEnBatch[$asigId] = true;

            // Construir clave única para comparación: asignatura + programa + req_asignatura + descripción
            $reqKey = "{$asigId}|{$programaId}|".
                ($req['ID_Asignatura_Requerida'] ?? 'null').'|'.
                ($req['Descripcion_Requisito'] ?? '');
            $keysDelBatch[$reqKey] = true;
        }

        $asignaturaIds = array_keys($asignaturasEnBatch);

        // 2. Consultar requisitos existentes para estas asignaturas y programa (optimizado con whereIn)
        $requisitosExistentes = DB::table('requisitos')
            ->whereIn('ID_Asignatura', $asignaturaIds)
            ->where('ID_Programa', $programaId)
            ->select('ID_Requisito', 'ID_Asignatura', 'ID_Programa', 'ID_Asignatura_Requerida', 'Descripcion_Requisito')
            ->get();

        // 3. Identificar requisitos a eliminar (existentes pero no en el batch nuevo)
        $requisitosAEliminar = [];
        foreach ($requisitosExistentes as $reqExistente) {
            $existentKey = "{$reqExistente->ID_Asignatura}|{$reqExistente->ID_Programa}|".
                ($reqExistente->ID_Asignatura_Requerida ?? 'null').'|'.
                ($reqExistente->Descripcion_Requisito ?? '');

            if (! isset($keysDelBatch[$existentKey])) {
                $requisitosAEliminar[] = $reqExistente->ID_Requisito;
            }
        }

        // 4. Eliminar requisitos obsoletos
        if (! empty($requisitosAEliminar)) {
            DB::table('requisitos')
                ->whereIn('ID_Requisito', $requisitosAEliminar)
                ->delete();
        }
    }
}
