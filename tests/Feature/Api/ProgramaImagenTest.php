<?php

use App\Models\Programa;
use App\Models\Usuario;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->usuario = Usuario::factory()->create();
    $this->programa = Programa::factory()->create();
});

test('subir imagen requiere autenticación', function () {
    $this->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen")
        ->assertStatus(401);
});

test('eliminar imagen requiere autenticación', function () {
    $this->deleteJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen")
        ->assertStatus(401);
});

test('sube una imagen válida', function () {
    $response = $this->actingAs($this->usuario)
        ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
            'imagen' => UploadedFile::fake()->image('logo.png', 400, 300),
        ]);

    $response->assertStatus(200);

    $ruta = $response->json('data.Ruta_Imagen');
    expect($ruta)->toStartWith('programas/');
    expect($ruta)->toEndWith('.png');
    expect(Storage::disk('public')->exists($ruta))->toBeTrue();
    expect($this->programa->fresh()->Ruta_Imagen)->toBe($ruta);
    expect($response->json('data.Url_Imagen'))->toBe('/storage/'.$ruta);
});

test('el archivo almacenado contiene la imagen real y no la salida cruda', function () {
    // Regresión: imagepng()/imagejpeg() con $file = null escriben al búfer de
    // salida y devuelven true, por lo que sin ob_start()/ob_get_clean() el
    // archivo guardado terminaba siendo 1 byte con el texto "1" y el binario
    // se filtraba a la respuesta HTTP.
    foreach ([['foto.png', 400, 300, 'image/png'], ['foto.jpg', 320, 240, 'image/jpeg']] as [$nombre, $ancho, $alto, $mime]) {
        $response = $this->actingAs($this->usuario)
            ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
                'imagen' => UploadedFile::fake()->image($nombre, $ancho, $alto),
            ]);

        $response->assertStatus(200);

        $ruta = $response->json('data.Ruta_Imagen');
        $contenido = Storage::disk('public')->get($ruta);

        expect(strlen($contenido))->toBeGreaterThan(100);

        $info = getimagesizefromstring($contenido);
        expect($info)->not->toBeFalse();
        expect($info[0])->toBe($ancho);
        expect($info[1])->toBe($alto);
        expect($info['mime'])->toBe($mime);

        // La respuesta HTTP no debe arrastrar los bytes de la imagen.
        expect($response->getContent())->not->toContain('PNG');
    }
});

test('rechaza un ejecutable disfrazado de imagen', function () {
    $response = $this->actingAs($this->usuario)
        ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
            'imagen' => UploadedFile::fake()->createWithContent(
                'malware.jpg',
                "MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF<?php echo 'pwned'; // ejecutable simulado"
            ),
        ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['imagen']);
    expect($this->programa->fresh()->Ruta_Imagen)->toBeNull();
});

test('rechaza archivos que no son imagen raster (svg)', function () {
    $response = $this->actingAs($this->usuario)
        ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
            'imagen' => UploadedFile::fake()->createWithContent(
                'vector.svg',
                '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>'
            ),
        ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['imagen']);
});

test('rechaza imagen mayor a 4 MB', function () {
    $response = $this->actingAs($this->usuario)
        ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
            'imagen' => UploadedFile::fake()->create('grande.jpg', 5000, 'image/jpeg'),
        ]);

    $response->assertStatus(422)->assertJsonValidationErrors(['imagen']);
});

test('rechaza dimensiones fuera de rango', function () {
    // Demasiado pequeña (mínimo 200x200).
    $this->actingAs($this->usuario)
        ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
            'imagen' => UploadedFile::fake()->image('peque.png', 60, 60),
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['imagen']);

    // Demasiado grande (máximo 4000x4000; 4001 de ancho supera el límite).
    $this->actingAs($this->usuario)
        ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
            'imagen' => UploadedFile::fake()->image('grande.png', 4001, 201),
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['imagen']);
});

test('reemplazo elimina la imagen anterior', function () {
    $primera = $this->actingAs($this->usuario)
        ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
            'imagen' => UploadedFile::fake()->image('a.png', 300, 300),
        ]);
    $ruta1 = $primera->json('data.Ruta_Imagen');
    expect(Storage::disk('public')->exists($ruta1))->toBeTrue();

    $segunda = $this->actingAs($this->usuario)
        ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
            'imagen' => UploadedFile::fake()->image('b.png', 320, 320),
        ]);
    $ruta2 = $segunda->json('data.Ruta_Imagen');

    expect($ruta2)->not->toBe($ruta1);
    expect(Storage::disk('public')->exists($ruta2))->toBeTrue();
    expect(Storage::disk('public')->exists($ruta1))->toBeFalse();
    expect($this->programa->fresh()->Ruta_Imagen)->toBe($ruta2);
});

test('eliminación limpia el archivo y el campo', function () {
    $subida = $this->actingAs($this->usuario)
        ->postJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen", [
            'imagen' => UploadedFile::fake()->image('a.png', 300, 300),
        ]);
    $ruta = $subida->json('data.Ruta_Imagen');

    $this->actingAs($this->usuario)
        ->deleteJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen")
        ->assertStatus(200);

    expect(Storage::disk('public')->exists($ruta))->toBeFalse();
    expect($this->programa->fresh()->Ruta_Imagen)->toBeNull();
});

test('eliminar sin imagen responde correctamente', function () {
    $this->actingAs($this->usuario)
        ->deleteJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen")
        ->assertStatus(200);

    expect($this->programa->fresh()->Ruta_Imagen)->toBeNull();
});

test('no elimina archivos fuera del directorio gestionado', function () {
    Storage::disk('public')->put('unal/images/escudo.png', 'contenido');
    $this->programa->update(['Ruta_Imagen' => 'unal/images/escudo.png']);

    $this->actingAs($this->usuario)
        ->deleteJson("/api/v1/programas/{$this->programa->ID_Programa}/imagen")
        ->assertStatus(200);

    // El archivo legacy/externo NO debe ser tocado.
    expect(Storage::disk('public')->exists('unal/images/escudo.png'))->toBeTrue();
    expect($this->programa->fresh()->Ruta_Imagen)->toBeNull();
});

test('Url_Imagen resuelve rutas del disco público', function () {
    expect(Programa::factory()->create(['Ruta_Imagen' => 'programas/x.jpg'])->Url_Imagen)
        ->toBe('/storage/programas/x.jpg');

    expect(Programa::factory()->create(['Ruta_Imagen' => '/images/programas/ARQUITECTURA.jpg'])->Url_Imagen)
        ->toBe('/images/programas/ARQUITECTURA.jpg');

    expect(Programa::factory()->create()->Url_Imagen)->toBeNull();
});
