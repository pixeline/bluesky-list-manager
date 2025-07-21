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

if (!isset($input['handle']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Handle and password are required']);
    exit;
}

$handle = $input['handle'];
$password = $input['password'];

// Function to log in and get a token
function bluesky_login($handle, $appPassword)
{
    $url = 'https://bsky.social/xrpc/com.atproto.server.createSession';
    $payload = json_encode([
        'identifier' => $handle,
        'password' => $appPassword
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        throw new Exception($errorData['message'] ?? 'Authentication failed');
    }

    return json_decode($response, true);
}

try {
    $session = bluesky_login($handle, $password);
    echo json_encode($session);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['error' => $e->getMessage()]);
}
