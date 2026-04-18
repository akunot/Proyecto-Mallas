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
use App\Models\Requisito;
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

    public function procesar(int $cargaId): array
    {
        $this->carga = CargaMalla::with([
            'archivoAsignaturas',
            'archivoElectivas',
            'archivoMalla',
            'malla.normativa.programa.facultad.sede',
        ])->findOrFail($cargaId);

        $this->malla = $this->carga->malla;

        if (!$this->carga->ID_Archivo_Asignaturas || !$this->carga->ID_Archivo_Electivas || !$this->carga->ID_Archivo_Malla) {
            $this->recordError(
                0,
                'Carga',
                'Faltan los tres archivos necesarios para procesar la carga.',
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

        ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)->delete();
        $this->errors = [];
        $this->warnings = [];

        $this->carga->update(['Estado_Carga' => 'validando']);

        try {
            $asignaturasSpreadsheet = $this->loadSpreadsheetFromField('archivoAsignaturas');
            $this->parseAsignaturasFile($asignaturasSpreadsheet);

            $electivasSpreadsheet = $this->loadSpreadsheetFromField('archivoElectivas');
            $this->parseElectivasFile($electivasSpreadsheet);

            $mallaSpreadsheet = $this->loadSpreadsheetFromField('archivoMalla');
            $this->parseAgglomerationSheets($mallaSpreadsheet);
            $result = $this->parseMalla($mallaSpreadsheet);

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
            if ($this->malla) {
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

        $tempPath = tempnam(sys_get_temp_dir(), 'malla_xlsx_') . '.xlsx';
        try {
            file_put_contents($tempPath, $archivo->Contenido_Archivo);
            return IOFactory::load($tempPath);
        } finally {
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
        }
    }

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

        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];
            $codigo = $this->cleanCodeCell($data[0] ?? null);
            $nombre = $this->cleanCell($data[1] ?? '');
            $creditos = !empty($data[2]) ? (int) $data[2] : 0;
            $horasPresencial = !empty($data[3]) ? (int) $data[3] : null;
            $horasEstudiante = !empty($data[4]) ? (int) $data[4] : null;

            if (empty($codigo) || empty($nombre)) {
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

            $asignatura = Asignatura::where('Codigo_Asignatura', $codigo)->first();
            if ($asignatura) {
                if ($asignatura->Nombre_Asignatura !== $nombre) {
                    $this->recordError(
                        $i + 1,
                        'Asignatura',
                        'El nombre de la asignatura difiere del catálogo existente.',
                        "Excel: {$nombre}, BD: {$asignatura->Nombre_Asignatura}",
                        'advertencia'
                    );
                }

                continue;
            }

            Asignatura::create([
                'Codigo_Asignatura' => $codigo,
                'Nombre_Asignatura' => $nombre,
                'Creditos_Asignatura' => $creditos,
                'Horas_Presencial' => $horasPresencial,
                'Horas_Estudiante' => $horasEstudiante,
            ]);
        }
    }

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

        for ($i = 1; $i < count($rows); $i++) {
            $data = $rows[$i];
            $codigo = $this->cleanCodeCell($data[0] ?? null);
            $nombre = $this->cleanCell($data[1] ?? '');
            $creditos = !empty($data[2]) ? (int) $data[2] : 0;

            if (empty($codigo) || empty($nombre)) {
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

            $asignatura = Asignatura::where('Codigo_Asignatura', $codigo)->first();
            if ($asignatura) {
                if ($asignatura->Nombre_Asignatura !== $nombre) {
                    $this->recordError(
                        $i + 1,
                        'Electiva',
                        'El nombre de la electiva difiere del catálogo existente.',
                        "Excel: {$nombre}, BD: {$asignatura->Nombre_Asignatura}",
                        'advertencia'
                    );
                }

                continue;
            }

            Asignatura::create([
                'Codigo_Asignatura' => $codigo,
                'Nombre_Asignatura' => $nombre,
                'Creditos_Asignatura' => $creditos,
                'Horas_Presencial' => null,
                'Horas_Estudiante' => null,
            ]);
        }
    }

    private function parseAgglomerationSheets(Spreadsheet $spreadsheet): void
    {
        $this->parseAgrupaciones($spreadsheet);
    }

    private function parseContextSheets(Spreadsheet $spreadsheet): void
    {
        $this->parseSede($spreadsheet);
        $this->parseFacultades($spreadsheet);
        $this->parseProgramas($spreadsheet);
        $this->parseNormativas($spreadsheet);
    }

    private function parseSede(Spreadsheet $spreadsheet): void
    {
        try {
            $sheet = $spreadsheet->getSheetByName('Sede');
            if (!$sheet) {
                return;
            }

            $rows = $sheet->toArray();
            if (count($rows) < 2) {
                return;
            }

            $data = $rows[1];
            if (empty($data[1])) {
                return;
            }

            $sedeData = [
                'Nombre_Sede' => $this->cleanCell($data[1]),
                'Campus_Sede' => $this->cleanCell($data[2] ?? null),
                'Ciudad_Sede' => $this->cleanCell($data[3] ?? null),
                'Url_Sede' => $this->cleanCell($data[4] ?? null),
                'Direccion_Sede' => $this->cleanCell($data[5] ?? null),
                'Conmutador_Sede' => $this->cleanCell($data[6] ?? null),
            ];

            $sede = \App\Models\Sede::firstOrCreate(
                ['Nombre_Sede' => $sedeData['Nombre_Sede']],
                $sedeData
            );
        } catch (\Exception $e) {
            $this->recordError(1, 'Sede', 'Error al procesar hoja Sede: ' . $e->getMessage());
        }
    }

    private function parseFacultades(Spreadsheet $spreadsheet): void
    {
        try {
            $sheet = $spreadsheet->getSheetByName('Facultades');
            if (!$sheet) {
                return;
            }

            $rows = $sheet->toArray();
            if (count($rows) < 2) {
                return;
            }

            $sedeId = $this->carga->malla->normativa->programa->facultad->ID_Sede ?? null;

            for ($i = 1; $i < count($rows); $i++) {
                $data = $rows[$i];
                if (empty($data[1])) {
                    continue;
                }

                \App\Models\Facultad::firstOrCreate(
                    ['Nombre_Facultad' => $this->cleanCell($data[1])],
                    [
                        'ID_Sede' => $sedeId,
                        'Nombre_Facultad' => $this->cleanCell($data[1]),
                        'Url_Facultad' => $this->cleanCell($data[3] ?? null),
                        'Conmutador_Facultad' => $this->cleanCell($data[4] ?? null),
                        'Extension_Facultad' => $this->cleanCell($data[5] ?? null),
                        'Campus_Facultad' => $this->cleanCell($data[6] ?? null),
                    ]
                );
            }
        } catch (\Exception $e) {
            $this->recordError(1, 'Facultades', 'Error al procesar hoja Facultades: ' . $e->getMessage());
        }
    }

    private function parseProgramas(Spreadsheet $spreadsheet): void
    {
        try {
            $sheet = $spreadsheet->getSheetByName('Programas');
            if (!$sheet) {
                return;
            }

            $rows = $sheet->toArray();
            if (count($rows) < 2) {
                return;
            }

            $facultadId = $this->carga->malla->normativa->programa->ID_Facultad ?? null;

            for ($i = 1; $i < count($rows); $i++) {
                $data = $rows[$i];
                if (empty($data[1])) {
                    continue;
                }

                \App\Models\Programa::firstOrCreate(
                    ['Codigo_Programa' => $this->cleanCell($data[1])],
                    [
                        'ID_Facultad' => $facultadId,
                        'Codigo_Programa' => $this->cleanCell($data[1]),
                        'Nombre_Programa' => $this->cleanCell($data[1]),
                        'Codigo_SNIES' => $this->cleanCell($data[2] ?? null),
                        'Url_Programa' => $this->cleanCell($data[3] ?? null),
                        'Duracion_Semestres' => (int) ($data[5] ?? null),
                        'Creditos_Totales' => (int) ($data[6] ?? null),
                        'Campus_Programa' => $this->cleanCell($data[7] ?? null),
                        'Conmutador' => $this->cleanCell($data[8] ?? null),
                        'Extension' => $this->cleanCell($data[9] ?? null),
                        'Correo' => $this->cleanCell($data[10] ?? null),
                        'Activo_Programa' => $this->cleanCell($data[11] ?? 'SI') === 'SI' ? 1 : 0,
                    ]
                );
            }
        } catch (\Exception $e) {
            $this->recordError(1, 'Programas', 'Error al procesar hoja Programas: ' . $e->getMessage());
        }
    }

    private function parseNormativas(Spreadsheet $spreadsheet): void
    {
        try {
            $sheet = $spreadsheet->getSheetByName('Normativas');
            if (!$sheet) {
                return;
            }

            $rows = $sheet->toArray();
            if (count($rows) < 2) {
                return;
            }

            $programaId = $this->carga->malla->normativa->ID_Programa ?? null;

            for ($i = 1; $i < count($rows); $i++) {
                $data = $rows[$i];
                if (empty($data[1])) {
                    continue;
                }

                \App\Models\Normativa::firstOrCreate(
                    [
                        'Tipo_Normativa' => $this->cleanCell($data[1]),
                        'Numero_Normativa' => $this->cleanCell($data[2]),
                        'Anio_Normativa' => (int) ($data[3] ?? null),
                        'ID_Programa' => $programaId,
                    ],
                    [
                        'Tipo_Normativa' => $this->cleanCell($data[1]),
                        'Numero_Normativa' => $this->cleanCell($data[2]),
                        'Anio_Normativa' => (int) ($data[3] ?? null),
                        'Instancia' => $this->cleanCell($data[4] ?? null),
                        'ID_Programa' => $programaId,
                        'Url_Normativa' => $this->cleanCell($data[6] ?? null),
                        'Esta_Activo' => $this->cleanCell($data[7] ?? 'SI') === 'SI' ? 1 : 0,
                        'Descripcion_Normativa' => $this->cleanCell($data[8] ?? null),
                    ]
                );
            }
        } catch (\Exception $e) {
            $this->recordError(1, 'Normativas', 'Error al procesar hoja Normativas: ' . $e->getMessage());
        }
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

            $this->processMallaRow($data, $i + 1);
            $this->processedRows++;
        }

        return count($this->errors) === 0;
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

    private function processMallaRow(array $data, int $rowNumber): void
    {
        $componenteNombre = $this->cleanCell($data[1] ?? '');
        $agrupacionNombre = $this->cleanCell($data[2] ?? '');
        $codigo = $this->cleanCodeCell($data[3] ?? null);
        $nombreAsignatura = $this->cleanCell($data[4] ?? '');

        Log::debug("Malla row {$rowNumber}: comp={$componenteNombre}, agrup={$agrupacionNombre}, codigo={$codigo}, nombre={$nombreAsignatura}");

        if (empty($codigo)) {
            $this->recordError(
                $rowNumber,
                'Código Asignatura',
                'Fila sin código de asignatura',
                $nombreAsignatura ?: 'Sin nombre',
                'error'
            );
            return;
        }

        $asignatura = $this->resolveAsignatura($codigo, $nombreAsignatura, ($data[5] ?? null), $rowNumber);

        if (!$asignatura) {
            $this->recordError(
                $rowNumber,
                'Asignatura',
                'No se pudo resolver la asignatura',
                "codigo: {$codigo}, nombre: {$nombreAsignatura}",
                'error'
            );
            return;
        }

        if (empty($componenteNombre)) {
            $this->recordError(
                $rowNumber,
                'Componente',
                'Componente vacío',
                $codigo,
                'error'
            );
            return;
        }

        $componente = $this->resolveComponente($componenteNombre, $rowNumber);
        if (!$componente) {
            $this->recordError(
                $rowNumber,
                'Componente',
                'No se pudo resolver el componente',
                $componenteNombre,
                'error'
            );
            return;
        }

        if (empty($agrupacionNombre)) {
            $this->recordError(
                $rowNumber,
                'Agrupación',
                'Agrupación vacía',
                $codigo,
                'error'
            );
            return;
        }

        $agrupacion = $this->resolveAgrupacion(
            $componente->ID_Componente,
            $agrupacionNombre,
            $rowNumber
        );
        if (!$agrupacion) {
            $this->recordError(
                $rowNumber,
                'Agrupación',
                'No se pudo resolver la agrupación',
                $agrupacionNombre,
                'error'
            );
            return;
        }

        $tipoAsignatura = $this->mapObligatoria($data[6] ?? '');
        $semestre = !empty($data[7]) ? (int) $data[7] : null;

        $agrupacionAsignatura = AgrupacionAsignatura::create([
            'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
            'ID_Asignatura' => $asignatura->ID_Asignatura,
            'Tipo_Asignatura' => $tipoAsignatura,
            'Semestre_Sugerido' => $semestre,
        ]);

        $this->asignaturasProcessed[$asignatura->Codigo_Asignatura] = true;

        $this->processRequisito($agrupacionAsignatura, $data[8] ?? null, $data[9] ?? null, $rowNumber);
    }

    private function resolveAsignatura(string $codigo, string $nombre, ?float $creditos, int $rowNumber): ?Asignatura
    {
        $asignatura = Asignatura::where('Codigo_Asignatura', $codigo)->first();

        if ($asignatura) {
            $nombreNormalizado = $this->cleanCell($nombre);
            if ($asignatura->Nombre_Asignatura !== $nombreNormalizado) {
                $this->recordError(
                    $rowNumber,
                    'Nombre Asignatura',
                    'El nombre en el Excel diffiere del existente en BD',
                    "Excel: {$nombreNormalizado}, BD: {$asignatura->Nombre_Asignatura}",
                    'advertencia'
                );
            }
            return $asignatura;
        }

        return Asignatura::create([
            'Codigo_Asignatura' => $codigo,
            'Nombre_Asignatura' => $this->cleanCell($nombre),
            'Creditos_Asignatura' => (int) ($creditos ?? 0),
        ]);
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

    private function processRequisito(
        AgrupacionAsignatura $agrupacionAsignatura,
        $tipoRequisito,
        $codigoOValor,
        int $rowNumber
    ): void {
        $tipoLimpio = $this->cleanCell($tipoRequisito ?? '');
        
        if (empty($tipoLimpio)) {
            return;
        }

        $tipoValido = ['prerequisito', 'correquisito', 'creditos_minimos'];
        
        if (!in_array(strtolower($tipoLimpio), $tipoValido)) {
            Requisito::create([
                'ID_Agrup_Asig' => $agrupacionAsignatura->ID_Agrup_Asig,
                'Tipo_Requisito' => 'prerequisito',
                'Descripcion_Requisito' => $tipoLimpio,
            ]);
            return;
        }

        $codigoLimpio = $this->cleanCodeCell($codigoOValor);

        if (strtolower($tipoLimpio) === 'creditos_minimos') {
            $creditos = null;
            if ($codigoLimpio !== null && is_numeric($codigoLimpio)) {
                $creditos = (int) $codigoLimpio;
            }

            Requisito::create([
                'ID_Agrup_Asig' => $agrupacionAsignatura->ID_Agrup_Asig,
                'Tipo_Requisito' => 'creditos_minimos',
                'Creditos_Minimos' => $creditos,
                'Descripcion_Requisito' => $creditos === null ? $codigoOValor : null,
            ]);
            return;
        }

        if (empty($codigoLimpio)) {
            Requisito::create([
                'ID_Agrup_Asig' => $agrupacionAsignatura->ID_Agrup_Asig,
                'Tipo_Requisito' => strtolower($tipoLimpio),
                'Descripcion_Requisito' => null,
            ]);
            return;
        }

        if (is_numeric($codigoLimpio)) {
            $asignaturaRequerida = Asignatura::where('Codigo_Asignatura', $codigoLimpio)->first();
            
            if ($asignaturaRequerida) {
                $agrupacionAsigRequerida = AgrupacionAsignatura::where('ID_Asignatura', $asignaturaRequerida->ID_Asignatura)
                    ->whereHas('agrupacion', function ($query) {
                        $query->where('ID_Malla', $this->malla->ID_Malla);
                    })
                    ->first();

                if ($agrupacionAsigRequerida) {
                    Requisito::create([
                        'ID_Agrup_Asig' => $agrupacionAsignatura->ID_Agrup_Asig,
                        'ID_Agrup_Asig_Requerida' => $agrupacionAsigRequerida->ID_Agrup_Asig,
                        'Tipo_Requisito' => strtolower($tipoLimpio),
                    ]);
                    return;
                }
            }

            Requisito::create([
                'ID_Agrup_Asig' => $agrupacionAsignatura->ID_Agrup_Asig,
                'Tipo_Requisito' => strtolower($tipoLimpio),
                'Descripcion_Requisito' => $codigoLimpio,
            ]);
            return;
        }

        $asignaturaPorNombre = Asignatura::whereRaw('LOWER(Nombre_Asignatura) = ?', [strtolower($codigoLimpio)])->first();
        
        if ($asignaturaPorNombre) {
            $agrupacionAsigRequerida = AgrupacionAsignatura::where('ID_Asignatura', $asignaturaPorNombre->ID_Asignatura)
                ->whereHas('agrupacion', function ($query) {
                    $query->where('ID_Malla', $this->malla->ID_Malla);
                })
                ->first();

            if ($agrupacionAsigRequerida) {
                Requisito::create([
                    'ID_Agrup_Asig' => $agrupacionAsignatura->ID_Agrup_Asig,
                    'ID_Agrup_Asig_Requerida' => $agrupacionAsigRequerida->ID_Agrup_Asig,
                    'Tipo_Requisito' => strtolower($tipoLimpio),
                ]);
                return;
            }
        }

        Requisito::create([
            'ID_Agrup_Asig' => $agrupacionAsignatura->ID_Agrup_Asig,
            'Tipo_Requisito' => strtolower($tipoLimpio),
            'Descripcion_Requisito' => $codigoLimpio,
        ]);
    }

    private function cleanCell($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $cleaned = trim(str_replace(["\n", "\r", "\t"], ' ', (string) $value));
        $cleaned = preg_replace('/\s+/', ' ', $cleaned);

        return $cleaned ?: null;
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

        $this->malla->update([
            'Estado' => 'borrador',
        ]);

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

    public function getStatus(): array
    {
        $errorsCount = ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)
            ->where('Severidad_Error', 'error')
            ->count();

        $warningsCount = ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)
            ->where('Severidad_Error', 'advertencia')
            ->count();

        $percentage = $this->totalRows > 0 
            ? (int) (($this->processedRows / $this->totalRows) * 100) 
            : 0;

        return [
            'carga_id' => $this->carga->ID_Carga,
            'estado' => $this->carga->Estado_Carga,
            'errores_count' => $errorsCount,
            'advertencias_count' => $warningsCount,
            'porcentaje' => $percentage,
        ];
    }
}