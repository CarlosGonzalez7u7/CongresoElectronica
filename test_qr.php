<?php
// Test QR generator
$_GET['folio'] = 'RENOV-12345';
$_GET['size'] = 260;

ob_start();
include 'C:/dev/congreso/app/api/get-qr.php';
$svg = ob_get_clean();

echo "Output length: " . strlen($svg) . " bytes\n";
echo "First 300 chars:\n";
echo substr($svg, 0, 300) . "\n";

$xml = simplexml_load_string($svg);
echo "Valid SVG: " . ($xml ? 'YES' : 'NO') . "\n";

if ($xml) {
    $rects = $xml->xpath('//rect');
    $blackRects = 0;
    foreach ($rects as $r) {
        if (isset($r['fill']) && (string)$r['fill'] === '#000000') {
            $blackRects++;
        }
    }
    echo "Black modules: $blackRects\n";
}
