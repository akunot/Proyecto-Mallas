<?php

namespace App\Console\Commands;

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\ArchivoExcel;
use App\Models\CargaMalla;
use App\Models\ErrorCarga;
use App\Models\LogActividad;
use App\Models\MallaCurricular;
use App\Models\SlotAgrupacion;
use App\Services\MallaVisualizerService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Elimina por completo una carga ya aprobada (malla activa) y, por defecto,
 * reactiva la malla que estaba vigente antes de esa aprobación.
 *
 * Uso:
 *   php artisan mallas:eliminar-carga 95 --dry-run   (solo muestra qué se haría)
 *   php artisan mallas:eliminar-carga 95             (pide confirmación y ejecuta)
 */
class EliminarCargaAprobada extends Command
{
    protected $signature = 'mallas:eliminar-carga
        {carga : ID de la carga (el número # que aparece en la lista de cargas)}
        {--dry-run : Solo muestra el resumen, no borra nada}
        {--sin-restaurar : No reactivar la malla anterior del programa}
        {--restaurar= : ID_Malla a reactivar (si no se quiere la detectada automáticamente)}
        {--usuario= : ID_Usuario que queda registrado en la auditoría}
        {--force : No pedir confirmación}';

    protected $description = 'Elimina una carga aprobada y su malla activa, restaurando la malla anterior';

    public function handle(): int
    {
        $cargaId = (int) $this->argument('carga');
        $carga = CargaMalla::with(['malla.normativa', 'programa', 'usuario'])->find($cargaId);

        if (! $carga) {
            $this->error("No existe la carga #{$cargaId}.");

            return self::FAILURE;
        }

        $malla = $carga->malla;
        if (! $malla) {
            $this->error("La carga #{$cargaId} no tiene malla asociada.");

            return self::FAILURE;
        }

        // Otras cargas que usan esta malla como su malla principal: no se puede borrar sin decidir qué hacer con ellas.
        $otrasCargasMismaMalla = CargaMalla::where('ID_Malla', $malla->ID_Malla)
            ->where('ID_Carga', '!=', $cargaId)->pluck('ID_Carga');
        if ($otrasCargasMismaMalla->isNotEmpty()) {
            $this->error('La malla también pertenece a las cargas: #'.$otrasCargasMismaMalla->implode(', #').'. Se cancela.');

            return self::FAILURE;
        }

        // Cargas posteriores que usan esta malla como base de comparación (se les quita la referencia).
        $cargasConBase = CargaMalla::where('ID_Malla_Base', $malla->ID_Malla)
            ->where('ID_Carga', '!=', $cargaId)->get(['ID_Carga', 'Estado_Carga']);

        $agrupacionIds = Agrupacion::where('ID_Malla', $malla->ID_Malla)->pluck('ID_Agrupacion');
        $nAgrupAsig = AgrupacionAsignatura::where('ID_Malla', $malla->ID_Malla)
            ->orWhereIn('ID_Agrupacion', $agrupacionIds)->count();
        $nSlots = SlotAgrupacion::whereIn('ID_Agrupacion', $agrupacionIds)->count();
        $nErrores = ErrorCarga::where('ID_Carga', $cargaId)->count();

        $mallaRestaurar = $this->resolverMallaRestaurar($carga, $malla);

        // ── Resumen ──
        $programa = $carga->programa?->Nombre_Programa ?? "ID {$carga->ID_Programa}";
        $norma = $malla->normativa
            ? trim(($malla->normativa->Tipo_Normativa ?? '').' '.($malla->normativa->Numero_Normativa ?? '').' de '.($malla->normativa->Anio_Normativa ?? ''))
            : '—';

        $this->newLine();
        $this->info("Carga #{$cargaId}");
        $this->table(['Campo', 'Valor'], [
            ['Programa', $programa],
            ['Normativa', $norma],
            ['Estado carga', $carga->Estado_Carga],
            ['Subida por', $carga->usuario?->Nombre_Usuario ?? "ID {$carga->ID_Usuario}"],
            ['Malla', "ID {$malla->ID_Malla} · versión {$malla->Version_Numero} · estado {$malla->Estado} · vigente ".($malla->Es_Vigente ? 'sí' : 'no')],
        ]);

        $this->info('Se eliminará:');
        $this->table(['Elemento', 'Cantidad'], [
            ['Asignaturas en agrupaciones (agrupacion_asignatura)', $nAgrupAsig],
            ['Slots de agrupación', $nSlots],
            ['Agrupaciones', $agrupacionIds->count()],
            ['Errores de carga', $nErrores],
            ['Archivos Excel no usados por otras cargas', count($this->archivosHuerfanos($carga))],
            ['Malla curricular', 1],
            ['Carga', 1],
        ]);

        if ($cargasConBase->isNotEmpty()) {
            $this->warn('Estas cargas usaban la malla como base de comparación y quedarán sin base: #'
                .$cargasConBase->pluck('ID_Carga')->implode(', #'));
        }

        if ($malla->Es_Vigente) {
            if ($mallaRestaurar) {
                $this->info("Se reactivará la malla anterior: ID {$mallaRestaurar->ID_Malla} (versión {$mallaRestaurar->Version_Numero}, estado actual {$mallaRestaurar->Estado}).");
            } else {
                $this->warn('El programa quedará SIN malla vigente (no se restaurará ninguna).');
            }
        }

        $this->line('Las asignaturas del catálogo y los requisitos (que son por programa) NO se tocan.');
        $this->newLine();

        if ($this->option('dry-run')) {
            $this->comment('Modo --dry-run: no se modificó nada.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm("¿Eliminar definitivamente la carga #{$cargaId} y su malla? Haz un respaldo antes.", false)) {
            $this->comment('Cancelado.');

            return self::SUCCESS;
        }

        // ── Ejecución ──
        DB::transaction(function () use ($carga, $malla, $agrupacionIds, $cargasConBase, $mallaRestaurar, $cargaId) {
            $mallaId = $malla->ID_Malla;
            $eraVigente = (bool) $malla->Es_Vigente;
            $archivos = $this->archivosHuerfanos($carga);

            AgrupacionAsignatura::where('ID_Malla', $mallaId)
                ->orWhereIn('ID_Agrupacion', $agrupacionIds)->delete();
            SlotAgrupacion::whereIn('ID_Agrupacion', $agrupacionIds)->delete();
            Agrupacion::whereIn('ID_Agrupacion', $agrupacionIds)->delete();

            if ($cargasConBase->isNotEmpty()) {
                CargaMalla::whereIn('ID_Carga', $cargasConBase->pluck('ID_Carga'))->update(['ID_Malla_Base' => null]);
            }

            ErrorCarga::where('ID_Carga', $cargaId)->delete();
            $carga->delete();

            ArchivoExcel::whereIn('ID_Archivo', $archivos)->delete();

            $malla->delete();

            if ($eraVigente && $mallaRestaurar) {
                $mallaRestaurar->update([
                    'Estado' => 'activa',
                    'Es_Vigente' => 1,
                    'Fecha_Fin_Vigencia' => null,
                ]);
            }

            LogActividad::create([
                'ID_Usuario' => $this->option('usuario') ? (int) $this->option('usuario') : null,
                'Accion_Log' => 'ELIMINAR_CARGA_APROBADA',
                'Entidad_Log' => 'carga_malla',
                'Entidad_ID_Log' => $cargaId,
                'Detalle_Log' => [
                    'malla_id' => $mallaId,
                    'programa_id' => $carga->ID_Programa,
                    'malla_restaurada_id' => ($eraVigente && $mallaRestaurar) ? $mallaRestaurar->ID_Malla : null,
                    'origen' => 'artisan mallas:eliminar-carga',
                    'ip' => '127.0.0.1',
                    'user_agent' => 'CLI',
                ],
                'IP_Origen_Log' => '127.0.0.1',
            ]);
        });

        // Invalida la caché del visualizador público para que deje de mostrar la malla borrada.
        MallaVisualizerService::flush();

        $this->info("Carga #{$cargaId} y su malla eliminadas correctamente.");

        return self::SUCCESS;
    }

    /**
     * Malla que debe volver a quedar vigente. Orden de preferencia:
     * --restaurar, la registrada en el log de aprobación, la malla base de la carga,
     * y por último la última versión archivada del programa.
     */
    private function resolverMallaRestaurar(CargaMalla $carga, MallaCurricular $malla): ?MallaCurricular
    {
        if ($this->option('sin-restaurar')) {
            return null;
        }

        $candidatos = [];

        if ($this->option('restaurar')) {
            $candidatos[] = (int) $this->option('restaurar');
        } else {
            $log = LogActividad::where('Accion_Log', 'APROBAR_MALLA')
                ->where('Entidad_Log', 'carga_malla')
                ->where('Entidad_ID_Log', $carga->ID_Carga)
                ->latest('ID_Log')->first();
            $detalle = is_array($log?->Detalle_Log) ? $log->Detalle_Log : json_decode((string) $log?->Detalle_Log, true);
            if (! empty($detalle['malla_anterior_id'])) {
                $candidatos[] = (int) $detalle['malla_anterior_id'];
            }
            if ($carga->ID_Malla_Base) {
                $candidatos[] = (int) $carga->ID_Malla_Base;
            }
        }

        foreach ($candidatos as $id) {
            $m = MallaCurricular::where('ID_Malla', $id)
                ->where('ID_Programa', $malla->ID_Programa)
                ->where('ID_Malla', '!=', $malla->ID_Malla)
                ->first();
            if ($m) {
                return $m;
            }
        }

        if ($this->option('restaurar')) {
            return null;
        }

        return MallaCurricular::where('ID_Programa', $malla->ID_Programa)
            ->where('ID_Malla', '!=', $malla->ID_Malla)
            ->where('Estado', 'archivada')
            ->orderByDesc('Version_Numero')
            ->orderByDesc('Fecha_Fin_Vigencia')
            ->first();
    }

    /** IDs de archivos Excel de la carga que ninguna otra carga usa. */
    private function archivosHuerfanos(CargaMalla $carga): array
    {
        $ids = array_filter([$carga->ID_Archivo_Malla, $carga->ID_Archivo_Asignaturas, $carga->ID_Archivo_Electivas]);

        return array_values(array_filter(array_unique($ids), function ($id) use ($carga) {
            return ! CargaMalla::where('ID_Carga', '!=', $carga->ID_Carga)
                ->where(fn ($q) => $q->where('ID_Archivo_Malla', $id)
                    ->orWhere('ID_Archivo_Asignaturas', $id)
                    ->orWhere('ID_Archivo_Electivas', $id))
                ->exists();
        }));
    }
}
