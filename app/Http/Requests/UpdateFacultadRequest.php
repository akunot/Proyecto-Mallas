<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFacultadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Codigo_Sede' => 'sometimes|integer|exists:sedes,Codigo_Sede',
            'Codigo_Facultad' => 'sometimes|integer|unique:facultades,Codigo_Facultad,' . $this->route('id') . ',ID_Facultad',
            'Nombre_Facultad' => 'sometimes|string|max:150',
            'Conmutador_Facultad' => 'nullable|string|max:30',
            'Extension_Facultad' => 'nullable|string|max:80',
            'Campus_Facultad' => 'nullable|string|max:100',
            'Url_Facultad' => 'nullable|string|max:300',
        ];
    }
}
