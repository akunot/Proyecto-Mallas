<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSedeRequest extends FormRequest
{
    /**
     * Determina si el usuario está autorizado para hacer esta solicitud.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Reglas de validación para crear una sede.
     */
    public function rules(): array
    {
        return [
            'Nombre_Sede' => 'required|string|max:100',
            'Ciudad_Sede' => 'required|string|max:100',
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
            'Nombre_Sede.required' => 'El nombre de la sede es obligatorio.',
            'Nombre_Sede.max' => 'El nombre no puede exceder 100 caracteres.',
            'Ciudad_Sede.required' => 'La ciudad es obligatoria.',
            'Ciudad_Sede.max' => 'La ciudad no puede exceder 100 caracteres.',
        ];
    }
}
