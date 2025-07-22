<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['handle'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Handle is required']);
    exit;
}

$handle = $input['handle'];

function resolve_handle($handle)
{
    $url = "https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=" . urlencode($handle);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception('Failed to resolve handle');
    }

    $result = json_decode($response, true);
    return $result['did'] ?? null;
}

try {
    $did = resolve_handle($handle);
    echo json_encode(['did' => $did]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
