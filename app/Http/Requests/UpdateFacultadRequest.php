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
            'ID_Sede' => 'sometimes|integer|exists:sede,ID_Sede',
            'Nombre_Facultad' => 'sometimes|string|max:150',
            'Conmutador_Facultad' => 'nullable|string|max:30',
            'Extension_Facultad' => 'nullable|string|max:10',
            'Campus_Facultad' => 'nullable|string|max:100',
            'Url_Facultad' => 'nullable|string|max:300',
        ];
    }
}
