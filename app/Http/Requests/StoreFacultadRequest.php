<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFacultadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ID_Sede' => 'required|integer|exists:sede,ID_Sede',
            'Nombre_Facultad' => 'required|string|max:150',
            'Conmutador_Facultad' => 'nullable|string|max:30',
            'Extension_Facultad' => 'nullable|string|max:10',
            'Campus_Facultad' => 'nullable|string|max:100',
            'Url_Facultad' => 'nullable|string|max:300',
        ];
    }

    public function messages(): array
    {
        return [
            'ID_Sede.required' => 'La sede es obligatoria.',
            'ID_Sede.exists' => 'La sede seleccionada no existe.',
            'Nombre_Facultad.required' => 'El nombre de la facultad es obligatorio.',
            'Nombre_Facultad.max' => 'El nombre no puede exceder 150 caracteres.',
        ];
    }
}
