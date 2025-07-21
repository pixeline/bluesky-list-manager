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

function get_list_info($session, $listUri)
{
    $listParts = explode('/', $listUri);
    $listOwnerDid = $listParts[2];
    $listRkey = $listParts[4];

    $url = "https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=" . urlencode($listOwnerDid) . "&collection=app.bsky.graph.list&rkey=" . urlencode($listRkey);

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
        throw new Exception('Failed to fetch list info');
    }

    $data = json_decode($response, true);
    return $data['value'] ?? null;
}

try {
    $listInfo = get_list_info($session, $listUri);
    echo json_encode(['value' => $listInfo]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
