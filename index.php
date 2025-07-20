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

// CONFIGURATION from environment variables (fallback only)
$DEFAULT_QUERY = getenv('QUERY') ?: 'artist';
$PAGE_SIZE = (int)(getenv('PAGE_SIZE') ?: 25);
$CURRENT_PAGE = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;

// Handle search query from form or URL parameter
$QUERY = '';
if (isset($_GET['query']) && !empty(trim($_GET['query']))) {
    $QUERY = trim($_GET['query']);
} elseif (isset($_POST['query']) && !empty(trim($_POST['query']))) {
    $QUERY = trim($_POST['query']);
} else {
    $QUERY = $DEFAULT_QUERY;
}

// Check if user is authenticated (will be handled by JavaScript)
$isAuthenticated = false;
$session = null;
$listName = 'Select a list';
$listDescription = '';
$existingMembers = [];

// Validate required environment variables (only for fallback mode)
$BLUESKY_HANDLE = getenv('BLUESKY_HANDLE') ?: '';
$BLUESKY_APP_PASSWORD = getenv('BLUESKY_APP_PASSWORD') ?: '';
$LIST_RKEY = getenv('LIST_RKEY') ?: '';

// Check if we have fallback credentials (for demo mode)
$hasFallbackCredentials = !empty($BLUESKY_HANDLE) && !empty($BLUESKY_APP_PASSWORD) && !empty($LIST_RKEY);

