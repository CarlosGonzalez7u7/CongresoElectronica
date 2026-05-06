<?php
/**
 * API: GENERAR CÓDIGO QR EN SVG
 * GET /api/get-qr.php?folio=RENOV-...
 *
 * Genera un código QR localmente en formato SVG sin dependencias externas
 */

// Validar método
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

try {
    // Obtener parámetros: folio (compatibilidad) o text (preferido)
    $folio = $_GET['folio'] ?? null;
    $text = $_GET['text'] ?? null;

    if (!$folio && !$text) {
        throw new Exception('Folio o texto requerido');
    }

    // Priorizar 'text' si está presente
    $content = $text !== null ? $text : $folio;

    // Validar longitud solo si se usa folio
    if ($text === null && strlen($folio) > 50) {
        throw new Exception('Folio demasiado largo');
    }

    // Validar tamaño
    $sizeRaw = isset($_GET['size']) ? (int)$_GET['size'] : 400;
    $size = max(120, min(1000, $sizeRaw));

    // Generar QR en SVG
    $svg = generateQRCode($content, $size);

    // Devolver SVG
    header('Content-Type: image/svg+xml');
    header('Cache-Control: public, max-age=86400');
    echo $svg;
    exit;

} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit;
}

/**
 * Genera un código QR en formato SVG
 * Soporta modo alfanumérico con corrección de errores H
 */
function generateQRCode(string $text, int $size): string
{
    // Determinar versión basada en longitud (para alfanumémicos)
    // Versión 1: 21 módulos, capacidad alfanumérica ~25 chars con EC H
    // Versión 2: 25 módulos, capacidad alfanumérica ~47 chars con EC H
    $version = determineVersion($text);
    $modules = $version * 4 + 17; // 17, 21, 25, 29...

    // Construir matriz de módulos
    $matrix = [];

    // Inicializar matriz con null (sin asignar)
    for ($i = 0; $i < $modules; $i++) {
        $matrix[$i] = array_fill(0, $modules, null);
    }

    // 1. Patrones de buscador (finder patterns) - 3 cuadrantes
    addFinderPattern($matrix, 0, 0, $modules); // superior izquierdo
    addFinderPattern($matrix, $modules - 7, 0, $modules); // inferior izquierdo
    addFinderPattern($matrix, 0, $modules - 7, $modules); // superior derecho

    // 2. Patrón de sincronización (timing pattern) - líneas entre buscadores
    for ($i = 8; $i < $modules - 8; $i++) {
        $matrix[6][$i] = ($i % 2 == 0) ? 1 : 0;
        $matrix[$i][6] = ($i % 2 == 0) ? 1 : 0;
    }

    // 3. Patrón de alineación (alignment pattern) - para versión >= 2
    if ($version >= 2) {
        // Posiciones predefinidas para versión 2 (25x25)
        $alignmentPositions = [6, $modules - 7];
        if ($version == 2) {
            $alignmentPositions = [6, 18, $modules - 7]; // versión 2: 3 patrones
        }
        foreach ($alignmentPositions as $ax) {
            foreach ($alignmentPositions as $ay) {
                // No colocar sobre patrones de buscador o timing
                if (($ax == 6 || $ax == $modules - 7) && ($ay == 6 || $ay == $modules - 7)) continue;
                if ($ax == 6 && $ay < $modules - 7) continue;
                if ($ay == 6 && $ax < $modules - 7) continue;
                addAlignmentPattern($matrix, $ax - 2, $ay - 2);
            }
        }
    }

    // 4. Zona reservada para formato e información de versión
    markReservedAreas($matrix, $modules, $version);

    // 5. Codificar datos en bitstream
    $bits = encodeData($text, $version);

    // 6. Añadir terminador y rellenar hasta capacidad de codewords
    $totalCodewords = getTotalCodewords($version);
    $bits = padBitstream($bits, $totalCodewords * 8);

    // 7. Dividir en bloques y generar corrección de errores ( Reed-Solomon )
    $codewords = bitsToCodewords($bits);
    list($dataBlocks, $ecBlocks) = interleaveBlocks($codewords, $version);

    // 8. Intercalar datos y EC codewords
    $finalStream = interleaveDataAndEC($dataBlocks, $ecBlocks);

    // 9. Colocar bits en matriz con máscara
    $maskPattern = 0; // Máscara 000
    applyDataToMatrix($finalStream, $matrix, $modules, $maskPattern);

    // 10. Generar SVG
    return renderSVG($matrix, $size);
}

