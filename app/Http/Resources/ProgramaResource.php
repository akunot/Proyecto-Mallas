<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProgramaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->ID_Programa,
            'id_facultad' => $this->ID_Facultad,
            'codigo' => $this->Codigo_Programa,
            'nombre' => $this->Nombre_Programa,
            'titulo' => $this->Titulo_Otorgado,
            'nivel' => $this->Nivel_Formacion,
            'creditos' => $this->Creditos_Totales,
            'duracion' => $this->Duracion_Semestres,
            'snies' => $this->Codigo_SNIES,
            'url' => $this->Url_Programa,
            'campus' => $this->Campus_Programa,
            'conmutador' => $this->Conmutador,
            'extension' => $this->Extension,
            'correo' => $this->Correo,
            'area' => $this->Area_Curricular,
            'activo' => (bool) $this->Activo_Programa,
            'facultad' => $this->whenLoaded('facultad', function () {
                return [
                    'id' => $this->facultad->ID_Facultad,
                    'nombre' => $this->facultad->Nombre_Facultad,
                ];
            }),
            'creado_en' => $this->created_at?->toIso8601String(),
            'actualizado_en' => $this->updated_at?->toIso8601String(),
        ];
    }
}
