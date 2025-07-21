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

if (!isset($input['session']) || !isset($input['userDid']) || !isset($input['listUri'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Session, userDid, and listUri are required']);
    exit;
}

$session = $input['session'];
$userDid = $input['userDid'];
$listUri = $input['listUri'];

function add_to_list($session, $userDid, $listUri)
{
    $url = 'https://bsky.social/xrpc/com.atproto.repo.createRecord';

    $record = [
        '$type' => 'app.bsky.graph.listitem',
        'subject' => $userDid,
        'list' => $listUri,
        'createdAt' => date('c')
    ];

    $payload = json_encode([
        'repo' => $session['did'],
        'collection' => 'app.bsky.graph.listitem',
        'record' => $record
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer " . $session['accessJwt']
        ],
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode < 200 || $httpCode >= 300) {
        $errorData = json_decode($response, true);
        throw new Exception($errorData['message'] ?? 'Failed to add to list');
    }

    return json_decode($response, true);
}

try {
    $result = add_to_list($session, $userDid, $listUri);
    echo json_encode(['success' => true, 'result' => $result]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
