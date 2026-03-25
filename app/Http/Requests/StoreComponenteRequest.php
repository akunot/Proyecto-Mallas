<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreComponenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Nombre_Componente' => 'required|string|max:150|unique:componente,Nombre_Componente',
            'Descripcion_Componente' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'Nombre_Componente.required' => 'El nombre del componente es obligatorio.',
            'Nombre_Componente.unique' => 'El nombre del componente ya existe.',
            'Nombre_Componente.max' => 'El nombre no puede exceder 150 caracteres.',
        ];
    }
}
