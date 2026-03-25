<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Nombre_Usuario' => 'sometimes|string|max:200',
            'Email_Usuario' => 'sometimes|email|max:200|unique:usuario,Email_Usuario,' . $this->route('id') . ',ID_Usuario',
            'Activo_Usuario' => 'sometimes|boolean',
        ];
    }
}
