<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FacultadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->ID_Facultad,
            'id_sede' => $this->ID_Sede,
            'nombre' => $this->Nombre_Facultad,
            'conmutador' => $this->Conmutador_Facultad,
            'extension' => $this->Extension_Facultad,
            'campus' => $this->Campus_Facultad,
            'url' => $this->Url_Facultad,
            'sede' => $this->whenLoaded('sede', function () {
                return [
                    'id' => $this->sede->ID_Sede,
                    'nombre' => $this->sede->Nombre_Sede,
                ];
            }),
            'creado_en' => $this->created_at?->toIso8601String(),
            'actualizado_en' => $this->updated_at?->toIso8601String(),
        ];
    }
}