// Handle pagination reset
if (isset($_GET['reset_pagination'])) {
    $_SESSION['pagination_cursors'] = [];
    header('Location: ?page=1&query=' . urlencode($QUERY));
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
function generate_pagination($currentPage, $hasNextPage, $maxDisplayPages = 7, $query = '')
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

    // Build query string
    $queryString = $query ? '&query=' . urlencode($query) : '';

    // Previous button
    if ($currentPage > 1) {
        $html .= '<a href="?page=' . ($currentPage - 1) . $queryString . '">&laquo; Previous</a>';
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
        $html .= '<a href="?page=1' . $queryString . '">1</a>';
        if ($startPage > 2) {
            $html .= '<span class="disabled">...</span>';
        }
    }

    // Page numbers
    for ($i = $startPage; $i <= min($endPage, $currentPage + ($hasNextPage ? 2 : 0)); $i++) {
        if ($i == $currentPage) {
            $html .= '<span class="current">' . $i . '</span>';
        } else {
            $html .= '<a href="?page=' . $i . $queryString . '">' . $i . '</a>';
        }
    }

    // Next button
    if ($hasNextPage) {
        $html .= '<a href="?page=' . ($currentPage + 1) . $queryString . '">Next &raquo;</a>';
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

// Authentication and list loading will be handled by JavaScript
// This allows users to sign in with their own credentials and select their own lists

// Handle add to list action (will be handled by JavaScript)
$addedToList = [];
$addErrors = [];

// Search actors (will be handled by JavaScript)
$results = ['actors' => []];
$actors = [];
$filtered = [];

// Display results
echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Bluesky Profile Catcher - Find & Curate</title>";
echo "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
echo "<script src='https://cdn.tailwindcss.com'></script>";
echo "<link rel='stylesheet' href='styles.css'>";
echo "</head><body>";

// Top bar with authentication and search
echo "<div class='bg-white border-b border-gray-200 sticky top-0 z-50'>";
echo "<div class='max-w-6xl mx-auto px-6 py-4'>";
echo "<div class='flex items-center justify-between mb-4'>";
echo "<div>";
echo "<h1 class='text-2xl font-bold m-0 text-slate-800'>🦋 Bluesky Profile Catcher</h1>";
echo "<p class='text-sm text-slate-600 m-0 mt-1'>Find and curate profiles to add to your Bluesky lists</p>";
echo "</div>";
echo "<div id='auth-status'>";
echo "<button id='signin-btn' class='bg-slate-800 hover:bg-slate-700 text-white border-0 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200'>🔐 Sign in with Bluesky</button>";
echo "<div id='user-info' class='hidden'>";
echo "<span id='user-handle' class='text-sm text-slate-700'></span><br>";
echo "<button id='signout-btn' class='bg-gray-100 hover:bg-gray-200 text-slate-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors duration-200 mt-1 font-medium'>Sign out</button>";
echo "</div>";
echo "</div>";
echo "</div>";

// Search form (shown when logged in)
echo "<div id='search-form-container' class='hidden'>";
echo "<form class='flex gap-4 items-center flex-wrap'>";
echo "<label class='text-sm font-medium text-slate-700 whitespace-nowrap'>Search profiles with:</label>";
echo "<input type='text' name='query' value='" . htmlspecialchars($QUERY) . "' placeholder='e.g., belge, artist, developer...' class='flex-1 min-w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-base outline-none shadow-sm text-slate-800 placeholder-gray-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500' required>";
echo "<label class='text-sm font-medium text-slate-700 whitespace-nowrap'>to add to list:</label>";
echo "<select id='list-dropdown' class='bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-48 text-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-500'>";
echo "<option value=''>Select a list...</option>";
echo "</select>";
echo "<button type='submit' class='bg-slate-800 hover:bg-slate-700 text-white border-0 px-6 py-2.5 rounded-lg text-base font-medium cursor-pointer transition-colors duration-200 whitespace-nowrap flex items-center gap-2'>";
echo "<span class='loading-spinner hidden' id='search-spinner'></span>";
echo "🔍 Search";
echo "</button>";
echo "</form>";
echo "</div>";
echo "</div>";
echo "</div>";

echo "<div class='max-w-6xl mx-auto p-6'>";

// Authentication instructions
echo "<div id='auth-instructions' class='bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200'>";
echo "<h3 class='text-lg font-semibold mb-3 text-slate-800'>🔐 Authentication Required</h3>";
echo "<p class='mb-3 text-slate-700'>To search for profiles and add them to your lists, please sign in with your Bluesky account.</p>";
echo "<p class='text-sm text-slate-600'><strong>Your credentials are stored locally and never sent to our servers.</strong></p>";
echo "</div>";

// Tab interface (shown when logged in)
echo "<div id='tab-interface' class='hidden'>";
echo "<div class='border-b border-gray-200 mb-6'>";
echo "<nav class='flex space-x-8'>";
echo "<button id='found-tab' class='tab-button active py-3 px-1 border-b-2 border-slate-800 text-slate-800 font-medium'>Found Profiles</button>";
echo "<button id='list-tab' class='tab-button py-3 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-700 font-medium'>0 Members in list: Select a list</button>";
echo "</nav>";
echo "</div>";

// Found profiles tab content
echo "<div id='found-tab-content' class='tab-content'>";
echo "<div class='bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200'>";
echo "<h3 class='text-lg font-semibold mb-3 text-slate-800'>📋 Found Profiles</h3>";
echo "<p id='found-description' class='text-sm text-slate-600'>Profiles matching your search that are not yet in your selected list.</p>";
echo "</div>";

echo "<div id='messages'></div>";

echo "<div class='bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200'>";
echo "<h3 class='text-lg font-semibold mb-3 text-slate-800'>📝 Bulk Actions</h3>";
echo "<p class='mb-4 text-slate-700'>Select profiles below and add them to your list:</p>";
echo "</div>";

// Sticky action bar
echo "<div class='sticky top-40 z-40 bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6'>";
echo "<div class='flex items-center justify-between'>";
echo "<div class='flex items-center gap-3'>";
echo "<button id='add-selected-btn' onclick='addSelectedToList()' disabled class='bg-slate-800 hover:bg-slate-700 text-white border-0 px-4 py-2.5 rounded-lg cursor-pointer transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm'>Add Selected to List</button>";
echo "</div>";
echo "<div class='text-sm text-slate-600'><span id='selected-count'>0</span> profiles selected</div>";
echo "</div>";
echo "</div>";

echo "<div id='profiles-container'>";
echo "<p class='text-slate-500'>Please sign in and select a list to start searching for profiles.</p>";
echo "</div>";
echo "</div>";

// List members tab content
echo "<div id='list-tab-content' class='tab-content hidden'>";
echo "<div class='bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200'>";
echo "<h3 class='text-lg font-semibold mb-3 text-slate-800'>📋 List Members</h3>";
echo "<p id='list-description' class='text-sm text-slate-600'></p>";
echo "</div>";
echo "<div id='list-members-container'>";
echo "<p class='text-slate-500'>Loading list members...</p>";
echo "</div>";
echo "</div>";

echo "</div>"; // Close tab-interface

// Statistics and pagination
echo "<div id='statistics'></div>";
echo "<div id='pagination'></div>";

echo "</div>"; // Close main-content
echo "<hr class='my-6 border-gray-200'>";
echo "<p class='text-xs text-slate-500 text-center'>List URI: <span id='list-uri'>Not selected</span></p>";

// Include the external JavaScript file
echo "<script src='app.js'></script>";

echo "</body></html>";