/**
 * Determina la versión QR basada en longitud del texto (modo alfanumérico)
 */
function determineVersion(string $text): int
{
    $len = strlen($text);
    // Capacidades alfanuméricas con EC Level H (más conservador)
    // Version 1: 25 chars (max teórico), usamos 20 para margen
    if ($len <= 20) return 1;
    // Version 2: 47 chars
    if ($len <= 45) return 2;
    // Version 3: 77 chars - ya no cabría, limitamos
    throw new Exception('Folio demasiado largo para versión QR soportada (máx ~45 caracteres)');
}

/**
 * Añade patrón de buscador 7x7
 */
function addFinderPattern(array &$matrix, int $x, int $y, int $modules): void
{
    // Patrón: borde negro, interior blanco, centro negro 3x3
    for ($i = 0; $i < 7; $i++) {
        for ($j = 0; $j < 7; $j++) {
            $px = $x + $i;
            $py = $y + $j;
            if ($px >= $modules || $py >= $modules) continue;
            if ($i == 0 || $i == 6 || $j == 0 || $j == 6) {
                $matrix[$py][$px] = 1; // borde negro
            } elseif ($i >= 2 && $i <= 4 && $j >= 2 && $j <= 4) {
                $matrix[$py][$px] = 1; // centro negro
            } else {
                $matrix[$py][$px] = 0; // interior blanco
            }
        }
    }
}

/**
 * Añade patrón de alineación 5x5
 */
function addAlignmentPattern(array &$matrix, int $x, int $y): void
{
    for ($i = 0; $i < 5; $i++) {
        for ($j = 0; $j < 5; $j++) {
            if (($i == 0 || $i == 4 || $j == 0 || $j == 4) ||
                ($i == 2 && $j == 2)) {
                $matrix[$y + $i][$x + $j] = 1;
            } else {
                $matrix[$y + $i][$x + $j] = 0;
            }
        }
    }
}

/**
 * Marca áreas reservadas (formato, versión)
 */
function markReservedAreas(array &$matrix, int $modules, int $version): void
{
    // Área de formato (alrededor de buscadores)
    // Superior izquierdo
    for ($i = 0; $i < 9; $i++) {
        if ($i != 6) $matrix[8][$i] = 'format';
        if ($i != 6) $matrix[$i][8] = 'format';
    }
    // Inferior izquierdo
    for ($i = $modules - 8; $i < $modules; $i++) {
        $matrix[$modules - 8][$i] = 'format';
    }
    // Superior derecho
    for ($i = $modules - 8; $i < $modules; $i++) {
        $matrix[$i][$modules - 8] = 'format';
    }

    // Información de versión (para >= versión 7, no aplica aquí)
}

/**
 * Codifica datos en bitstream (modo alfanumérico)
 */
function encodeData(string $text, int $version): string
{
    $bits = '';

    // Mode indicator: alfanumérico = 0010 (4 bits)
    $bits .= '0010';

    // Character count indicator
    // Para versión 1-9, alfanumérico: 9 bits
    $len = strlen($text);
    $bits .= str_pad(decbin($len), 9, '0', STR_PAD_LEFT);

    // Codificar cada par de caracteres
    $alphanumericTable = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
    for ($i = 0; $i < $len; $i += 2) {
        if ($i + 1 < $len) {
            // Par de caracteres
            $c1 = strpos($alphanumericTable, $text[$i]);
            $c2 = strpos($alphanumericTable, $text[$i + 1]);
            if ($c1 === false || $c2 === false) {
                throw new Exception('Caracter no válido para modo alfanumérico');
            }
            $value = $c1 * 45 + $c2;
            $bits .= str_pad(decbin($value), 11, '0', STR_PAD_LEFT);
        } else {
            // Carácter impar
            $c1 = strpos($alphanumericTable, $text[$i]);
            if ($c1 === false) {
                throw new Exception('Caracter no válido para modo alfanumérico');
            }
            $bits .= str_pad(decbin($c1), 6, '0', STR_PAD_LEFT);
        }
    }

    return $bits;
}

/**
 * Añade terminador y rellena hasta capacidad
 */
