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

if (!isset($input['session']) || !isset($input['query'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Session and query are required']);
    exit;
}

$session = $input['session'];
$query = $input['query'];
$limit = $input['limit'] ?? 25;
$cursor = $input['cursor'] ?? null;

function search_actors($session, $query, $limit = 25, $cursor = null)
{
    $url = "https://bsky.social/xrpc/app.bsky.actor.searchActors?term=" . urlencode($query) . "&limit=$limit";
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
        throw new Exception('Failed to search actors');
    }

    return json_decode($response, true);
}

try {
    $result = search_actors($session, $query, $limit, $cursor);
    echo json_encode([
        'actors' => $result['actors'] ?? [],
        'cursor' => $result['cursor'] ?? null
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
