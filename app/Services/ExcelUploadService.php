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
    public function createCarga(?int $normativaId, ?int $mallaBaseId, int $userId, string $tipoCarga): array
    {
        $programaId = null;
        if ($normativaId) {
            $normativa = Normativa::findOrFail($normativaId);
            $programaId = $normativa->ID_Programa;

            if ($mallaBaseId && !MallaCurricular::where('ID_Malla', $mallaBaseId)->where('ID_Programa', $programaId)->exists()) {
                return [
                    'success' => false,
                    'message' => 'La malla base seleccionada no pertenece al programa de la normativa.',
                    'status' => 400,
                ];
            }
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
            'tipo_carga' => $tipoCarga,
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
            'Nombre_Archivo' => $this->sanitizeUtf8($file->getClientOriginalName()),
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

        $isReadyToProcess = false;
        if ($carga->tipo_carga === 'malla') {
            $isReadyToProcess = $carga->ID_Archivo_Asignaturas && $carga->ID_Archivo_Electivas && $carga->ID_Archivo_Malla;
        } elseif ($carga->tipo_carga === 'asignaturas') {
            $isReadyToProcess = $field === 'ID_Archivo_Asignaturas';
        } elseif ($carga->tipo_carga === 'electivas') {
            $isReadyToProcess = $field === 'ID_Archivo_Electivas';
        }

        if ($isReadyToProcess) {
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

    private function isDuplicateArchivo(?int $programaId, string $hash, string $tipoArchivo, int $excludeCargaId): bool
    {
        // Si no hay programaId (para cargas de asignaturas/electivas sin normativa), no validar duplicados
        if (!$programaId) {
            return false;
        }

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

    private function sanitizeUtf8(string $value): string
    {
        // Convertir a UTF-8 ignorando secuencias inválidas
        $converted = @iconv('UTF-8', 'UTF-8//IGNORE', $value);
        if ($converted === false) {
            return '';
        }
        // Eliminar caracteres de control no imprimibles
        $converted = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $converted);
        return $converted;
    }

    private function getNextVersionNumber(int $programaId): int
    {
        $maxVersion = MallaCurricular::where('ID_Programa', $programaId)
            ->max('Version_Numero');

        return ($maxVersion ?? 0) + 1;
    }
}