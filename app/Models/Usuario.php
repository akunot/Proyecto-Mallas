<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Usuario extends Authenticatable
{
    protected $table = 'usuarios';
    protected $primaryKey = 'ID_Usuario';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = true;

    protected $fillable = [
        'Nombre_Usuario',
        'Email_Usuario',
        'Otp_Code',
        'Otp_Expires_At',
        'Activo_Usuario',
    ];

    protected $hidden = [
        'Password_Usuario',
        'Otp_Code',
    ];

    protected $casts = [
        'Otp_Expires_At' => 'datetime',
        'Activo_Usuario' => 'boolean',
    ];

    public function archivos(): HasMany
    {
        return $this->hasMany(ArchivoExcel::class, 'ID_Usuario', 'ID_Usuario');
    }

    public function cargas(): HasMany
    {
        return $this->hasMany(CargaMalla::class, 'ID_Usuario', 'ID_Usuario');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(LogActividad::class, 'ID_Usuario', 'ID_Usuario');
    }

    public function isOtpValid(string $code): bool
    {
        if (!$this->Otp_Code || !$this->Otp_Expires_At) {
            return false;
        }

        if ($this->Otp_Expires_At->isPast()) {
            return false;
        }

        return hash_equals($this->Otp_Code, $code);
    }

    public function invalidateOtp(): void
    {
        $this->update([
            'Otp_Code' => null,
            'Otp_Expires_At' => null,
        ]);
    }
}