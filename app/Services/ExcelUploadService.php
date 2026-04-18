<?php

namespace App\Services;

use App\Models\ArchivoExcel;
use App\Models\CargaMalla;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\Programa;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ExcelUploadService
{
    public function createCarga(int $normativaId, ?int $mallaBaseId, int $userId): array
    {
        $normativa = Normativa::findOrFail($normativaId);
        $programaId = $normativa->ID_Programa;

        if ($mallaBaseId && !MallaCurricular::where('ID_Malla', $mallaBaseId)->where('ID_Programa', $programaId)->exists()) {
            return [
                'success' => false,
                'message' => 'La malla base seleccionada no pertenece al programa de la normativa.',
                'status' => 400,
            ];
        }

        $carga = CargaMalla::create([
            'ID_Archivo_Asignaturas' => null,
            'ID_Archivo_Electivas' => null,
            'ID_Archivo_Malla' => null,
            'ID_Malla' => null,
            'ID_Malla_Base' => $mallaBaseId,
            'ID_Usuario' => $userId,
            'ID_Programa' => $programaId,
            'ID_Normativa' => $normativaId,
            'Estado_Carga' => 'esperando_archivos',
        ]);

        return [
            'success' => true,
            'data' => [
                'carga_id' => $carga->ID_Carga,
                'estado' => $carga->Estado_Carga,
            ],
        ];
    }

    public function uploadArchivo(int $cargaId, UploadedFile $file, string $tipoArchivo, int $userId): array
    {
        $carga = CargaMalla::findOrFail($cargaId);

        if (!in_array($carga->Estado_Carga, ['esperando_archivos', 'listo_para_procesar'])) {
            return [
                'success' => false,
                'message' => 'No se puede subir archivos en el estado actual de la carga.',
                'status' => 400,
            ];
        }

        $hash = hash('sha256', $file->getContent());
        $programaId = $carga->ID_Programa;
        $field = $this->getArchivoFieldByTipo($tipoArchivo);

        if ($this->isDuplicateArchivo($programaId, $hash, $tipoArchivo, $carga->ID_Carga)) {
            return [
                'success' => false,
                'message' => 'Este archivo ya fue cargado anteriormente para este programa.',
                'status' => 409,
            ];
        }

        $archivo = ArchivoExcel::create([
            'ID_Usuario' => $userId,
            'Tipo_Archivo' => $tipoArchivo,
            'Nombre_Archivo' => $file->getClientOriginalName(),
            'Contenido_Archivo' => $file->getContent(),
            'Tamanio_Bytes' => $file->getSize(),
            'Hash_Sha256' => $hash,
            'Estado_Procesamiento' => 'pendiente',
        ]);

        $previousArchivoId = $carga->{$field};
        $carga->update([$field => $archivo->ID_Archivo]);

        if ($previousArchivoId) {
            $this->deleteArchivoIfOrphaned($previousArchivoId);
        }

        if ($carga->ID_Archivo_Asignaturas && $carga->ID_Archivo_Electivas && $carga->ID_Archivo_Malla) {
            $carga->update(['Estado_Carga' => 'listo_para_procesar']);
        }

        return [
            'success' => true,
            'data' => [
                'carga_id' => $carga->ID_Carga,
                'estado' => $carga->Estado_Carga,
                'tipo_archivo' => $tipoArchivo,
                'archivo_id' => $archivo->ID_Archivo,
            ],
        ];
    }

    private function getArchivoFieldByTipo(string $tipoArchivo): string
    {
        return match ($tipoArchivo) {
            'asignaturas' => 'ID_Archivo_Asignaturas',
            'electivas' => 'ID_Archivo_Electivas',
            'malla' => 'ID_Archivo_Malla',
            default => 'ID_Archivo_Malla',
        };
    }

    private function deleteArchivoIfOrphaned(int $archivoId): void
    {
        $isReferenced = CargaMalla::where('ID_Archivo_Asignaturas', $archivoId)
            ->orWhere('ID_Archivo_Electivas', $archivoId)
            ->orWhere('ID_Archivo_Malla', $archivoId)
            ->exists();

        if (!$isReferenced) {
            ArchivoExcel::where('ID_Archivo', $archivoId)->delete();
        }
    }

    private function isDuplicateArchivo(int $programaId, string $hash, string $tipoArchivo, int $excludeCargaId): bool
    {
        return CargaMalla::where('ID_Programa', $programaId)
            ->where('ID_Carga', '<>', $excludeCargaId)
            ->where(function ($query) use ($hash, $tipoArchivo) {
                $query->whereHas('archivoAsignaturas', function ($query) use ($hash, $tipoArchivo) {
                    $query->where('Hash_Sha256', $hash)
                        ->where('Tipo_Archivo', $tipoArchivo);
                })->orWhereHas('archivoElectivas', function ($query) use ($hash, $tipoArchivo) {
                    $query->where('Hash_Sha256', $hash)
                        ->where('Tipo_Archivo', $tipoArchivo);
                })->orWhereHas('archivoMalla', function ($query) use ($hash, $tipoArchivo) {
                    $query->where('Hash_Sha256', $hash)
                        ->where('Tipo_Archivo', $tipoArchivo);
                });
            })
            ->exists();
    }

    private function parseProgramaFromExcel($spreadsheet): array
    {
        try {
            // Try different sheet names
            $sheetName = null;
            foreach (['Programas', 'programas', 'PROGRAMA', 'PROGRAMA'] as $name) {
                if ($spreadsheet->getSheetByName($name)) {
                    $sheetName = $name;
                    break;
                }
            }
            
            if (!$sheetName) {
                // Try to find any sheet with "programa" in the name
                foreach ($spreadsheet->getSheetNames() as $name) {
                    if (stripos($name, 'programa') !== false) {
                        $sheetName = $name;
                        break;
                    }
                }
            }
            
            if (!$sheetName) {
                return [];
            }
            
            $sheet = $spreadsheet->getSheetByName($sheetName);
            $rows = $sheet->toArray();
            if (count($rows) < 2) {
                return [];
            }
            
            $data = $rows[1];
            
            // Column mapping: 
            // 0 = ID, 1 = PROGRAMA (name), 2 = SNIES, etc.
            $programaNombre = $this->sanitizeUtf8($this->cleanCell($data[1] ?? ''));
            $snies = $this->sanitizeUtf8($this->cleanCell($data[2] ?? ''));
            
            return [
                'codigo' => $snies,
                'nombre' => $programaNombre,
                'snies' => $snies,
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    private function parseSedeFromExcel($spreadsheet): ?int
    {
        try {
            // Try to find from "Sede" sheet
            $sheet = $spreadsheet->getSheetByName('Sede');
            if ($sheet) {
                $rows = $sheet->toArray();
                if (count($rows) >= 2) {
                    $data = $rows[1];
                    // Column 0 is ID, column 1 is SEDE name
                    $sedeCodigo = !empty($data[0]) ? (int)$data[0] : null;
                    $sedeNombre = $this->cleanCell($data[1] ?? '');
                    
                    if ($sedeCodigo) {
                        $sede = \App\Models\Sede::where('Codigo_Sede', $sedeCodigo)->first();
                        if ($sede) {
                            return $sede->ID_Sede;
                        }
                        
                        // Try by ID
                        $sede = \App\Models\Sede::find($sedeCodigo);
                        if ($sede) {
                            $sede->update(['Codigo_Sede' => $sedeCodigo]);
                            return $sede->ID_Sede;
                        }
                        
                        // Create new
                        $sede = \App\Models\Sede::create([
                            'Codigo_Sede' => $sedeCodigo,
                            'Nombre_Sede' => $sedeNombre ?: 'Universidad Nacional de Colombia - Sede Manizales',
                            'Ciudad_Sede' => 'Manizales',
                        ]);
                        return $sede->ID_Sede;
                    }
                }
            }
            
            // Try to find from "Facultades" sheet
            foreach (['Facultades', 'facultades'] as $name) {
                $sheet = $spreadsheet->getSheetByName($name);
                if ($sheet) {
                    $rows = $sheet->toArray();
                    if (count($rows) >= 2) {
                        $data = $rows[1];
                        $sedeIdFromExcel = !empty($data[1]) ? (int)$data[1] : null; // Column 1 seems to be SEDE (ID)
                        
                        if ($sedeIdFromExcel) {
                            $sede = \App\Models\Sede::where('Codigo_Sede', $sedeIdFromExcel)->first();
                            if ($sede) {
                                return $sede->ID_Sede;
                            }
                            
                            $sede = \App\Models\Sede::find($sedeIdFromExcel);
                            if ($sede) {
                                $sede->update(['Codigo_Sede' => $sedeIdFromExcel]);
                                return $sede->ID_Sede;
                            }
                        }
                    }
                }
            }
            
            // If still nothing, get the first existing sede
            $sede = \App\Models\Sede::first();
            if ($sede) {
                return $sede->ID_Sede;
            }
            
            // Create default sede
            $sede = \App\Models\Sede::create([
                'Codigo_Sede' => 1,
                'Nombre_Sede' => 'Universidad Nacional de Colombia - Sede Manizales',
                'Ciudad_Sede' => 'Manizales',
            ]);
            return $sede->ID_Sede;
            
        } catch (\Exception $e) {
            \Log::error('Error parsing sede from Excel:', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function parseFacultadFromExcel($spreadsheet, ?int $sedeId = null): ?int
    {
        try {
            // First, look for the relationship in the "Programas" sheet - column for FACULTAD (ID)
            $sheetName = null;
            foreach (['Programas', 'programas', 'PROGRAMA'] as $name) {
                if ($spreadsheet->getSheetByName($name)) {
                    $sheetName = $name;
                    break;
                }
            }
            
            if ($sheetName) {
                $sheet = $spreadsheet->getSheetByName($sheetName);
                $rows = $sheet->toArray();
                if (count($rows) >= 2) {
                    $data = $rows[1];
                    
                    // Column 4 is "FACULTAD (ID)" - use this as Codigo_Facultad
                    $facultadCodigo = !empty($data[4]) ? (int)$data[4] : null;
                    
                    if ($facultadCodigo) {
                        // First try to find by Codigo_Facultad
                        $facultad = \App\Models\Facultad::where('Codigo_Facultad', $facultadCodigo)->first();
                        if ($facultad) {
                            return $facultad->ID_Facultad;
                        }
                        
                        // If not found, try by ID directly
                        $facultad = \App\Models\Facultad::find($facultadCodigo);
                        if ($facultad) {
                            // Update its Codigo_Facultad to match Excel
                            $facultad->update(['Codigo_Facultad' => $facultadCodigo]);
                            return $facultad->ID_Facultad;
                        }
                        
                        // Create new faculty with the code from Excel
                        $facultadNombre = $this->cleanCell($data[0] ?? '') ?: 'Facultad de Ingeniería';
                        
                        // Use provided sedeId or fall back to first
                        $sedeIdToUse = $sedeId ?: (\App\Models\Sede::first()?->ID_Sede);
                        
                        if ($sedeIdToUse) {
                            $newFacultad = \App\Models\Facultad::create([
                                'ID_Sede' => $sedeIdToUse,
                                'Codigo_Facultad' => $facultadCodigo,
                                'Nombre_Facultad' => $facultadNombre,
                                'Esta_Activo' => 1,
                            ]);
                            return $newFacultad->ID_Facultad;
                        }
                    }
                }
            }
            
            // If no faculty found from Programas sheet, try to find from "Facultades" sheet
            foreach (['Facultades', 'facultades', 'FACULTAD', 'FACULTADES'] as $name) {
                $sheet = $spreadsheet->getSheetByName($name);
                if ($sheet) {
                    $rows = $sheet->toArray();
                    if (count($rows) >= 2) {
                        $data = $rows[1];
                        // Column 0 is ID, column 1 is FACULTAD name
                        $facultadCodigo = !empty($data[0]) ? (int)$data[0] : null;
                        $facultadNombre = $this->cleanCell($data[1] ?? '');
                        
                        if ($facultadCodigo && $facultadNombre) {
                            // Try to find by Codigo_Facultad
                            $facultad = \App\Models\Facultad::where('Codigo_Facultad', $facultadCodigo)->first();
                            if ($facultad) {
                                return $facultad->ID_Facultad;
                            }
                            
                            // Try to find by name
                            $facultad = \App\Models\Facultad::where('Nombre_Facultad', 'like', '%' . $facultadNombre . '%')->first();
                            if ($facultad) {
                                $facultad->update(['Codigo_Facultad' => $facultadCodigo]);
                                return $facultad->ID_Facultad;
                            }
                            
                            // Create new
                            $sedeIdToUse = $sedeId ?: (\App\Models\Sede::first()?->ID_Sede);
                            if ($sedeIdToUse) {
                                $newFacultad = \App\Models\Facultad::create([
                                    'ID_Sede' => $sedeIdToUse,
                                    'Codigo_Facultad' => $facultadCodigo,
                                    'Nombre_Facultad' => $facultadNombre,
                                    'Esta_Activo' => 1,
                                ]);
                                return $newFacultad->ID_Facultad;
                            }
                        }
                    }
                }
            }
            
            // If still nothing, get the first available faculty
            $facultad = \App\Models\Facultad::first();
            if ($facultad) {
                return $facultad->ID_Facultad;
            }
            
            // Create a default faculty
            $sede = \App\Models\Sede::first();
            if ($sede) {
                $newFacultad = \App\Models\Facultad::create([
                    'ID_Sede' => $sede->ID_Sede,
                    'Codigo_Facultad' => 1,
                    'Nombre_Facultad' => 'Facultad de Ingeniería',
                    'Esta_Activo' => 1,
                ]);
                return $newFacultad->ID_Facultad;
            }
            
            return null;
        } catch (\Exception $e) {
            \Log::error('Error parsing facultad from Excel:', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function findOrCreateNormativaFromExcel($spreadsheet, int $programaId): int
    {
        try {
            $sheet = $spreadsheet->getSheetByName('Normativas');
            if (!$sheet) {
                return $this->createDefaultNormativa($programaId);
            }
            
            $rows = $sheet->toArray();
            if (count($rows) < 2) {
                return $this->createDefaultNormativa($programaId);
            }
            
            $data = $rows[1];
            $tipo = $this->cleanCell($data[1] ?? 'Acuerdo');
            $numero = $this->cleanCell($data[2] ?? '001');
            $anio = (int) ($data[3] ?? date('Y'));
            
            $normativa = Normativa::where('ID_Programa', $programaId)
                ->where('Tipo_Normativa', $tipo)
                ->where('Numero_Normativa', $numero)
                ->where('Anio_Normativa', $anio)
                ->first();
            
            if ($normativa) {
                return $normativa->ID_Normativa;
            }
            
            return Normativa::create([
                'ID_Programa' => $programaId,
                'Tipo_Normativa' => $this->sanitizeUtf8($tipo),
                'Numero_Normativa' => $this->sanitizeUtf8($numero),
                'Anio_Normativa' => $anio,
                'Instancia' => $this->sanitizeUtf8($this->cleanCell($data[4] ?? 'Consejo de Facultad')),
                'Esta_Activo' => 1,
            ])->ID_Normativa;
            
        } catch (\Exception $e) {
            return $this->createDefaultNormativa($programaId);
        }
    }

    private function createDefaultNormativa(int $programaId): int
    {
        $normativa = Normativa::create([
            'ID_Programa' => $programaId,
            'Tipo_Normativa' => 'Acuerdo',
            'Numero_Normativa' => '001',
            'Anio_Normativa' => date('Y'),
            'Instancia' => 'Consejo de Facultad',
            'Esta_Activo' => 1,
            'Descripcion_Normativa' => 'Normativa creada automáticamente desde el archivo Excel',
        ]);
        
        return $normativa->ID_Normativa;
    }

    private function cleanCell($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $cleaned = trim(str_replace(["\n", "\r", "\t"], ' ', (string) $value));
        return $this->sanitizeUtf8($cleaned);
    }

    private function sanitizeUtf8(string $value): string
    {
        $clean = mb_scrub($value, 'UTF-8');

        // También eliminar caracteres de control no imprimibles (excepto tab/newline)
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $clean);

        return $clean;
    }

    private function sanitizeForResponse(array $data): array
    {
        return array_map(function ($item) {
            if (is_array($item)) {
                return $this->sanitizeForResponse($item);
            }
            if (is_string($item)) {
                return $this->sanitizeUtf8($item);
            }
            return $item;
        }, $data);
    }

    private function getNextVersionNumber(int $programaId): int
    {
        $maxVersion = MallaCurricular::where('ID_Programa', $programaId)
            ->max('Version_Numero');

        return ($maxVersion ?? 0) + 1;
    }
}