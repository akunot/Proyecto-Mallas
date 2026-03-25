<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSedeRequest extends FormRequest
{
    /**
     * Determina si el usuario está autorizado para hacer esta solicitud.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Reglas de validación para actualizar una sede.
     */
    public function rules(): array
    {
        return [
            'Nombre_Sede' => 'sometimes|string|max:100',
            'Ciudad_Sede' => 'sometimes|string|max:100',
            'Direccion_Sede' => 'nullable|string|max:200',
            'Conmutador_Sede' => 'nullable|string|max:30',
            'Campus_Sede' => 'nullable|string|max:100',
            'Url_Sede' => 'nullable|string|max:300',
        ];
    }

    /**
     * Mensajes de error personalizados.
     */
    public function messages(): array
    {
        return [
            'Nombre_Sede.max' => 'El nombre no puede exceder 100 caracteres.',
            'Ciudad_Sede.max' => 'La ciudad no puede exceder 100 caracteres.',
        ];
    }
}
