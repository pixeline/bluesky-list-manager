<?php

// Start session for pagination management
session_start();

// Load environment variables
function loadEnv($path = '.env')
{
    if (!file_exists($path)) {
        die("❌ Environment file not found. Please copy .env.example to .env and configure your settings.");
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue; // Skip comments
        }

        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);

        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Load environment variables
loadEnv();

// CONFIGURATION from environment variables
$BLUESKY_HANDLE = getenv('BLUESKY_HANDLE') ?: 'pixeline.be';
$BLUESKY_APP_PASSWORD = getenv('BLUESKY_APP_PASSWORD') ?: '';
$QUERY = getenv('QUERY') ?: 'belge';
$PAGE_SIZE = (int)(getenv('PAGE_SIZE') ?: 25);
$CURRENT_PAGE = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$LIST_RKEY = getenv('LIST_RKEY') ?: '3kmkqahpucb2z';

// Validate required environment variables
if (empty($BLUESKY_APP_PASSWORD)) {
    die("❌ BLUESKY_APP_PASSWORD not set. Please configure your .env file.");
}

// Handle pagination reset
if (isset($_GET['reset_pagination'])) {
    $_SESSION['pagination_cursors'] = [];
    header('Location: ?page=1');
    exit;
}

// Initialize pagination session if needed
if (!isset($_SESSION['pagination_cursors'])) {
    $_SESSION['pagination_cursors'] = [];
}

