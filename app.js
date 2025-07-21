// Bluesky Profile Catcher - Main Application JavaScript

// Bluesky API configuration
const BLUESKY_API = 'https://bsky.social/xrpc';

// Local storage keys
const STORAGE_KEYS = {
    SESSION: 'bluesky_session',
    SELECTED_LIST: 'bluesky_selected_list',
    LISTS: 'bluesky_lists'
};

// Global state
let currentSession = null;
let currentList = null;
let userLists = [];
let searchResults = [];
let currentPage = 1;
let hasNextPage = false;
let currentCursor = null;
let isLoadingMore = false;
let currentSearchQuery = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadStoredSession();
    setupEventListeners();
    updateUI();
});

// Load stored session from localStorage
function loadStoredSession() {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (stored) {
        try {
            currentSession = JSON.parse(stored);
            // Check if session is still valid
            if (currentSession && currentSession.accessJwt) {
                loadUserLists();
            }
        } catch (e) {
            console.error('Error loading stored session:', e);
            clearStoredSession();
        }
    }

    // Load stored selected list
    const storedList = localStorage.getItem(STORAGE_KEYS.SELECTED_LIST);
    if (storedList) {
        try {
            currentList = JSON.parse(storedList);
            console.log('Restored selected list:', currentList.name);
        } catch (e) {
            console.error('Error loading stored list:', e);
            localStorage.removeItem(STORAGE_KEYS.SELECTED_LIST);
            currentList = null;
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('signin-btn').addEventListener('click', showSignInModal);
    document.getElementById('signout-btn').addEventListener('click', signOut);
    document.getElementById('list-dropdown').addEventListener('change', onListSelected);

    // Tab switching
    document.getElementById('found-tab').addEventListener('click', () => switchTab('found'));
    document.getElementById('list-tab').addEventListener('click', () => switchTab('list'));

    // Infinite scrolling
    window.addEventListener('scroll', handleScroll);

    // Setup checkbox listeners
    setupCheckboxListeners();

    // Handle search form submission
    document.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Search form submitted');
        const query = document.querySelector('input[name="query"]').value;
        const searchButton = document.querySelector('button[type="submit"]');
        const spinner = document.getElementById('search-spinner');

        console.log('Search query:', query);
        console.log('Current session:', !!currentSession);
        console.log('Current list:', !!currentList);

        if (query && currentSession && currentList) {
            console.log('Starting search for:', query);

            // Show loading state
            searchButton.disabled = true;
            spinner.classList.remove('hidden');
            searchButton.innerHTML = '<span class="loading-spinner mr-2"></span>Searching...';

            searchProfiles(query, 1).finally(() => {
                // Hide loading state
                searchButton.disabled = false;
                spinner.classList.add('hidden');
                searchButton.innerHTML = '🔍 Search';
            });
        } else if (!currentSession) {
            showMessage('❌ Please sign in first', 'error');
        } else if (!currentList) {
            showMessage('❌ Please select a list first', 'error');
        } else {
            showMessage('❌ Please enter a search query', 'error');
        }
    });
}

// Show sign in modal
function showSignInModal() {
    const handle = prompt('Enter your Bluesky handle (e.g., username.bsky.social):');
    if (!handle) return;

    const password = prompt('Enter your Bluesky app password:');
    if (!password) return;

    signIn(handle, password);
}

// Sign in to Bluesky
async function signIn(handle, password) {
    try {
        const response = await fetch(BLUESKY_API + '/com.atproto.server.createSession', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identifier: handle,
                password: password
            })
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        const session = await response.json();
        currentSession = session;

        // Store session locally
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

        // Load user lists
        await loadUserLists();

        showMessage('✅ Successfully signed in as ' + handle, 'success');
        updateUI();

    } catch (error) {
        console.error('Sign in error:', error);
        showMessage('❌ Sign in failed: ' + error.message, 'error');
    }
}

// Sign out
function signOut() {
    currentSession = null;
    currentList = null;
    userLists = [];
    searchResults = [];
    clearStoredSession();
    updateUI();
    showMessage('👋 Signed out successfully', 'success');
}

// Clear stored session
function clearStoredSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_LIST);
    localStorage.removeItem(STORAGE_KEYS.LISTS);
}

