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
            'Codigo_Sede' => 'required|integer|exists:sedes,Codigo_Sede',
            'Codigo_Facultad' => 'required|integer|unique:facultades,Codigo_Facultad',
            'Nombre_Facultad' => 'required|string|max:150',
            'Conmutador_Facultad' => 'nullable|string|max:30',
            'Extension_Facultad' => 'nullable|string|max:80',
            'Campus_Facultad' => 'nullable|string|max:100',
            'Url_Facultad' => 'nullable|string|max:300',
        ];
    }

    public function messages(): array
    {
        return [
            'Codigo_Sede.required' => 'La sede es obligatoria.',
            'Codigo_Sede.exists' => 'La sede seleccionada no existe.',
            'Codigo_Facultad.required' => 'El código de la facultad es obligatorio.',
            'Codigo_Facultad.unique' => 'El código de la facultad ya existe.',
            'Nombre_Facultad.required' => 'El nombre de la facultad es obligatorio.',
            'Nombre_Facultad.max' => 'El nombre no puede exceder 150 caracteres.',
        ];
    }
}
