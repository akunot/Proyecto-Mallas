<?php

namespace App\Http\Controllers\Api;

use App\Models\AgrupacionAsignatura;
use App\Models\MallaCurricular;
use App\Models\SlotAgrupacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class MallaController extends Controller
{
    public function reordenar(Request $request, int $mallaId): JsonResponse
    {
        $malla = MallaCurricular::findOrFail($mallaId);

        $validated = $request->validate([
            'cambios'                        => 'sometimes|array',
            'cambios.*.ID_Asignatura'        => 'required|integer|exists:asignaturas,ID_Asignatura',
            'cambios.*.Semestre_Sugerido'    => 'required|integer|min:0|max:20',
            'cambios.*.Orden'                => 'required|integer|min:0',
            'cambios_slots'                  => 'sometimes|array',
            'cambios_slots.*.ID_Slot'        => 'required|integer|exists:slots_agrupacion,ID_Slot',
            'cambios_slots.*.Semestre'       => 'required|integer|min:0|max:20',
            'cambios_slots.*.Orden'          => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($validated, $malla) {
            foreach ($validated['cambios'] ?? [] as $cambio) {
                AgrupacionAsignatura::where('ID_Malla', $malla->ID_Malla)
                    ->where('ID_Asignatura', $cambio['ID_Asignatura'])
                    ->update([
                        'Semestre_Sugerido' => $cambio['Semestre_Sugerido'],
                        'Orden'             => $cambio['Orden'],
                    ]);
            }
            foreach ($validated['cambios_slots'] ?? [] as $cambio) {
                SlotAgrupacion::where('ID_Slot', $cambio['ID_Slot'])
                    ->update([
                        'Semestre' => $cambio['Semestre'],
                        'Orden'    => $cambio['Orden'],
                    ]);
            }
        });

        return response()->json(['ok' => true]);
    }
}