// Load user lists
async function loadUserLists() {
    if (!currentSession) return;

    try {
        const response = await fetch(BLUESKY_API + '/app.bsky.graph.getLists?actor=' + currentSession.handle, {
            headers: {
                'Authorization': 'Bearer ' + currentSession.accessJwt
            }
        });

        if (!response.ok) throw new Error('Failed to load lists');

        const data = await response.json();
        userLists = data.lists || [];

        // Store lists locally
        localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(userLists));

        updateListDropdown();

        // If we have a stored selected list, restore it and load members
        if (currentList) {
            const dropdown = document.getElementById('list-dropdown');
            dropdown.value = currentList.uri;

            // Load list members for the restored list
            await loadListMembers();

            // Auto-trigger search if there's a query
            const queryInput = document.querySelector('input[name="query"]');
            if (queryInput && queryInput.value.trim()) {
                setTimeout(() => {
                    searchProfiles(queryInput.value.trim(), 1);
                }, 300);
            }
        }

    } catch (error) {
        console.error('Error loading lists:', error);
        showMessage('❌ Failed to load lists: ' + error.message, 'error');
    }
}

// Update list dropdown
function updateListDropdown() {
    const dropdown = document.getElementById('list-dropdown');
    dropdown.innerHTML = '<option value="">Select a list...</option>';

    userLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.uri;
        option.textContent = list.name;
        dropdown.appendChild(option);
    });

    // Load previously selected list (only if not already loaded)
    if (!currentList) {
        const storedList = localStorage.getItem(STORAGE_KEYS.SELECTED_LIST);
        if (storedList) {
            try {
                const parsedList = JSON.parse(storedList);
                dropdown.value = parsedList.uri;
                currentList = parsedList;
                console.log('Restored list selection from localStorage:', parsedList.name);
            } catch (e) {
                console.error('Error parsing stored list:', e);
                localStorage.removeItem(STORAGE_KEYS.SELECTED_LIST);
            }
        }
    } else {
        // If currentList is already set, just update the dropdown
        dropdown.value = currentList.uri;
    }
}

// Handle list selection
async function onListSelected() {
    const dropdown = document.getElementById('list-dropdown');
    const selectedValue = dropdown.value;

    console.log('List selection changed to:', selectedValue);

    if (!selectedValue) {
        currentList = null;
        localStorage.removeItem(STORAGE_KEYS.SELECTED_LIST);
        updateUI();
        return;
    }

    // Find the selected list
    const selectedList = userLists.find(list => list.uri === selectedValue);
    if (!selectedList) {
        showMessage('❌ Selected list not found', 'error');
        return;
    }

    currentList = selectedList;
    console.log('Selected list:', selectedList.name);

    // Store selected list
    localStorage.setItem(STORAGE_KEYS.SELECTED_LIST, JSON.stringify(selectedList));

    // Load list members
    await loadListMembers();

    // Update UI
    updateUI();

    // Auto-trigger search if there's a query in the input field
    const queryInput = document.querySelector('input[name="query"]');
    if (queryInput && queryInput.value.trim()) {
        // Small delay to ensure list members are loaded
        setTimeout(() => {
            searchProfiles(queryInput.value.trim(), 1);
        }, 200);
    }
}

// Load list members
async function loadListMembers() {
    if (!currentSession || !currentList) return;

    try {
        // Extract list owner DID and rkey from URI
        const uriParts = currentList.uri.split('/');
        const listOwnerDid = uriParts[2];
        const listRkey = uriParts[4];

        let allMembers = [];
        let cursor = null;
        let totalRecords = 0;
        let batchCount = 0;

        // Paginate through all list items to get complete list (like the PHP version)
        do {
            batchCount++;
            let url = BLUESKY_API + '/com.atproto.repo.listRecords?repo=' + listOwnerDid + '&collection=app.bsky.graph.listitem&limit=100';
            if (cursor) {
                url += '&cursor=' + encodeURIComponent(cursor);
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + currentSession.accessJwt
                }
            });

            if (!response.ok) throw new Error('Failed to load list members');

            const data = await response.json();
            totalRecords += data.records.length;

            // Filter records that belong to our target list
            const listMembers = data.records
                .filter(record => record.value.list === currentList.uri)
                .map(record => record.value.subject);

            allMembers = allMembers.concat(listMembers);
            cursor = data.cursor;

            // Update the loading indicator with live count
            // showMessage('🔄 Counting ' + allMembers.length + ' users...', 'info');

            // Update tab label with live count
            if (currentList) {
                const listTab = document.getElementById('list-tab');
                listTab.textContent = `${allMembers.length} Members in list: ${currentList.name}`;
            }

            console.log('Batch ' + batchCount + ':', data.records.length, 'records, matching list:', listMembers.length, 'members. Total so far:', allMembers.length);

        } while (cursor);

        console.log('Total records processed:', totalRecords, 'Total matching list members:', allMembers.length);

        currentList.members = allMembers;
        updateTabDescriptions();

    } catch (error) {
        console.error('Error loading list members:', error);
        currentList.members = [];
        showMessage('❌ Error loading list members', 'error');
    }
}

