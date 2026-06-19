<?php
require __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$spreadsheet = IOFactory::load(__DIR__ . '/../files_tests/FORMATO DE CARGA - OPTATIVA.xlsx');
$sheet = $spreadsheet->getSheet(0);
$rows = $sheet->toArray();

echo 'Total rows: ' . count($rows) . PHP_EOL;
echo 'Headers: ' . json_encode($rows[0], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL . PHP_EOL;

$sheetNames = $spreadsheet->getSheetNames();
echo 'Sheet names: ' . json_encode($sheetNames, JSON_UNESCAPED_UNICODE) . PHP_EOL . PHP_EOL;

for ($i = 1; $i < min(count($rows), 35); $i++) {
    echo 'Row ' . ($i+1) . ': ' . json_encode($rows[$i], JSON_UNESCAPED_UNICODE) . PHP_EOL;
}