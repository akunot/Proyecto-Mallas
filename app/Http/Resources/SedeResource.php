<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SedeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->ID_Sede,
            'nombre' => $this->Nombre_Sede,
            'ciudad' => $this->Ciudad_Sede,
            'direccion' => $this->Direccion_Sede,
            'conmutador' => $this->Conmutador_Sede,
            'campus' => $this->Campus_Sede,
            'url' => $this->Url_Sede,
            'creado_en' => $this->created_at?->toIso8601String(),
            'actualizado_en' => $this->updated_at?->toIso8601String(),
        ];
    }
}
