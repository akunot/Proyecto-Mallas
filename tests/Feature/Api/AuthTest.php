<?php

use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create([
        'Email_Usuario' => 'test@unal.edu.co',
    ]);
});

test('request OTP con email válido retorna código en debug', function () {
    $response = $this->postJson('/api/v1/auth/request-otp', [
        'email' => 'test@unal.edu.co',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['message', 'debug' => ['code', 'email', 'expires_at']]);
});

test('request OTP con email no registrado retorna 422', function () {
    $response = $this->postJson('/api/v1/auth/request-otp', [
        'email' => 'no-existe@unal.edu.co',
    ]);

    $response->assertStatus(422);
});

test('request OTP con usuario inactivo retorna 422', function () {
    Usuario::factory()->inactivo()->create([
        'Email_Usuario' => 'inactivo@unal.edu.co',
    ]);

    $response = $this->postJson('/api/v1/auth/request-otp', [
        'email' => 'inactivo@unal.edu.co',
    ]);

    $response->assertStatus(422);
});

test('request OTP con email inválido retorna 422', function () {
    $response = $this->postJson('/api/v1/auth/request-otp', [
        'email' => 'no-es-email',
    ]);

    $response->assertStatus(422);
});

test('verify OTP con código correcto retorna 200', function () {
    $otpCode = '123456';
    $this->usuario->update([
        'Otp_Code' => Hash::make($otpCode),
        'Otp_Expires_At' => now()->addMinutes(10),
    ]);

    $response = $this->postJson('/api/v1/auth/verify-otp', [
        'email' => 'test@unal.edu.co',
        'code' => $otpCode,
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['message', 'data' => ['user']]);
});

test('verify OTP con código incorrecto retorna 422', function () {
    $this->usuario->update([
        'Otp_Code' => Hash::make('654321'),
        'Otp_Expires_At' => now()->addMinutes(10),
    ]);

    $response = $this->postJson('/api/v1/auth/verify-otp', [
        'email' => 'test@unal.edu.co',
        'code' => '123456',
    ]);

    $response->assertStatus(422);
});

test('verify OTP con código expirado retorna 422', function () {
    $this->usuario->update([
        'Otp_Code' => Hash::make('123456'),
        'Otp_Expires_At' => now()->subMinute(),
    ]);

    $response = $this->postJson('/api/v1/auth/verify-otp', [
        'email' => 'test@unal.edu.co',
        'code' => '123456',
    ]);

    $response->assertStatus(422);
});

test('verify OTP sin código solicitado retorna 422', function () {
    $response = $this->postJson('/api/v1/auth/verify-otp', [
        'email' => 'test@unal.edu.co',
        'code' => '123456',
    ]);

    $response->assertStatus(422);
});

test('verify OTP invalida el código después de usarlo', function () {
    $otpCode = '123456';
    $this->usuario->update([
        'Otp_Code' => Hash::make($otpCode),
        'Otp_Expires_At' => now()->addMinutes(10),
    ]);

    $this->postJson('/api/v1/auth/verify-otp', [
        'email' => 'test@unal.edu.co',
        'code' => $otpCode,
    ]);

    $this->usuario->refresh();
    expect($this->usuario->Otp_Code)->toBeNull();
    expect($this->usuario->Otp_Expires_At)->toBeNull();
});

test('verify OTP con formato inválido retorna 422', function () {
    $response = $this->postJson('/api/v1/auth/verify-otp', [
        'email' => 'test@unal.edu.co',
        'code' => 'abc123',
    ]);

    $response->assertStatus(422);
});

test('ruta /me requiere autenticación', function () {
    $response = $this->getJson('/api/v1/me');

    $response->assertStatus(401);
});

test('ruta pública test no requiere autenticación', function () {
    $response = $this->getJson('/api/v1/public/test');

    $response->assertStatus(200)
        ->assertJson(['message' => 'API funcionando', 'status' => 'ok']);
});

test('logout sin sesión retorna 401', function () {
    $response = $this->postJson('/api/v1/auth/logout');

    $response->assertStatus(401);
});