// Display list members
async function displayListMembers() {
    const container = document.getElementById('list-members-container');

    if (!currentList || !currentList.members) {
        container.innerHTML = '<p class="text-gray-500">No list selected or members not loaded.</p>';
        return;
    }

    if (currentList.members.length === 0) {
        container.innerHTML = '<p class="text-gray-500">This list has no members yet.</p>';
        return;
    }

    // Show loading state
    container.innerHTML = '<div class="flex items-center justify-center py-8"><div class="loading-spinner mr-3"></div><span class="text-gray-600">Loading profile details...</span></div>';

    try {
        let html = '<div class="space-y-4">';
        html += '<p class="text-sm text-gray-600 mb-4">Total members: <strong>' + currentList.members.length + '</strong></p>';

        // Fetch profile details for each member (limit to first 50 for performance)
        const membersToShow = currentList.members.slice(0, 50);

        for (let i = 0; i < membersToShow.length; i++) {
            const did = membersToShow[i];

            try {
                // Fetch profile details from Bluesky API
                const response = await fetch(BLUESKY_API + '/app.bsky.actor.getProfile?actor=' + encodeURIComponent(did), {
                    headers: {
                        'Authorization': 'Bearer ' + currentSession.accessJwt
                    }
                });

                if (response.ok) {
                    const profile = await response.json();

                    // Handle different possible response structures
                    let actor = null;
                    if (profile.data) {
                        actor = profile.data;
                    } else if (profile.did) {
                        actor = profile;
                    } else {
                        throw new Error('Unexpected API response structure');
                    }

                    if (!actor) {
                        throw new Error('No actor data found in response');
                    }

                    html += '<div class="border border-gray-300 p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200 profile-card">';
                    html += '<div class="flex items-start gap-3">';
                    if (actor.avatar) {
                        html += '<img src="' + actor.avatar + '" alt="avatar" width="48" height="48" class="rounded-full flex-shrink-0">';
                    } else {
                        html += '<div class="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 text-sm">👤</div>';
                    }
                    html += '<div class="flex-1 min-w-0">';
                    html += '<div class="flex items-center gap-2 mb-1">';
                    html += '<strong class="text-lg">' + (actor.displayName || actor.handle || 'Unknown Name') + '</strong>';
                    if (actor.handle) {
                        html += '<a href="https://bsky.app/profile/' + actor.handle + '" target="_blank" class="text-blue-600 hover:text-blue-800 underline text-sm">@' + actor.handle + '</a>';
                    }
                    html += '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ List Member</span>';
                    html += '</div>';

                    if (actor.description) {
                        html += '<p class="text-gray-600 text-sm mb-3">' + actor.description + '</p>';
                    }

                    html += '<div class="text-xs text-gray-500">Member #' + (i + 1) + ' of ' + currentList.members.length + '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                } else {
                    // Fallback for failed profile fetch
                    html += '<div class="border border-gray-300 p-4 rounded-lg bg-white shadow-sm">';
                    html += '<div class="flex items-start gap-3">';
                    html += '<div class="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 text-sm">👤</div>';
                    html += '<div class="flex-1">';
                    html += '<div class="flex items-center gap-2 mb-1">';
                    html += '<strong class="text-lg">Unknown Profile</strong>';
                    html += '<span class="text-gray-500 text-sm">' + did.substring(0, 20) + '...</span>';
                    html += '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ List Member</span>';
                    html += '</div>';
                    html += '<div class="text-xs text-gray-500">Member #' + (i + 1) + ' of ' + currentList.members.length + ' (Profile details unavailable)</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                }

                // Update progress every 10 profiles
                if ((i + 1) % 10 === 0) {
                    container.innerHTML = html + '<div class="text-center py-4 text-gray-600">Loading... ' + (i + 1) + ' of ' + membersToShow.length + ' profiles</div>';
                }

            } catch (error) {
                console.error('Error fetching profile for DID:', did, error);
                // Add fallback profile card
                html += '<div class="border border-gray-300 p-4 rounded-lg bg-white shadow-sm">';
                html += '<div class="flex items-start gap-3">';
                html += '<div class="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 text-sm">👤</div>';
                html += '<div class="flex-1">';
                html += '<div class="flex items-center gap-2 mb-1">';
                html += '<strong class="text-lg">Unknown Profile</strong>';
                html += '<span class="text-gray-500 text-sm">' + did.substring(0, 20) + '...</span>';
                html += '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ List Member</span>';
                html += '</div>';
                html += '<div class="text-xs text-gray-500">Member #' + (i + 1) + ' of ' + currentList.members.length + ' (Error loading profile)</div>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
            }
        }

        if (currentList.members.length > 50) {
            html += '<div class="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">';
            html += '<p class="text-sm text-blue-800">📋 Showing first 50 members</p>';
            html += '<p class="text-xs text-blue-600 mt-1">Total list has ' + currentList.members.length + ' members. Only the first 50 are displayed for performance.</p>';
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Error displaying list members:', error);
        container.innerHTML = '<div class="bg-red-50 p-4 rounded-lg border border-red-200">';
        container.innerHTML += '<p class="text-sm text-red-800">❌ Error loading profile details</p>';
        container.innerHTML += '<p class="text-xs text-red-600 mt-1">' + error.message + '</p>';
        container.innerHTML += '</div>';
    }
}

// Update UI based on authentication state
function updateUI() {
    const authInstructions = document.getElementById('auth-instructions');
    const tabInterface = document.getElementById('tab-interface');
    const searchFormContainer = document.getElementById('search-form-container');
    const signinBtn = document.getElementById('signin-btn');
    const userInfo = document.getElementById('user-info');
    const userHandle = document.getElementById('user-handle');

    if (currentSession) {
        // User is signed in
        signinBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        searchFormContainer.classList.remove('hidden');
        authInstructions.classList.add('hidden');
        tabInterface.classList.remove('hidden');

        userHandle.textContent = '@' + currentSession.handle;

        if (currentList) {
            document.getElementById('list-uri').textContent = currentList.uri;
            updateTabDescriptions();

            // Auto-trigger search if there's a query in the input field
            const queryInput = document.querySelector('input[name="query"]');
            if (queryInput && queryInput.value.trim()) {
                // Small delay to ensure UI is fully loaded
                setTimeout(() => {
                    searchProfiles(queryInput.value.trim(), 1);
                }, 100);
            }
        }

        // Ensure "Found profiles" tab is active by default
        switchTab('found');

    } else {
        // User is not signed in
        signinBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        searchFormContainer.classList.add('hidden');
        authInstructions.classList.remove('hidden');
        tabInterface.classList.add('hidden');
    }
}

// Switch between tabs
function switchTab(tabName) {
    const foundTab = document.getElementById('found-tab');
    const listTab = document.getElementById('list-tab');
    const foundContent = document.getElementById('found-tab-content');
    const listContent = document.getElementById('list-tab-content');

    if (tabName === 'found') {
        foundTab.classList.add('border-slate-800', 'text-slate-800');
        foundTab.classList.remove('border-transparent', 'text-slate-500');
        listTab.classList.add('border-transparent', 'text-slate-500');
        listTab.classList.remove('border-slate-800', 'text-slate-800');
        foundContent.classList.remove('hidden');
        listContent.classList.add('hidden');

        // Auto-trigger search when switching to Found Profiles tab
        if (currentSession && currentList) {
            const queryInput = document.querySelector('input[name="query"]');
            if (queryInput && queryInput.value.trim()) {
                // Only search if we don't already have results or if it's a different query
                if (searchResults.length === 0 || currentSearchQuery !== queryInput.value.trim()) {
                    searchProfiles(queryInput.value.trim(), 1);
                }
            }
        }
    } else {
        listTab.classList.add('border-slate-800', 'text-slate-800');
        listTab.classList.remove('border-transparent', 'text-slate-500');
        foundTab.classList.add('border-transparent', 'text-slate-500');
        foundTab.classList.remove('border-slate-800', 'text-slate-800');
        listContent.classList.remove('hidden');
        foundContent.classList.add('hidden');

        // Load list members when switching to list tab
        if (currentList && currentList.members) {
            displayListMembers();
        }
    }
}

// Update tab descriptions
function updateTabDescriptions() {
    if (currentList) {
        const foundDescription = document.getElementById('found-description');
        const listDescription = document.getElementById('list-description');
        const listTab = document.getElementById('list-tab');

        foundDescription.textContent = `Profiles matching your search that are not yet in "${currentList.name}".`;
        listDescription.textContent = `Profiles in "${currentList.name}" (${currentList.members ? currentList.members.length : 0} members)`;

        // Update the tab label with member count
        const memberCount = currentList.members ? currentList.members.length : 0;
        listTab.textContent = `${memberCount} Members in list: ${currentList.name}`;
    }
}

// Show message
function showMessage(message, type = 'info') {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    messagesDiv.appendChild(messageDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Search profiles
async function searchProfiles(query, page = 1, cursor = null) {
    console.log('searchProfiles called with query:', query, 'page:', page, 'cursor:', cursor);
    if (!currentSession) {
        console.log('No current session, returning');
        return;
    }

    // Reset search results if this is a new search
    if (page === 1) {
        searchResults = [];
        currentCursor = null;
        currentSearchQuery = query;
    }

    try {
        console.log('Making API request to search actors...');
        let url = BLUESKY_API + '/app.bsky.actor.searchActors?term=' + encodeURIComponent(query) + '&limit=50';
        if (cursor) {
            url += '&cursor=' + encodeURIComponent(cursor);
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + currentSession.accessJwt
            }
        });

        console.log('Search response status:', response.status);
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        console.log('Search response data:', data);

        // Get new results and deduplicate
        const newResults = data.actors || [];
        const existingDids = new Set(searchResults.map(actor => actor.did));

        // Only add profiles that aren't already in the results
        const uniqueNewResults = newResults.filter(actor => !existingDids.has(actor.did));

        console.log('New results count:', newResults.length);
        console.log('Unique new results count:', uniqueNewResults.length);
        console.log('Duplicates filtered out:', newResults.length - uniqueNewResults.length);

        // Append unique results to existing ones
        searchResults = searchResults.concat(uniqueNewResults);

        console.log('Total search results count:', searchResults.length);

        currentPage = page;
        currentCursor = data.cursor || null;
        hasNextPage = !!data.cursor;

        displaySearchResults();

    } catch (error) {
        console.error('Search error:', error);
        showMessage('❌ Search failed: ' + error.message, 'error');
    }
}

// Display search results
function displaySearchResults() {
    console.log('displaySearchResults called');
    const container = document.getElementById('profiles-container');
    console.log('Container found:', !!container);
    console.log('Search results length:', searchResults.length);

    if (searchResults.length === 0) {
        console.log('No search results, showing empty message');
        container.innerHTML = '<p class="text-gray-500">No profiles found matching your search.</p>';
        return;
    }

    console.log('Processing search results...');

    // Get the search query
    const query = document.querySelector('input[name="query"]').value.toLowerCase();
    console.log('Search query:', query);

    // Filter results: must contain query term AND not be in the list
    const filtered = searchResults.filter(actor => {
        // Check if profile description contains the query term
        const matchesQuery = (actor.displayName || '').toLowerCase().includes(query) ||
                           (actor.description || '').toLowerCase().includes(query) ||
                           (actor.handle || '').toLowerCase().includes(query);

        // Check if profile is NOT already in the list
        const notInList = !(currentList && currentList.members && currentList.members.includes(actor.did));

        console.log(`Profile ${actor.handle}: matchesQuery=${matchesQuery}, notInList=${notInList}`);

        return matchesQuery && notInList;
    });

    // Deduplicate filtered results by DID
    const uniqueFiltered = [];
    const seenDids = new Set();

    filtered.forEach(actor => {
        if (!seenDids.has(actor.did)) {
            seenDids.add(actor.did);
            uniqueFiltered.push(actor);
        }
    });

    console.log('Filtered results count:', filtered.length);
    console.log('Unique filtered results count:', uniqueFiltered.length);
    console.log('Duplicates removed from display:', filtered.length - uniqueFiltered.length);
    console.log('Current list members:', currentList ? currentList.members.length : 0);
    console.log('Sample member DIDs:', currentList && currentList.members ? currentList.members.slice(0, 3) : []);
    console.log('Sample profile DIDs:', uniqueFiltered.slice(0, 3).map(p => p.did));

    // Sort by display name
    uniqueFiltered.sort((a, b) => (a.displayName || a.handle).localeCompare(b.displayName || b.handle));

    if (uniqueFiltered.length === 0) {
        container.innerHTML = '<div class="bg-blue-50 p-4 rounded-lg border border-blue-200">';
        container.innerHTML += '<p class="text-sm text-blue-800">📋 No new candidates found</p>';
        container.innerHTML += '<p class="text-xs text-blue-600 mt-1">All profiles matching your search are already in the selected list.</p>';
        container.innerHTML += '</div>';

        // Update statistics with zero results
        updateStatistics([]);

        // Disable add button
        const addBtn = document.getElementById('add-selected-btn');
        addBtn.disabled = true;
        return;
    }

    let html = '<div class="space-y-4">';
    uniqueFiltered.forEach(actor => {
        html += '<div class="border border-gray-200 p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 profile-card">';
        html += '<div class="flex items-start gap-4">';
        if (actor.avatar) {
            html += '<img src="' + actor.avatar + '" alt="avatar" width="48" height="48" class="rounded-full flex-shrink-0">';
        } else {
            html += '<div class="w-12 h-12 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 text-sm">👤</div>';
        }
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="flex items-center gap-3 mb-2">';
        html += '<strong class="text-lg text-slate-800">' + (actor.displayName || actor.handle) + '</strong>';
        html += '<a href="https://bsky.app/profile/' + actor.handle + '" target="_blank" class="text-slate-600 hover:text-slate-800 underline text-sm">@' + actor.handle + '</a>';
        html += '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">New candidate</span>';
        html += '</div>';

        if (actor.description) {
            html += '<p class="text-slate-600 text-sm mb-4 leading-relaxed">' + actor.description + '</p>';
        }

        html += '<div class="flex items-center gap-3">';
        html += '<input type="checkbox" name="add_to_list[]" value="' + actor.did + '" id="user_' + actor.did + '" class="w-4 h-4 text-slate-800 border-gray-300 rounded focus:ring-slate-500 focus:ring-2">';
        html += '<label for="user_' + actor.did + '" class="text-sm text-slate-700 cursor-pointer font-medium">Select to add to list</label>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
    });
    html += '</div>';

    console.log('Setting container HTML, length:', html.length);
    container.innerHTML = html;
    console.log('Container HTML set successfully');

    // Update statistics
    updateStatistics(uniqueFiltered);

    // Show excluded profiles (already in list) in a collapsible section
    const excludedProfiles = searchResults.filter(actor => {
        const query = document.querySelector('input[name="query"]').value.toLowerCase();
        const matchesQuery = (actor.displayName || '').toLowerCase().includes(query) ||
                           (actor.description || '').toLowerCase().includes(query) ||
                           (actor.handle || '').toLowerCase().includes(query);
        const inList = currentList && currentList.members && currentList.members.includes(actor.did);
        return matchesQuery && inList;
    });

    // Deduplicate excluded profiles
    const uniqueExcludedProfiles = [];
    const excludedSeenDids = new Set();

    excludedProfiles.forEach(actor => {
        if (!excludedSeenDids.has(actor.did)) {
            excludedSeenDids.add(actor.did);
            uniqueExcludedProfiles.push(actor);
        }
    });

    if (uniqueExcludedProfiles.length > 0) {
        html += '<div class="mt-6">';
        html += '<details class="bg-gray-50 p-4 rounded-lg border border-gray-200">';
        html += '<summary class="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">';
        html += '📋 Show ' + uniqueExcludedProfiles.length + ' profiles already in list (click to expand)';
        html += '</summary>';
        html += '<div class="mt-3 space-y-3">';

        uniqueExcludedProfiles.forEach(actor => {
            html += '<div class="border border-gray-200 p-3 rounded-lg bg-white opacity-75">';
            html += '<div class="flex items-start gap-3">';
            if (actor.avatar) {
                html += '<img src="' + actor.avatar + '" alt="avatar" width="32" height="32" class="rounded-full flex-shrink-0">';
            } else {
                html += '<div class="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 text-xs">👤</div>';
            }
            html += '<div class="flex-1 min-w-0">';
            html += '<div class="flex items-center gap-2 mb-1">';
            html += '<strong class="text-sm">' + (actor.displayName || actor.handle) + '</strong>';
            html += '<a href="https://bsky.app/profile/' + actor.handle + '" target="_blank" class="text-blue-600 hover:text-blue-800 underline text-xs">@' + actor.handle + '</a>';
            html += '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Already in list</span>';
            html += '</div>';
            if (actor.description) {
                html += '<p class="text-gray-600 text-xs">' + actor.description + '</p>';
            }
            html += '</div>';
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';
        html += '</details>';
        html += '</div>';
    }

    // Add load more button if there are more results available
    if (hasNextPage && !isLoadingMore) {
        html += '<div class="mt-6 text-center">';
        html += '<button onclick="loadMoreProfiles()" class="bg-blue-500 hover:bg-blue-600 text-white border-0 px-6 py-3 rounded-lg cursor-pointer transition-colors duration-200 font-medium">';
        html += '<span class="loading-spinner mr-2 hidden" id="load-more-spinner"></span>';
        html += '📄 Load More Profiles';
        html += '</button>';
        html += '<p class="text-xs text-gray-500 mt-2">Or scroll down to load automatically</p>';
        html += '</div>';
    }

    // Show loading state if currently loading more
    if (isLoadingMore) {
        html += '<div class="mt-6 flex items-center justify-center py-4 text-gray-600">';
        html += '<div class="loading-spinner mr-3"></div>';
        html += '<span>Loading more profiles...</span>';
        html += '</div>';
    }

    // Show end message if no more results
    if (!hasNextPage && searchResults.length > 0) {
        html += '<div class="mt-6 text-center">';
        html += '<div class="bg-gray-50 p-4 rounded-lg border border-gray-200">';
        html += '<p class="text-sm text-gray-600">🏁 No more profiles found</p>';
        html += '<p class="text-xs text-gray-500 mt-1">You\'ve reached the end of the search results</p>';
        html += '</div>';
        html += '</div>';
    }

    // Enable add button since all shown profiles are new candidates
    const addBtn = document.getElementById('add-selected-btn');
    addBtn.disabled = uniqueFiltered.length === 0;
    console.log('Available profiles for adding:', uniqueFiltered.length);
}

// Update statistics
function updateStatistics(filtered) {
    const statsDiv = document.getElementById('statistics');
    const totalFound = searchResults.length;
    const newCandidates = filtered.length;
    const alreadyInList = totalFound - newCandidates;

    let html = '<div class="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">';
    html += '<h3 class="text-lg font-semibold mb-4 text-slate-800">📊 Search Statistics</h3>';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">';
    html += '<div class="text-center"><span class="block text-3xl font-bold text-slate-800">' + totalFound + '</span><span class="text-slate-600">Total Found</span></div>';
    html += '<div class="text-center"><span class="block text-3xl font-bold text-blue-600">' + newCandidates + '</span><span class="text-slate-600">New Candidates</span></div>';
    html += '<div class="text-center"><span class="block text-3xl font-bold text-slate-500">' + alreadyInList + '</span><span class="text-slate-600">Already in List</span></div>';
    if (currentList && currentList.members) {
        html += '<div class="text-center"><span class="block text-3xl font-bold text-slate-700">' + currentList.members.length + '</span><span class="text-slate-600">List Total</span></div>';
    }
    html += '</div>';

    // Add search progress information
    // if (hasNextPage) {
    //     html += '<div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">';
    //     html += '<p class="text-sm text-blue-800 font-medium">🔄 Search in progress...</p>';
    //     html += '<p class="text-xs text-blue-600 mt-1">Scroll down or click "Load More" to find additional profiles</p>';
    //     html += '</div>';
    // }

    // Add explanation if no new candidates found
    if (newCandidates === 0 && totalFound > 0) {
        html += '<div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">';
        html += '<p class="text-sm text-blue-800 font-medium">💡 All ' + totalFound + ' profiles found are already in your list.</p>';
        html += '<p class="text-xs text-blue-600 mt-1">Try a different search term or scroll down to load more results.</p>';
        html += '</div>';
    }

    html += '</div>';

    statsDiv.innerHTML = html;
}

// Add selected profiles to list
async function addSelectedToList() {
    if (!currentSession || !currentList) return;

    const checkboxes = document.querySelectorAll('input[name="add_to_list[]"]:checked');
    const selectedDids = Array.from(checkboxes).map(cb => cb.value);

    if (selectedDids.length === 0) {
        showMessage('❌ No profiles selected', 'error');
        return;
    }

    // Show loading state
    const addBtn = document.getElementById('add-selected-btn');
    const originalText = addBtn.innerHTML;
    addBtn.disabled = true;
    addBtn.innerHTML = '<span class="loading-spinner mr-2"></span>Adding to list...';

    let successCount = 0;
    let errorCount = 0;

    try {
        for (const did of selectedDids) {
            try {
                const response = await fetch(BLUESKY_API + '/com.atproto.repo.createRecord', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + currentSession.accessJwt
                    },
                    body: JSON.stringify({
                        repo: currentSession.did,
                        collection: 'app.bsky.graph.listitem',
                        record: {
                            '$type': 'app.bsky.graph.listitem',
                            subject: did,
                            list: currentList.uri,
                            createdAt: new Date().toISOString()
                        }
                    })
                });

                if (response.ok) {
                    successCount++;
                    // Add to local members list
                    if (!currentList.members) currentList.members = [];
                    currentList.members.push(did);
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
                console.error('Error adding to list:', error);
            }
        }

        // Update UI
        updateTabDescriptions();
        displaySearchResults();

        // Show success message and trigger confetti
        if (successCount > 0) {
            showMessage('✅ Successfully added ' + successCount + ' profile(s) to your list', 'success');

            // Trigger confetti celebration
            triggerConfetti(successCount);

            // Reset button immediately after success
            addBtn.disabled = false;
            addBtn.innerHTML = originalText;

            // Update selected count to 0 since profiles were added
            updateSelectedCount();
        }

        if (errorCount > 0) {
            showMessage('❌ Failed to add ' + errorCount + ' profile(s)', 'error');
            // Reset button on error too
            addBtn.disabled = false;
            addBtn.innerHTML = originalText;
        }

    } catch (error) {
        console.error('Error in addSelectedToList:', error);
        showMessage('❌ An error occurred while adding profiles', 'error');
        // Reset button on any error
        addBtn.disabled = false;
        addBtn.innerHTML = originalText;
    }
}

// Trigger confetti celebration
function triggerConfetti(profileCount) {
    // Configure confetti based on number of profiles added
    const intensity = Math.min(profileCount * 0.3, 1); // Scale intensity with profile count

    const confettiConfig = {
        particleCount: Math.floor(100 * intensity),
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'], // Slate color palette
        shapes: ['circle', 'square'],
        gravity: 0.8,
        ticks: 200,
        startVelocity: 30,
        decay: 0.95
    };

    // Fire confetti
    confetti(confettiConfig);

    // Add a second burst for more celebration
    setTimeout(() => {
        confetti({
            ...confettiConfig,
            particleCount: Math.floor(50 * intensity),
            origin: { x: 0.2, y: 0.6 }
        });
    }, 150);

    setTimeout(() => {
        confetti({
            ...confettiConfig,
            particleCount: Math.floor(50 * intensity),
            origin: { x: 0.8, y: 0.6 }
        });
    }, 300);

    // Add a final burst from the top
    setTimeout(() => {
        confetti({
            particleCount: Math.floor(30 * intensity),
            spread: 90,
            origin: { y: 0.1 },
            colors: ['#475569', '#64748b', '#94a3b8'],
            shapes: ['circle'],
            gravity: 1,
            ticks: 150,
            startVelocity: 45,
            decay: 0.9
        });
    }, 500);
}

// Reset pagination
function resetPagination() {
    currentPage = 1;
    hasNextPage = false;
    const query = document.querySelector('input[name="query"]').value;
    if (query) {
        searchProfiles(query, 1);
    }
}

// Load more profiles when scrolling down
async function loadMoreProfiles() {
    if (isLoadingMore || !hasNextPage || !currentSearchQuery) {
        return;
    }

    console.log('Loading more profiles...');
    isLoadingMore = true;

    // Show loading indicator
    const container = document.getElementById('profiles-container');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'flex items-center justify-center py-4 text-gray-600';
    loadingDiv.innerHTML = '<div class="loading-spinner mr-3"></div><span>Loading more profiles...</span>';
    container.appendChild(loadingDiv);

    try {
        await searchProfiles(currentSearchQuery, currentPage + 1, currentCursor);
    } finally {
        isLoadingMore = false;
        // Remove loading indicator
        if (loadingDiv.parentNode) {
            loadingDiv.remove();
        }
    }
}

// Check if user has scrolled to bottom
function isScrolledToBottom() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Trigger when user is within 100px of bottom
    return (scrollTop + windowHeight) >= (documentHeight - 100);
}

// Handle scroll events for infinite loading
function handleScroll() {
    if (isScrolledToBottom()) {
        loadMoreProfiles();
    }
}

// Update selected count display
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('input[name="add_to_list[]"]:checked');
    const selectedCount = checkboxes.length;
    const selectedCountElement = document.getElementById('selected-count');
    if (selectedCountElement) {
        selectedCountElement.textContent = selectedCount;
    }

    // Update add button state
    const addBtn = document.getElementById('add-selected-btn');
    if (addBtn) {
        addBtn.disabled = selectedCount === 0;
    }
}

// Add event listeners for checkboxes
function setupCheckboxListeners() {
    document.addEventListener('change', function(e) {
        if (e.target.name === 'add_to_list[]') {
            updateSelectedCount();
        }
    });
}
