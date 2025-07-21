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

if (!isset($input['session']) || !isset($input['dids'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Session and dids are required']);
    exit;
}

$session = $input['session'];
$dids = $input['dids'];

function get_profiles($session, $dids)
{
    if (empty($dids)) {
        return [];
    }

    $profiles = [];
    $validDids = array_filter($dids, function ($did) {
        return $did && is_string($did) && strpos($did, 'did:') === 0 && strlen($did) > 10;
    });

    if (empty($validDids)) {
        return [];
    }

    foreach ($validDids as $did) {
        try {
            $url = "https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=" . urlencode($did);

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

            if ($httpCode === 200) {
                $profile = json_decode($response, true);
                if ($profile) {
                    $profiles[] = $profile;
                }
            }
        } catch (Exception $e) {
            error_log("Error fetching profile for $did: " . $e->getMessage());
        }
    }

    return $profiles;
}

try {
    $profiles = get_profiles($session, $dids);
    echo json_encode(['profiles' => $profiles]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