function padBitstream(string $bits, int $totalBits): string
{
    // Añadir terminador (hasta 4 ceros)
    $terminator = str_repeat('0', min(4, $totalBits - strlen($bits)));
    $bits .= $terminator;

    // Rellenar hasta múltiplo de 8
    while (strlen($bits) % 8 !== 0) {
        $bits .= '0';
    }

    // Añadir bytes de relleno (pad) si es necesario
    $padBytes = [236, 17]; // Secuencia de relleno
    $padIndex = 0;
    while (strlen($bits) < $totalBits) {
        $bits .= str_pad(decbin($padBytes[$padIndex]), 8, '0', STR_PAD_LEFT);
        $padIndex = 1 - $padIndex;
    }

    return $bits;
}

/**
 * Convierte bitstream a array de codewords
 */
function bitsToCodewords(string $bits): array
{
    $codewords = [];
    for ($i = 0; $i < strlen($bits); $i += 8) {
        $byte = bindec(substr($bits, $i, 8));
        $codewords[] = $byte;
    }
    return $codewords;
}

/**
 * Obtiene total de codewords para una versión
 */
function getTotalCodewords(int $version): int
{
    // Para versión 1: 26 codewords de datos (EC Level H)
    // Para versión 2: 44 codewords de datos (EC Level H)
    $table = [
        1 => 26,
        2 => 44,
    ];
    return $table[$version] ?? 44;
}

/**
 * Divide en bloques y genera corrección de errores (simplificado)
 * Usamos tablas pre-calculadas para version 1 y 2 con EC Level H
 */
function interleaveBlocks(array $codewords, int $version): array
{
    // Para simplificar, usamos una única tabla de EC cuando el texto es corto
    // Versión 1, EC H: 9 bloques de datos, 9 bloques EC de 10 cw cada uno?
    // En realidad para QR EC H:
    // Ver1-H: 1 bloque, 9 ec codewords (total 26 = 17+9)
    // Ver2-H: 1 bloque, 18 ec codewords (total 44 = 26+18)

    $totalCodewords = getTotalCodewords($version);
    $dataCodewords = ($version == 1) ? 17 : 26;

    // Asegurar que tenemos suficientes codewords de datos
    $dataBlock = array_slice($codewords, 0, $dataCodewords);
    if (count($dataBlock) < $dataCodewords) {
        $dataBlock = array_pad($dataBlock, $dataCodewords, 0);
    }

    // Generar EC codewords usando polinomio generador estándar
    $ecCount = $totalCodewords - $dataCodewords;
    $ecBlock = generateReedSolomon($dataBlock, $ecCount);

    return [[$dataBlock], [$ecBlock]];
}

/**
 * Genera códigos de corrección Reed-Solomon
 * Polinomio generador para QR: x^8 + x^7 + x^6 + x^5 + x^3 + x^2 + 1 (0x12F) o similares
 * Usamos una tabla de galois field pre-calculada para simplicidad
 */
function generateReedSolomon(array $data, int $ecCount): array
{
    // Galois Field 256 con prim poly 0x11d (QR estándar)
    // Para simplificar, usamos una implementación directa del algoritmo RS

    $gfExp = [];
    $gfLog = [];
    $x = 1;
    for ($i = 0; $i < 255; $i++) {
        $gfExp[$i] = $x;
        $gfLog[$x] = $i;
        $x = gfMulNoLUT($x, 2);
    }

    // Expandir la tabla para índices hasta 2*255
    for ($i = 255; $i < 510; $i++) {
        $gfExp[$i] = $gfExp[$i - 255];
    }

    // Generar polinomio generador de grado ecCount
    $g = [1];
    for ($i = 0; $i < $ecCount; $i++) {
        $g = polyMul($g, [0, $gfExp[$i]]);
    }

    // Añadir ceros al final de los datos (ecCount bytes)
    $msg = array_merge($data, array_fill(0, $ecCount, 0));

    // División polinómica
    for ($i = 0; $i < count($data); $i++) {
        $coef = $msg[$i];
        if ($coef != 0) {
            $log = $gfLog[$coef];
            for ($j = 0; $j < count($g); $j++) {
                $msg[$i + $j] ^= gfMulNoLUT($g[$j], $gfExp[($log + $j) % 255]);
            }
        }
    }

    return array_slice($msg, count($data), $ecCount);
}

function gfMulNoLUT($x, $y) {
    // Multiplicación en GF(2^8) con prim poly 0x11d
    $z = 0;
    while ($y != 0) {
        if ($y & 1) $z ^= $x;
        $x <<= 1;
        if ($x & 0x100) $x ^= 0x11d;
        $y >>= 1;
    }
    return $z & 0xFF;
}

