<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNormativaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ID_Programa' => 'sometimes|integer|exists:programa,ID_Programa',
            'Tipo_Normativa' => 'sometimes|string|in:Acuerdo,Resolución,Decreto,Circular',
            'Numero_Normativa' => 'sometimes|string|max:50',
            'Anio_Normativa' => 'sometimes|integer|min:1900|max:' . date('Y'),
            'Instancia' => 'sometimes|string|max:150',
            'Descripcion_Normativa' => 'nullable|string',
            'Url_Normativa' => 'nullable|string|max:500',
            'Esta_Activo' => 'sometimes|boolean',
        ];
    }
}
