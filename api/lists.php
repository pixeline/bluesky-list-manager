<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Logging function
function log_debug($message, $data = null)
{
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    if ($data !== null) {
        $logEntry .= "\nData: " . json_encode($data, JSON_PRETTY_PRINT);
    }
    $logEntry .= "\n" . str_repeat('-', 80) . "\n";
    file_put_contents('debug.txt', $logEntry, FILE_APPEND | LOCK_EX);
}

log_debug("=== LISTS.PHP STARTED ===");
log_debug("Request method: " . $_SERVER['REQUEST_METHOD']);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    log_debug("OPTIONS request, exiting");
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    log_debug("Invalid method: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
log_debug("Input received", $input);

if (!isset($input['session'])) {
    log_debug("Missing session parameter");
    http_response_code(400);
    echo json_encode(['error' => 'Session is required']);
    exit;
}

$session = $input['session'];
log_debug("Processing lists request", [
    'sessionHandle' => $session['handle'] ?? 'unknown',
    'sessionDid' => $session['did'] ?? 'unknown'
]);

function get_user_lists($session)
{
    // Use the more efficient app.bsky.graph.getLists endpoint
    $url = "https://bsky.social/xrpc/app.bsky.graph.getLists?actor=" . urlencode($session['handle']);
    log_debug("Making request to Bluesky API", ['url' => $url]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . $session['accessJwt']
        ],
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    log_debug("Bluesky API response", [
        'httpCode' => $httpCode,
        'curlError' => $curlError,
        'responseLength' => strlen($response)
    ]);

    if ($httpCode !== 200) {
        log_debug("Bluesky API error", ['httpCode' => $httpCode, 'response' => $response]);
        throw new Exception('Failed to fetch user lists');
    }

    $data = json_decode($response, true);
    log_debug("Parsed Bluesky response", [
        'listsCount' => count($data['lists'] ?? []),
        'firstList' => $data['lists'][0] ?? null
    ]);

    return $data['lists'] ?? [];
}

try {
    $lists = get_user_lists($session);
    log_debug("Final result", [
        'listsCount' => count($lists),
        'sampleList' => $lists[0] ?? null
    ]);
    echo json_encode(['lists' => $lists]);
} catch (Exception $e) {
    log_debug("Exception occurred", ['error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

log_debug("=== LISTS.PHP COMPLETED ===");
