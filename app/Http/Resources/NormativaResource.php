<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NormativaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->ID_Normativa,
            'id_programa' => $this->ID_Programa,
            'tipo' => $this->Tipo_Normativa,
            'numero' => $this->Numero_Normativa,
            'anio' => $this->Anio_Normativa,
            'instancia' => $this->Instancia,
            'descripcion' => $this->Descripcion_Normativa,
            'url' => $this->Url_Normativa,
            'activo' => (bool) $this->Esta_Activo,
            'creado_en' => $this->created_at?->toIso8601String(),
            'actualizado_en' => $this->updated_at?->toIso8601String(),
        ];
    }
}
