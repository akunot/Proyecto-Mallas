<?php

namespace App\Jobs;

use App\Models\CargaMalla;
use App\Models\LogActividad;
use App\Models\MallaCurricular;
use App\Services\ExcelParserService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcesarExcelJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [30, 60, 120];

    public int $timeout = 120;

    private int $cargaId;

    public function __construct(int $cargaId)
    {
        $this->cargaId = $cargaId;
    }

    public function handle(ExcelParserService $parser): void
    {
        $carga = CargaMalla::findOrFail($this->cargaId);

        if ($carga->tipo_carga === 'malla' && ! $carga->ID_Malla) {
            $malla = MallaCurricular::create([
                'ID_Normativa' => $carga->ID_Normativa,
                'ID_Programa' => $carga->ID_Programa,
                'Version_Numero' => $this->getNextVersionNumber($carga->ID_Programa),
                'Fecha_Vigencia' => now()->toDateString(),
                'Estado' => 'borrador',
                'Es_Vigente' => 0,
            ]);
            $carga->update(['ID_Malla' => $malla->ID_Malla]);
        }

        $carga->update(['Estado_Carga' => 'validando']);

        try {
            $result = $parser->procesar($this->cargaId);

            $hasErrors = $result['errors_count'] > 0;

            if ($hasErrors) {
                $carga->update(['Estado_Carga' => 'con_errores']);
                if ($carga->malla) {
                    $carga->malla->update(['Estado' => 'borrador']);
                }
            } else {
                $carga->update(['Estado_Carga' => 'borrador']);
                if ($carga->malla) {
                    $carga->malla->update(['Estado' => 'borrador']);
                }
            }

            Log::info("Excel processing completed for carga {$this->cargaId}", $result);
        } catch (\Exception $e) {
            Log::error("Excel processing failed for carga {$this->cargaId}: ".$e->getMessage());

            $carga->update(['Estado_Carga' => 'con_errores']);
            if ($carga->malla) {
                $carga->malla->update(['Estado' => 'borrador']);
            }

            LogActividad::create([
                'ID_Usuario' => $carga->ID_Usuario,
                'Accion_Log' => 'PROCESS_EXCEL_FAILED',
                'Entidad_Log' => 'carga_malla',
                'Entidad_ID_Log' => $this->cargaId,
                'Detalle_Log' => json_encode(['error' => $e->getMessage()]),
            ]);

            throw $e;
        }
    }

    private function getNextVersionNumber(int $programaId): int
    {
        return MallaCurricular::where('ID_Programa', $programaId)->max('Version_Numero') + 1;
    }

    public function failed(\Throwable $exception): void
    {
        $carga = CargaMalla::find($this->cargaId);

        if ($carga) {
            $carga->update(['Estado_Carga' => 'con_errores']);

            if ($carga->malla) {
                $carga->malla->update(['Estado' => 'borrador']);
            }

            LogActividad::create([
                'Accion_Log' => 'PROCESS_EXCEL_FAILED',
                'Entidad_Log' => 'carga_malla',
                'Entidad_ID_Log' => $this->cargaId,
                'Detalle_Log' => json_encode([
                    'error' => $exception->getMessage(),
                    'tries' => $this->tries,
                ]),
            ]);
        }
    }
}
