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

log_debug("=== PROFILES.PHP STARTED ===");
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
log_debug("Input received", [
    'didsCount' => count($input['dids'] ?? []),
    'dids' => $input['dids'] ?? []
]);

if (!isset($input['session']) || !isset($input['dids'])) {
    log_debug("Missing required parameters", array_keys($input));
    http_response_code(400);
    echo json_encode(['error' => 'Session and dids are required']);
    exit;
}

$session = $input['session'];
$dids = $input['dids'];

log_debug("Processing profiles request", [
    'didsCount' => count($dids),
    'sessionHandle' => $session['handle'] ?? 'unknown'
]);

function get_profiles($session, $dids)
{
    if (empty($dids)) {
        log_debug("No DIDs provided, returning empty array");
        return [];
    }

    $profiles = [];
    $validDids = array_filter($dids, function ($did) {
        return $did && is_string($did) && strpos($did, 'did:') === 0 && strlen($did) > 10;
    });

    log_debug("Filtered DIDs", [
        'originalCount' => count($dids),
        'validCount' => count($validDids),
        'validDids' => $validDids
    ]);

    if (empty($validDids)) {
        log_debug("No valid DIDs found");
        return [];
    }

    // Use individual profile requests instead of batch endpoint due to API issues
    foreach ($validDids as $did) {
        try {
            $url = "https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=" . urlencode($did);

            log_debug("Making individual request to Bluesky API", ['url' => $url, 'did' => $did]);

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    "Authorization: Bearer " . $session['accessJwt']
                ],
                CURLOPT_TIMEOUT => 10,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            log_debug("Individual profile response", [
                'did' => $did,
                'httpCode' => $httpCode,
                'curlError' => $curlError,
                'responseLength' => strlen($response)
            ]);

            if ($httpCode === 200) {
                $data = json_decode($response, true);
                if (isset($data['data'])) {
                    $profiles[] = $data['data'];
                    log_debug("Successfully fetched profile", [
                        'did' => $did,
                        'handle' => $data['data']['handle'] ?? 'unknown'
                    ]);
                } else if (isset($data['did'])) {
                    // Profile data is returned directly, not wrapped in 'data' field
                    $profiles[] = $data;
                    log_debug("Successfully fetched profile (direct response)", [
                        'did' => $did,
                        'handle' => $data['handle'] ?? 'unknown'
                    ]);
                } else {
                    log_debug("Profile response missing expected fields", [
                        'did' => $did,
                        'response' => $response
                    ]);
                }
            } else {
                log_debug("Failed to fetch individual profile", [
                    'did' => $did,
                    'httpCode' => $httpCode,
                    'response' => $response
                ]);
            }
        } catch (Exception $e) {
            log_debug("Exception fetching individual profile", [
                'did' => $did,
                'error' => $e->getMessage()
            ]);
        }
    }

    log_debug("Completed individual profile requests", [
        'requestedCount' => count($validDids),
        'successfulCount' => count($profiles)
    ]);

    return $profiles;
}

try {
    $profiles = get_profiles($session, $dids);
    log_debug("Final profiles result", [
        'profilesCount' => count($profiles),
        'sampleProfile' => $profiles[0] ?? null
    ]);
    echo json_encode(['profiles' => $profiles]);
} catch (Exception $e) {
    log_debug("Profiles exception", ['error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

log_debug("=== PROFILES.PHP COMPLETED ===");
