<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateComponenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Nombre_Componente' => 'sometimes|string|max:150|unique:componente,Nombre_Componente,' . $this->route('id') . ',ID_Componente',
            'Descripcion_Componente' => 'nullable|string',
        ];
    }
}
