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

if (!isset($input['session']) || !isset($input['listUri'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Session and listUri are required']);
    exit;
}

$session = $input['session'];
$listUri = $input['listUri'];

function get_list_members($session, $listUri)
{
    $listParts = explode('/', $listUri);
    $listOwnerDid = $listParts[2];

    $existingMembers = [];
    $cursor = null;
    $totalRecords = 0;

    do {
        $url = "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=" . urlencode($listOwnerDid) . "&collection=app.bsky.graph.listitem&limit=100";
        if ($cursor) {
            $url .= "&cursor=" . urlencode($cursor);
        }

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

        if ($httpCode !== 200) {
            error_log("Failed to fetch list members. HTTP Code: $httpCode. Response: $response");
            break;
        }

        $result = json_decode($response, true);

        if (isset($result['records'])) {
            $totalRecords += count($result['records']);
            foreach ($result['records'] as $record) {
                if (isset($record['value']['list']) && $record['value']['list'] === $listUri) {
                    $existingMembers[] = $record['value']['subject'];
                }
            }
        }

        $cursor = $result['cursor'] ?? null;
    } while ($cursor);

    return $existingMembers;
}

try {
    $members = get_list_members($session, $listUri);
    echo json_encode(['members' => $members]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
