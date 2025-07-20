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
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('signin-btn').addEventListener('click', showSignInModal);
    document.getElementById('signout-btn').addEventListener('click', signOut);
    document.getElementById('list-dropdown').addEventListener('change', onListSelected);

    // Tab switching
    document.getElementById('found-tab').addEventListener('click', () => switchTab('found'));
    document.getElementById('list-tab').addEventListener('click', () => switchTab('list'));

    // Handle search form submission
    document.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        const query = document.querySelector('input[name="query"]').value;
        if (query && currentSession && currentList) {
            searchProfiles(query, 1);
        } else if (!currentSession) {
            showMessage('❌ Please sign in first', 'error');
        } else if (!currentList) {
            showMessage('❌ Please select a list first', 'error');
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

    // Load previously selected list
    const storedList = localStorage.getItem(STORAGE_KEYS.SELECTED_LIST);
    if (storedList) {
        dropdown.value = storedList;
        onListSelected();
    }
}

// Handle list selection
async function onListSelected() {
    const dropdown = document.getElementById('list-dropdown');
    const listUri = dropdown.value;

    if (!listUri) {
        currentList = null;
        updateUI();
        return;
    }

    const selectedList = userLists.find(list => list.uri === listUri);
    if (!selectedList) return;

    currentList = selectedList;
    localStorage.setItem(STORAGE_KEYS.SELECTED_LIST, listUri);

    // Show loading message
    showMessage('🔄 Loading list members...', 'info');

    // Load list members
    await loadListMembers();

    updateUI();
    showMessage('📋 Selected list: ' + selectedList.name + ' (' + (currentList.members ? currentList.members.length : 0) + ' members)', 'success');
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
        }

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
        foundTab.classList.add('border-blue-500', 'text-blue-600');
        foundTab.classList.remove('border-transparent', 'text-gray-500');
        listTab.classList.add('border-transparent', 'text-gray-500');
        listTab.classList.remove('border-blue-500', 'text-blue-600');
        foundContent.classList.remove('hidden');
        listContent.classList.add('hidden');
    } else {
        listTab.classList.add('border-blue-500', 'text-blue-600');
        listTab.classList.remove('border-transparent', 'text-gray-500');
        foundTab.classList.add('border-transparent', 'text-gray-500');
        foundTab.classList.remove('border-blue-500', 'text-blue-600');
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
async function searchProfiles(query, page = 1) {
    if (!currentSession) return;

    try {
        const response = await fetch(BLUESKY_API + '/app.bsky.actor.searchActors?term=' + encodeURIComponent(query) + '&limit=25', {
            headers: {
                'Authorization': 'Bearer ' + currentSession.accessJwt
            }
        });

        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        searchResults = data.actors || [];
        currentPage = page;
        hasNextPage = !!data.cursor;

        displaySearchResults();

    } catch (error) {
        console.error('Search error:', error);
        showMessage('❌ Search failed: ' + error.message, 'error');
    }
}

// Display search results
function displaySearchResults() {
    const container = document.getElementById('profiles-container');

    if (searchResults.length === 0) {
        container.innerHTML = '<p>No profiles found matching your search.</p>';
        return;
    }

    // Filter and sort results
    const filtered = searchResults.filter(actor => {
        const query = document.querySelector('input[name="query"]').value.toLowerCase();
        return (actor.displayName || '').toLowerCase().includes(query) ||
               (actor.description || '').toLowerCase().includes(query) ||
               (actor.handle || '').toLowerCase().includes(query);
    });

    // Sort: non-members first
    filtered.sort((a, b) => {
        const aInList = currentList && currentList.members && currentList.members.includes(a.did);
        const bInList = currentList && currentList.members && currentList.members.includes(b.did);

        if (aInList !== bInList) {
            return aInList ? 1 : -1;
        }

        return (a.displayName || a.handle).localeCompare(b.displayName || b.handle);
    });

    console.log('Filtered results:', filtered.length, 'profiles');
    console.log('Current list members:', currentList ? currentList.members.length : 0);
    console.log('Sample member DIDs:', currentList && currentList.members ? currentList.members.slice(0, 3) : []);
    console.log('Sample profile DIDs:', filtered.slice(0, 3).map(p => p.did));

        let html = '<div class="space-y-4">';
    filtered.forEach(actor => {
        const isInList = currentList && currentList.members && currentList.members.includes(actor.did);

        // Debug logging for first few profiles
        if (filtered.indexOf(actor) < 3) {
            console.log('Profile:', actor.handle, 'DID:', actor.did, 'In list:', isInList);
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
        html += '<strong class="text-lg">' + (actor.displayName || actor.handle) + '</strong>';
        html += '<a href="https://bsky.app/profile/' + actor.handle + '" target="_blank" class="text-blue-600 hover:text-blue-800 underline text-sm">@' + actor.handle + '</a>';

        if (isInList) {
            html += '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Already in list</span>';
        } else {
            html += '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">New candidate</span>';
        }
        html += '</div>';

        if (actor.description) {
            html += '<p class="text-gray-600 text-sm mb-3">' + actor.description + '</p>';
        }

        html += '<div class="flex items-center gap-2">';
        if (isInList) {
            html += '<input type="checkbox" checked disabled id="user_' + actor.did + '" class="mr-2">';
            html += '<label for="user_' + actor.did + '" class="text-gray-500 text-sm cursor-not-allowed">Already on the list</label>';
        } else {
            html += '<input type="checkbox" name="add_to_list[]" value="' + actor.did + '" id="user_' + actor.did + '" class="mr-2">';
            html += '<label for="user_' + actor.did + '" class="text-sm cursor-pointer">Select to add to list</label>';
        }
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    // Update statistics
    updateStatistics(filtered);

    // Enable/disable add button
    const addBtn = document.getElementById('add-selected-btn');
    const availableProfiles = filtered.filter(a => !currentList.members.includes(a.did));
    addBtn.disabled = availableProfiles.length === 0;
    console.log('Available profiles for adding:', availableProfiles.length);
}

// Update statistics
function updateStatistics(filtered) {
    const statsDiv = document.getElementById('statistics');
    const totalFiltered = filtered.length;
    const alreadyInList = filtered.filter(actor =>
        currentList && currentList.members && currentList.members.includes(actor.did)
    ).length;
    const newCandidates = totalFiltered - alreadyInList;

    let html = '<div class="bg-gray-50 p-4 rounded-lg mb-5 border border-gray-200">';
    html += '<h3 class="text-lg font-semibold mb-3">📊 Search Statistics</h3>';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">';
    html += '<div class="text-center"><span class="block text-2xl font-bold text-blue-600">' + totalFiltered + '</span><span class="text-gray-600">Total Found</span></div>';
    html += '<div class="text-center"><span class="block text-2xl font-bold text-green-600">' + newCandidates + '</span><span class="text-gray-600">New Candidates</span></div>';
    html += '<div class="text-center"><span class="block text-2xl font-bold text-gray-600">' + alreadyInList + '</span><span class="text-gray-600">Already in List</span></div>';
    if (currentList && currentList.members) {
        html += '<div class="text-center"><span class="block text-2xl font-bold text-purple-600">' + currentList.members.length + '</span><span class="text-gray-600">List Total</span></div>';
    }
    html += '</div>';
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

    let successCount = 0;
    let errorCount = 0;

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

    if (successCount > 0) {
        showMessage('✅ Successfully added ' + successCount + ' profile(s) to your list', 'success');
    }
    if (errorCount > 0) {
        showMessage('❌ Failed to add ' + errorCount + ' profile(s)', 'error');
    }
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