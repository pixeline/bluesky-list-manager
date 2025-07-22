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

log_debug("=== LIST-MEMBERS.PHP STARTED ===");
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
    'listUri' => $input['listUri'] ?? 'missing',
    'sessionHandle' => $input['session']['handle'] ?? 'missing'
]);

if (!isset($input['session']) || !isset($input['listUri'])) {
    log_debug("Missing required parameters", array_keys($input));
    http_response_code(400);
    echo json_encode(['error' => 'Session and listUri are required']);
    exit;
}

$session = $input['session'];
$listUri = $input['listUri'];

log_debug("Processing list members request", [
    'listUri' => $listUri,
    'sessionHandle' => $session['handle'] ?? 'unknown'
]);

function get_list_members($session, $listUri)
{
    $listParts = explode('/', $listUri);
    $listOwnerDid = $listParts[2];

    log_debug("Extracted list owner DID", [
        'listUri' => $listUri,
        'listOwnerDid' => $listOwnerDid
    ]);

    $existingMembers = [];
    $cursor = null;
    $totalRecords = 0;
    $batchCount = 0;

    do {
        $batchCount++;
        $url = "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=" . urlencode($listOwnerDid) . "&collection=app.bsky.graph.listitem&limit=100";
        if ($cursor) {
            $url .= "&cursor=" . urlencode($cursor);
        }

        log_debug("Making batch request", [
            'batch' => $batchCount,
            'url' => $url,
            'cursor' => $cursor
        ]);

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
        curl_close($ch);

        log_debug("Batch response", [
            'batch' => $batchCount,
            'httpCode' => $httpCode,
            'responseLength' => strlen($response)
        ]);

        if ($httpCode !== 200) {
            log_debug("Failed to fetch list members", [
                'batch' => $batchCount,
                'httpCode' => $httpCode,
                'response' => $response
            ]);
            break;
        }

        $result = json_decode($response, true);

        if (isset($result['records'])) {
            $totalRecords += count($result['records']);
            $batchMembers = 0;
            foreach ($result['records'] as $record) {
                if (isset($record['value']['list']) && $record['value']['list'] === $listUri) {
                    $existingMembers[] = $record['value']['subject'];
                    $batchMembers++;
                }
            }

            log_debug("Batch processed", [
                'batch' => $batchCount,
                'totalRecords' => count($result['records']),
                'matchingMembers' => $batchMembers,
                'totalMembersSoFar' => count($existingMembers)
            ]);
        }

        $cursor = $result['cursor'] ?? null;
    } while ($cursor);

    log_debug("List members processing completed", [
        'totalRecordsProcessed' => $totalRecords,
        'totalMatchingMembers' => count($existingMembers),
        'listUri' => $listUri
    ]);

    return $existingMembers;
}

try {
    $members = get_list_members($session, $listUri);
    log_debug("Final result", [
        'membersCount' => count($members),
        'sampleMembers' => array_slice($members, 0, 3)
    ]);
    echo json_encode(['members' => $members]);
} catch (Exception $e) {
    log_debug("Exception occurred", ['error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

log_debug("=== LIST-MEMBERS.PHP COMPLETED ===");
