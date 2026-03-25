<?php

namespace App\Models;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Model implements Authenticatable
{
    use HasApiTokens;

    protected $table = 'usuarios';
    protected $primaryKey = 'ID_Usuario';
    public $incrementing = true;
    public $timestamps = false;

    protected $fillable = [
        'Nombre_Usuario',
        'Email_Usuario',
        'Password_Usuario',
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

    /**
     * Get the name of the unique identifier for the user.
     */
    public function getAuthIdentifierName(): string
    {
        return $this->getKeyName();
    }

    /**
     * Get the unique identifier for the user.
     */
    public function getAuthIdentifier(): mixed
    {
        return $this->{$this->getAuthIdentifierName()};
    }

    /**
     * Get the password for the user.
     */
    public function getAuthPassword(): ?string
    {
        return $this->Password_Usuario;
    }

    /**
     * Get the password hash column name.
     */
    public function getAuthPasswordName(): string
    {
        return 'Password_Usuario';
    }

    /**
     * Get the token value for the "remember me" session.
     */
    public function getRememberToken(): ?string
    {
        return null;
    }

    /**
     * Set the token value for the "remember me" session.
     */
    public function setRememberToken($value): void
    {
        // No-op: no se usa remember token en este sistema
    }

    /**
     * Get the column name for the "remember me" token.
     */
    public function getRememberTokenName(): ?string
    {
        return null;
    }

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
