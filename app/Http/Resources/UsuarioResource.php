<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsuarioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->ID_Usuario,
            'nombre' => $this->Nombre_Usuario,
            'email' => $this->Email_Usuario,
            'activo' => (bool) $this->Activo_Usuario,
            'creado_en' => $this->Creacion_Usuario?->toIso8601String(),
            'actualizado_en' => $this->updated_at?->toIso8601String(),
        ];
    }
}
