<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class Programa extends Model
{
    use HasFactory;

    /**
     * Clave del caché del listado público de programas activos (routes/web.php).
     * Se centraliza aquí para que cualquier cambio en un programa pueda
     * invalidarla sin duplicar el literal en varios archivos.
     */
    public const CACHE_KEY_ACTIVOS = 'programas_activos';

    protected $table = 'programas';

    protected $primaryKey = 'ID_Programa';

    public $incrementing = true;

    protected $keyType = 'int';

    protected $fillable = [
        'Codigo_Facultad',
        'Codigo_Programa',
        'Nombre_Programa',
        'Titulo_Otorgado',
        'Nivel_Formacion',
        'Creditos_Totales',
        'Duracion_Semestres',
        'Codigo_SNIES',
        'Url_Programa',
        'Campus_Programa',
        'Conmutador',
        'Extension',
        'Correo',
        'Area_Curricular',
        'Ruta_Imagen',
        'Esta_Activo',
    ];

    /**
     * Atributos calculados incluidos al serializar el modelo (API e Inertia):
     * Url_Imagen resuelve la URL pública de la imagen del programa.
     */
    protected $appends = ['Url_Imagen'];

    /**
     * Invalida el caché del listado público cuando cambia cualquier programa.
     * Sin esto, un programa nuevo, su imagen o su desactivación no se reflejaban
     * en el inicio hasta que expirara el TTL de 5 minutos del Cache::remember
     * definido en routes/web.php.
     */
    protected static function booted(): void
    {
        $invalidar = static function (): void {
            Cache::forget(self::CACHE_KEY_ACTIVOS);
        };

        static::saved($invalidar);
        static::deleted($invalidar);
    }

    /**
     * URL pública de la imagen del programa.
     * - Rutas absolutas (http/https o "/...") se respetan tal cual.
     * - Rutas relativas apuntan al disco "public" (storage/app/public), que se
     *   publica con el symlink /storage (creado por docker-entrypoint.sh).
     */
    public function getUrlImagenAttribute(): ?string
    {
        if (! $this->Ruta_Imagen) {
            return null;
        }

        if (str_starts_with($this->Ruta_Imagen, '/') || str_starts_with($this->Ruta_Imagen, 'http://') || str_starts_with($this->Ruta_Imagen, 'https://')) {
            return $this->Ruta_Imagen;
        }

        return '/storage/'.$this->Ruta_Imagen;
    }

    public function facultad(): BelongsTo
    {
        return $this->belongsTo(Facultad::class, 'Codigo_Facultad', 'Codigo_Facultad');
    }

    public function normativas(): HasMany
    {
        return $this->hasMany(Normativa::class, 'Codigo_Programa', 'Codigo_Programa');
    }

    public function mallas(): HasMany
    {
        return $this->hasMany(MallaCurricular::class, 'ID_Programa', 'ID_Programa');
    }

    public function mallaVigente()
    {
        return $this->hasOne(MallaCurricular::class, 'ID_Programa', 'ID_Programa')
            ->where('Es_Vigente', 1);
    }

    public function electivas(): BelongsToMany
    {
        return $this->belongsToMany(
            Asignatura::class,
            'programa_electivas',
            'ID_Programa',
            'ID_Asignatura'
        );
    }
}
