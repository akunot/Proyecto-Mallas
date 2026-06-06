<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
use Illuminate\Support\Facades\DB;

echo "=== COMPONENTES ===\n";
foreach (DB::table('componentes')->get() as $c) {
    echo "ID={$c->ID_Componente} Nombre={$c->Nombre_Componente}\n";
}

echo "\n=== ASIGNATURAS for Adm Empresas courses ===\n";
$codes = ['1000004','1000005','4100630','4100578','4100579','4100645','4100550','4100622','4100623','4100646','4100642','4100643','4100683','4100618','4100617','4100614','4100615','4100539','4100631','4100628','4100635','4100629','4100641','4100591','4100648','4100626','4100621','4100636','4100637','4100634','4100624','4100632','4100633','1000044','1000045','1000046','1000047'];
$asigs = DB::table('asignaturas')->whereIn('Codigo_Base', $codes)->select('Codigo_Base','Nombre_Asignatura','Creditos_Asignatura')->get();
foreach ($asigs as $a) {
    echo "{$a->Codigo_Base}: {$a->Nombre_Asignatura} ({$a->Creditos_Asignatura} cred)\n";
}
echo "Found: " . $asigs->count() . "/" . count($codes) . "\n";
