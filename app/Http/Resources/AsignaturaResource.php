<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AsignaturaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->ID_Asignatura,
            'codigo' => $this->Codigo_Asignatura,
            'nombre' => $this->Nombre_Asignatura,
            'creditos' => $this->Creditos_Asignatura,
            'horas_presencial' => $this->Horas_Presencial,
            'horas_estudiante' => $this->Horas_Estudiante,
            'descripcion' => $this->Descripcion_Asignatura,
            'creado_en' => $this->created_at?->toIso8601String(),
            'actualizado_en' => $this->updated_at?->toIso8601String(),
        ];
    }
}
