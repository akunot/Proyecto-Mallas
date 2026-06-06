<?php
require 'vendor/autoload.php';
try {
    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile('C:/Users/Matri/Downloads/FORMATO -  AGRUPACIONES ADM. DE EMPRESAS (D).xlsx');
    $reader->setReadDataOnly(true);
    $spreadsheet = $reader->load('C:/Users/Matri/Downloads/FORMATO -  AGRUPACIONES ADM. DE EMPRESAS (D).xlsx');
    echo "Sheets: " . implode(", ", $spreadsheet->getSheetNames()) . "\n\n";

    echo "Sheets: " . implode(', ', $spreadsheet->getSheetNames()) . "\n\n";

    // Print all sheets
    foreach ($spreadsheet->getAllSheets() as $sheet) {
        echo "=== Sheet: " . $sheet->getTitle() . " ===\n";
        $rows = $sheet->toArray();
        foreach ($rows as $i => $row) {
            if (array_filter($row)) {
                echo "Row " . ($i+1) . ": " . implode(" | ", array_map(fn($v) => $v ?? '', $row)) . "\n";
            }
        }
        echo "\n";
    }
} catch(Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