// Get cursor for current page
$CURSOR = null;
if ($CURRENT_PAGE > 1 && isset($_SESSION['pagination_cursors'][$CURRENT_PAGE - 1])) {
    $CURSOR = $_SESSION['pagination_cursors'][$CURRENT_PAGE - 1];
}

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
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// Function to search for actors
function search_actors($token, $query, $limit = 25, $cursor = null)
{
    $url = "https://bsky.social/xrpc/app.bsky.actor.searchActors?term=" . urlencode($query) . "&limit=$limit";
    if ($cursor) {
        $url .= "&cursor=" . urlencode($cursor);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $token"
        ],
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// Function to resolve handle to DID
function resolve_handle($handle)
{
    $url = "https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=" . urlencode($handle);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    $result = json_decode($response, true);
    return $result['did'] ?? null;
}

// Function to add user to list
function add_to_list($token, $userDid, $listUri, $sessionDid)
{
    $url = 'https://bsky.social/xrpc/com.atproto.repo.createRecord';

    $record = [
        '$type' => 'app.bsky.graph.listitem',
        'subject' => $userDid,
        'list' => $listUri,
        'createdAt' => date('c')
    ];

    $payload = json_encode([
        'repo' => $sessionDid,
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
            "Authorization: Bearer $token"
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'success' => $httpCode >= 200 && $httpCode < 300,
        'response' => json_decode($response, true),
        'httpCode' => $httpCode
    ];
}

// Function to generate pagination HTML
function generate_pagination($currentPage, $hasNextPage, $maxDisplayPages = 7)
{
    if ($currentPage == 1 && !$hasNextPage) {
        return ''; // No pagination needed for single page
    }

    $html = '<div class="pagination" style="text-align: center; margin: 20px 0;">';
    $html .= '<style>
        .pagination a, .pagination span {
            display: inline-block;
            padding: 8px 12px;
            margin: 0 2px;
            text-decoration: none;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .pagination a:hover { background-color: #f5f5f5; }
        .pagination .current {
            background-color: #007bff;
            color: white;
            border-color: #007bff;
        }
        .pagination .disabled {
            color: #6c757d;
            background-color: #fff;
            border-color: #dee2e6;
            cursor: not-allowed;
        }
    </style>';

    // Previous button
    if ($currentPage > 1) {
        $html .= '<a href="?page=' . ($currentPage - 1) . '">&laquo; Previous</a>';
    } else {
        $html .= '<span class="disabled">&laquo; Previous</span>';
    }

    // Calculate page range to display
    $startPage = max(1, $currentPage - floor($maxDisplayPages / 2));
    $endPage = $startPage + $maxDisplayPages - 1;

    // Adjust if we're near the end (we don't know total pages, so estimate)
    if (!$hasNextPage && $currentPage <= $endPage) {
        $endPage = $currentPage;
        $startPage = max(1, $endPage - $maxDisplayPages + 1);
    }

    // First page + ellipsis if needed
    if ($startPage > 1) {
        $html .= '<a href="?page=1">1</a>';
        if ($startPage > 2) {
            $html .= '<span class="disabled">...</span>';
        }
    }

    // Page numbers
    for ($i = $startPage; $i <= min($endPage, $currentPage + ($hasNextPage ? 2 : 0)); $i++) {
        if ($i == $currentPage) {
            $html .= '<span class="current">' . $i . '</span>';
        } else {
            $html .= '<a href="?page=' . $i . '">' . $i . '</a>';
        }
    }

    // Next button
    if ($hasNextPage) {
        $html .= '<a href="?page=' . ($currentPage + 1) . '">Next &raquo;</a>';
    } else {
        $html .= '<span class="disabled">Next &raquo;</span>';
    }

    $html .= '</div>';
    return $html;
}

// Function to get list information
function get_list_info($token, $listUri)
{
    $listParts = explode('/', $listUri);
    $listOwnerDid = $listParts[2];
    $listRkey = $listParts[4];

    $url = "https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=" . urlencode($listOwnerDid) . "&collection=app.bsky.graph.list&rkey=" . urlencode($listRkey);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $token"
        ],
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    $result = json_decode($response, true);

    return $result['value'] ?? null;
}

// Function to check if user is already in list
function get_list_members($token, $listUri)
{
    // Extract the DID from list URI to get list items
    $listParts = explode('/', $listUri);
    $listOwnerDid = $listParts[2];

    $existingMembers = [];
    $cursor = null;
    $totalRecords = 0;

    // Paginate through all list items to get complete list
    do {
        $url = "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=" . urlencode($listOwnerDid) . "&collection=app.bsky.graph.listitem&limit=100";
        if ($cursor) {
            $url .= "&cursor=" . urlencode($cursor);
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer $token"
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            // Log error for debugging
            error_log("Failed to fetch list members. HTTP Code: $httpCode. Response: $response");
            break;
        }

        $result = json_decode($response, true);

        if (isset($result['records'])) {
            $totalRecords += count($result['records']);
            foreach ($result['records'] as $record) {
                // Check if this list item belongs to our target list
                if (isset($record['value']['list']) && $record['value']['list'] === $listUri) {
                    $existingMembers[] = $record['value']['subject'];
                }
            }
        }

        $cursor = $result['cursor'] ?? null;
    } while ($cursor);

    // Debug information
    error_log("List members debug - Total records: $totalRecords, Matching list: " . count($existingMembers) . ", List URI: $listUri");

    return $existingMembers;
}

// Authenticate with Bluesky
$session = bluesky_login($BLUESKY_HANDLE, $BLUESKY_APP_PASSWORD);
if (!$session || !isset($session['accessJwt'])) {
    die("❌ Failed to authenticate with Bluesky API.");
}

$token = $session['accessJwt'];
$sessionDid = $session['did'];

// Construct the list URI using the authenticated user's DID
$LIST_URI = "at://$sessionDid/app.bsky.graph.list/$LIST_RKEY";

// Get list information
$listInfo = get_list_info($token, $LIST_URI);
$listName = $listInfo['name'] ?? 'Unknown List';
$listDescription = $listInfo['description'] ?? '';

// Get existing list members to avoid duplicates and show status
$existingMembers = get_list_members($token, $LIST_URI);

// Handle add to list action
$addedToList = [];
$addErrors = [];
if (isset($_POST['add_to_list']) && is_array($_POST['add_to_list'])) {
    foreach ($_POST['add_to_list'] as $actorDid) {
        if (in_array($actorDid, $existingMembers)) {
            continue; // Skip if already in list
        }

        $result = add_to_list($token, $actorDid, $LIST_URI, $sessionDid);
        if ($result['success']) {
            $addedToList[] = $actorDid;
            // Add to existing members to prevent re-display issues
            $existingMembers[] = $actorDid;
        } else {
            $addErrors[] = $actorDid . ' (Error: ' . $result['httpCode'] . ')';
        }
    }
}

// Search actors
$results = search_actors($token, $QUERY, $PAGE_SIZE, $CURSOR);
$actors = $results['actors'] ?? [];

// Store cursor for next page if it exists
if (!empty($results['cursor'])) {
    $_SESSION['pagination_cursors'][$CURRENT_PAGE] = $results['cursor'];
}

// Filter actors for "belge" in displayName or description
$filtered = array_filter($actors, function ($actor) {
    return stripos($actor['displayName'] ?? '', 'belge') !== false ||
        stripos($actor['description'] ?? '', 'belge') !== false;
});

// Sort filtered results: non-added users first, then already-added users
usort($filtered, function ($a, $b) use ($existingMembers) {
    $aInList = in_array($a['did'], $existingMembers);
    $bInList = in_array($b['did'], $existingMembers);

    // If one is in list and other isn't, prioritize the one not in list
    if ($aInList !== $bInList) {
        return $aInList ? 1 : -1; // Non-added users first
    }

    // If both have same status, sort by display name
    $aName = $a['displayName'] ?? $a['handle'];
    $bName = $b['displayName'] ?? $b['handle'];
    return strcasecmp($aName, $bName);
});

// Display results
echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Bluesky Search for 'belge'</title>";
echo "<style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .profile { border: 1px solid #ccc; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .avatar { vertical-align: middle; border-radius: 50%; margin-right: 10px; }
    .actions { margin-top: 10px; }
    .success { background-color: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin: 10px 0; }
    .error { background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin: 10px 0; }
    button { background-color: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    button:hover { background-color: #0056b3; }
    .bulk-actions { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
</style>";
echo "</head><body>";

echo "<h1>🔎 Bluesky Profiles Matching 'belge' <small>(Page $CURRENT_PAGE)</small></h1>";

echo "<div class='bulk-actions'>";
echo "<h3>📋 Target List: " . htmlspecialchars($listName) . "</h3>";
if ($listDescription) {
    echo "<p><em>" . htmlspecialchars($listDescription) . "</em></p>";
}
echo "<p>Found Belgian profiles will be added to this list. <strong>New candidates shown first.</strong></p>";
echo "<p><small>Debug: Found " . count($existingMembers) . " existing list members</small></p>";
echo "<p><small><a href='?reset_pagination=1' onclick='return confirm(\"Reset pagination and start from page 1?\")'>🔄 Reset pagination</a></small></p>";
if (count($existingMembers) > 0) {
    echo "<details><summary><small>Show existing member DIDs (first 5)</small></summary>";
    echo "<pre style='font-size: 11px;'>" . htmlspecialchars(implode("\n", array_slice($existingMembers, 0, 5))) . "</pre>";
    echo "</details>";
}
if (count($filtered) > 0) {
    $searchResultDids = array_map(function ($actor) {
        return $actor['did'];
    }, array_slice($filtered, 0, 3));
    echo "<details><summary><small>Show search result DIDs (first 3)</small></summary>";
    echo "<pre style='font-size: 11px;'>" . htmlspecialchars(implode("\n", $searchResultDids)) . "</pre>";
    echo "</details>";
}
echo "</div>";

// Show success/error messages
if (!empty($addedToList)) {
    echo "<div class='success'>✅ Successfully added " . count($addedToList) . " user(s) to your list!</div>";
}
if (!empty($addErrors)) {
    echo "<div class='error'>❌ Failed to add: " . implode(', ', $addErrors) . "</div>";
}

echo "<form method='post' action='?page=$CURRENT_PAGE'>";
echo "<div class='bulk-actions'>";
echo "<h3>📝 Bulk Actions</h3>";
echo "<p>Select users below and click this button to add them all to <strong>" . htmlspecialchars($listName) . "</strong>:</p>";
echo "<button type='submit' name='add_selected' onclick='return confirm(\"Add selected users to list?\")'>Add Selected to List</button>";
echo "</div>";

foreach ($filtered as $actor) {
    $handle = htmlspecialchars($actor['handle']);
    $name = htmlspecialchars($actor['displayName'] ?? $handle);
    $desc = htmlspecialchars($actor['description'] ?? '');
    $avatar = htmlspecialchars($actor['avatar'] ?? '');
    $link = "https://bsky.app/profile/" . urlencode($handle);
    $actorDid = htmlspecialchars($actor['did']);
    $isInList = in_array($actor['did'], $existingMembers);

    echo "<div class='profile'>";
    if ($avatar) {
        echo "<img src='$avatar' alt='avatar' width='48' class='avatar'>";
    }
    echo "<strong>$name</strong> (<a href='$link' target='_blank'>@$handle</a>)";

    if ($isInList) {
        echo " <span style='color: green; font-weight: bold;'>✓ Already in list</span>";
    }

    echo "<br><small>$desc</small>";
    echo "<div class='actions'>";

    if ($isInList) {
        echo "<input type='checkbox' checked disabled id='user_$actorDid'> ";
        echo "<label for='user_$actorDid' style='color: #666;'>Already on the list</label>";
    } else {
        echo "<input type='checkbox' name='add_to_list[]' value='$actorDid' id='user_$actorDid'> ";
        echo "<label for='user_$actorDid'>Select to add to list</label>";
    }

    echo "</div>";
    echo "</div>";
}

echo "</form>";

// Pagination
$hasNextPage = !empty($results['cursor']);
echo generate_pagination($CURRENT_PAGE, $hasNextPage);

// Statistics
$totalFiltered = count($filtered);
$alreadyInList = count(array_filter($filtered, function ($actor) use ($existingMembers) {
    return in_array($actor['did'], $existingMembers);
}));
$newCandidates = $totalFiltered - $alreadyInList;

echo "<hr>";
echo "<div class='bulk-actions'>";
echo "<h3>📊 Page $CURRENT_PAGE Statistics</h3>";
echo "<p>Found on this page: <strong>$totalFiltered</strong> Belgian profiles matching '$QUERY'</p>";
echo "<p>Already in list: <strong>$alreadyInList</strong></p>";
echo "<p>New candidates: <strong>$newCandidates</strong></p>";
if (count($existingMembers) > 0) {
    echo "<p>Total list members: <strong>" . count($existingMembers) . "</strong></p>";
}
if ($hasNextPage) {
    echo "<p><em>More results available on next pages...</em></p>";
} else {
    echo "<p><em>This is the last page of results.</em></p>";
}
echo "</div>";

echo "<hr><p><small>List URI: $LIST_URI</small></p>";
echo "</body></html>";