function polyMul(array $a, array $b): array {
    $result = array_fill(0, count($a) + count($b) - 1, 0);
    for ($i = 0; $i < count($a); $i++) {
        for ($j = 0; $j < count($b); $j++) {
            $result[$i + $j] ^= gfMulNoLUT($a[$i], $b[$j]);
        }
    }
    return $result;
}

/**
 * Intercala bloques de datos y EC
 */
function interleaveDataAndEC(array $dataBlocks, array $ecBlocks): array {
    // Para este QR simple: un solo bloque cada uno
    $data = $dataBlocks[0];
    $ec = $ecBlocks[0];
    return array_merge($data, $ec);
}

/**
 * Coloca datos en la matriz con máscara
 */
function applyDataToMatrix(array $finalStream, array &$matrix, int $modules, int $mask): void
{
    $bitIndex = 0;
    $totalBits = count($finalStream) * 8;

    // Dirección de llenado: de derecha a izquierda en columnas pares, izquierda a derecha en impares
    $col = $modules - 1;
    while ($col > 0) {
        if ($col == 6) $col--; // Saltar columna de timing

        // Dirección de la columna
        $direction = ($col % 2 == 0) ? -1 : 1; // par: hacia arriba, impar: hacia abajo
        $row = ($direction == -1) ? $modules - 1 : 0;

        for ($i = 0; $i < $modules; $i++) {
            for ($v = 0; $v < 2; $v++) {
                $r = $row + ($direction * $v);
                $c = $col;
                if ($r >= 0 && $r < $modules && $c >= 0 && $c < $modules) {
                    if ($matrix[$r][$c] === null) {
                        // Obtener bit del stream
                        $byteIndex = intdiv($bitIndex, 8);
                        $bitInByte = 7 - ($bitIndex % 8);
                        $bit = ($finalStream[$byteIndex] >> $bitInByte) & 1;
                        // Aplicar máscara
                        $matrix[$r][$c] = applyMask($bit, $r, $c, $mask);
                        $bitIndex++;
                    }
                }
            }
        }
        $col -= 2;
    }
}

/**
 * Aplica máscara a un bit
 */
function applyMask(int $bit, int $row, int $col, int $mask): int
{
    $masked = $bit;
    switch ($mask) {
        case 0: // (row + col) % 2 == 0
            $masked = (($row + $col) % 2 == 0) ? $bit ^ 1 : $bit;
            break;
        case 1: // row % 2 == 0
            $masked = ($row % 2 == 0) ? $bit ^ 1 : $bit;
            break;
        case 2: // col % 3 == 0
            $masked = ($col % 3 == 0) ? $bit ^ 1 : $bit;
            break;
        case 3: // (row + col) % 3 == 0
            $masked = ((($row + $col) % 3) == 0) ? $bit ^ 1 : $bit;
            break;
        case 4: // (floor(row/2) + floor(col/3)) % 2 == 0
            $masked = ((intdiv($row, 2) + intdiv($col, 3)) % 2 == 0) ? $bit ^ 1 : $bit;
            break;
    }
    return $masked;
}

/**
 * Renderiza matriz como SVG escalable (viewBox por módulo, sin decimales).
 * El resultado escala perfectamente a cualquier tamaño CSS sin pixelarse.
 */
function renderSVG(array $matrix, int $size): string
{
    $modules = count($matrix);
    $quiet   = 4; // quiet zone en módulos (estándar QR)
    $total   = $modules + $quiet * 2;

    // Construir path de todos los módulos negros en coordenadas de módulo
    $path = '';
    for ($y = 0; $y < $modules; $y++) {
        for ($x = 0; $x < $modules; $x++) {
            $val = $matrix[$y][$x];
            if ($val === 1 || $val === 'format') {
                $px = $x + $quiet;
                $py = $y + $quiet;
                $path .= "M{$px},{$py}h1v1h-1z";
            }
        }
    }

    // SVG escalable: viewBox en unidades de módulo, width/height = size pedido
    $dim = (string)$size;
    $vb  = "0 0 {$total} {$total}";
    return <<<SVG
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{$dim}" height="{$dim}" viewBox="{$vb}" shape-rendering="crispEdges">
  <rect width="{$total}" height="{$total}" fill="#FFFFFF"/>
  <path d="{$path}" fill="#000000"/>
</svg>
SVG;
}