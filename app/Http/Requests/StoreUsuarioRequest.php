<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Nombre_Usuario' => 'required|string|max:200',
            'Email_Usuario' => 'required|email|max:200|unique:usuarios,Email_Usuario',
            'Activo_Usuario' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'Nombre_Usuario.required' => 'El nombre es obligatorio.',
            'Email_Usuario.required' => 'El correo electrónico es obligatorio.',
            'Email_Usuario.email' => 'El correo electrónico debe ser válido.',
            'Email_Usuario.unique' => 'El correo electrónico ya está registrado.',
        ];
    }
}
