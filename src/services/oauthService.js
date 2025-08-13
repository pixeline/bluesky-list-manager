import * as jose from 'jose';

// Types for our auth state
const AUTH_STORAGE_KEY = 'bluesky_oauth_session';
const CODE_VERIFIER_KEY = 'bluesky_code_verifier';
const STATE_KEY = 'bluesky_oauth_state';
const SERVER_URL_KEY = 'bluesky_server_url';

// Generate a random string for PKCE code verifier
export function generateCodeVerifier(length = 128) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
        result += charset[randomValues[i] % charset.length];
    }

    return result;
}

// Generate code challenge from code verifier (for PKCE)
export async function generateCodeChallenge(codeVerifier) {
    // Convert string to ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);

    // Hash the code verifier with SHA-256
    const hash = await crypto.subtle.digest('SHA-256', data);

    // Convert to base64url encoding
    return base64UrlEncode(hash);
}

// Base64Url encoding helper
function base64UrlEncode(buffer) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Generate a DPoP keypair using WebCrypto
export async function generateDpopKeypair() {
    try {
        console.log('Generating DPoP keypair...');
        const keypair = await crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256' // ES256 required by Bluesky
            },
            true, // Make keys extractable so we can export them for jose
            ['sign', 'verify'] // can be used for signing and verification
        );

        // Debug: Check the key structure
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey);
        const publicKeyJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey);

        console.log('Generated DPoP keypair:', {
            privateKey: {
                kty: privateKeyJwk.kty,
                crv: privateKeyJwk.crv,
                hasX: !!privateKeyJwk.x,
                hasY: !!privateKeyJwk.y,
                hasD: !!privateKeyJwk.d
            },
            publicKey: {
                kty: publicKeyJwk.kty,
                crv: publicKeyJwk.crv,
                hasX: !!publicKeyJwk.x,
                hasY: !!publicKeyJwk.y
            }
        });

        return keypair;
    } catch (error) {
        console.error('Failed to generate DPoP keypair:', error);
        throw error;
    }
}

// Create a DPoP JWT for token requests using the jose library
export async function createDpopJwt(
    keypair,
    method,
    url,
    nonce,
    accessToken
) {
    try {
        // Extract the public key to JWK format for inclusion in the header
        const publicKeyJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey);

        // Create the payload
        const payload = {
            jti: crypto.randomUUID(),
            htm: method,
            htu: url,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 120 // 2 minutes expiration
        };

        // Add optional fields
        if (nonce) {
            payload.nonce = nonce;
        }

        if (accessToken) {
            // Hash the access token and add it to the payload
            const encoder = new TextEncoder();
            const data = encoder.encode(accessToken);
            const hash = await crypto.subtle.digest('SHA-256', data);
            payload.ath = base64UrlEncode(hash);
        }

        // Use jose to create a properly formatted JWT
        const privateKey = await jose.importJWK(
            await crypto.subtle.exportKey('jwk', keypair.privateKey),
            'ES256'
        );

        // Create a signed JWT with the jose library
        const dpopJwt = await new jose.SignJWT(payload)
            .setProtectedHeader({
                alg: 'ES256',
                typ: 'dpop+jwt',
                jwk: {
                    kty: publicKeyJwk.kty,
                    crv: publicKeyJwk.crv,
                    x: publicKeyJwk.x,
                    y: publicKeyJwk.y
                }
            })
            .sign(privateKey);

        return dpopJwt;
    } catch (error) {
        console.error('Error creating DPoP JWT:', error);
        throw error;
    }
}

// Initialize the OAuth flow by redirecting to the authorization server
export async function startOAuthFlow(serverUrl = 'https://bsky.social') {
    try {
        // 1. Generate and store PKCE code verifier
        const codeVerifier = generateCodeVerifier();
        localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

        // 2. Generate code challenge
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // 3. Generate state parameter (anti-CSRF)
        const state = crypto.randomUUID();
        localStorage.setItem(STATE_KEY, state);

        // 4. Store the authorization server URL
        localStorage.setItem(SERVER_URL_KEY, serverUrl);

        // 5. Construct the authorization URL
        // Use localhost for development, production URL for production
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const clientId = isLocalhost
            ? 'http://localhost:5174/.well-known/oauth-client-metadata.json'
            : 'https://pixeline.be/bluesky-list-manager/.well-known/oauth-client-metadata.json';
                // Handle subdirectory structure for redirect URI
        const path = window.location.pathname;
        const basePath = path.includes('/bluesky-list-manager') ? '/bluesky-list-manager' : '';
        // For localhost, don't include the basePath since it's served from root
        const redirectUri = isLocalhost
            ? `${window.location.origin}/oauth-callback.html`
            : `${window.location.origin}${basePath}/oauth-callback-standalone.html`;

        const authUrl = new URL(`${serverUrl}/oauth/authorize`);
        authUrl.searchParams.append('client_id', clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', redirectUri);
        authUrl.searchParams.append('scope', 'atproto transition:generic');
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('code_challenge', codeChallenge);
        authUrl.searchParams.append('code_challenge_method', 'S256');

        // 6. Redirect the user to the authorization server
        window.location.href = authUrl.toString();

    } catch (error) {
        console.error('Failed to start OAuth flow:', error);
        throw error;
    }
}

// Handle the OAuth callback and exchange code for tokens
export async function handleOAuthCallback(queryParams) {
    try {
        // 1. Verify state parameter to prevent CSRF
        const storedState = localStorage.getItem(STATE_KEY);
        const returnedState = queryParams.get('state');

        if (!storedState || storedState !== returnedState) {
            throw new Error('Invalid state parameter');
        }

        // 2. Get the authorization code
        const code = queryParams.get('code');
        if (!code) {
            throw new Error('No authorization code returned');
        }

        // 3. Get the code verifier from storage
        const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
        if (!codeVerifier) {
            throw new Error('No code verifier found');
        }

        // 4. Get the server URL
        const serverUrl = localStorage.getItem(SERVER_URL_KEY) || 'https://bsky.social';

        // 5. Generate a new DPoP keypair
        const dpopKeypair = await generateDpopKeypair();

        // 6. Get DPoP nonce
        let dpopNonce = '';
        try {
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const clientId = isLocalhost
                ? 'http://localhost:5174/.well-known/oauth-client-metadata.json'
                : 'https://pixeline.be/bluesky-list-manager/.well-known/oauth-client-metadata.json';

            // Calculate basePath for redirect URI
            const path = window.location.pathname;
            const basePath = path.includes('/bluesky-list-manager') ? '/bluesky-list-manager' : '';
            // For localhost, don't include the basePath since it's served from root
            const redirectUri = isLocalhost
                ? `${window.location.origin}/oauth-callback.html`
                : `${window.location.origin}${basePath}/oauth-callback-standalone.html`;

            const initialDpopJwt = await createDpopJwt(
                dpopKeypair,
                'POST',
                `${serverUrl}/oauth/token`
            );

            const dummyCodeVerifier = generateCodeVerifier(64);

            const initialResponse = await fetch(`${serverUrl}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'DPoP': initialDpopJwt
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: 'dummy-code',
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    code_verifier: dummyCodeVerifier
                }).toString()
            });

            dpopNonce = initialResponse.headers.get('DPoP-Nonce') || '';
        } catch (error) {
            console.error('Failed to get DPoP nonce:', error);
        }

        // 7. Create a DPoP JWT for the token request with the nonce
        const tokenEndpoint = `${serverUrl}/oauth/token`;
        const dpopJwt = await createDpopJwt(
            dpopKeypair,
            'POST',
            tokenEndpoint,
            dpopNonce
        );

        // 8. Exchange the code for tokens
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const clientId = isLocalhost
            ? 'http://localhost:5174/.well-known/oauth-client-metadata.json'
            : 'https://pixeline.be/bluesky-list-manager/.well-known/oauth-client-metadata.json';

                // Calculate basePath for redirect URI
        const path = window.location.pathname;
        const basePath = path.includes('/bluesky-list-manager') ? '/bluesky-list-manager' : '';
        // For localhost, don't include the basePath since it's served from root
        const redirectUri = isLocalhost
            ? `${window.location.origin}/oauth-callback.html`
            : `${window.location.origin}${basePath}/oauth-callback-standalone.html`;

        const tokenRequestBody = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier
        });

        const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'DPoP': dpopJwt
            },
            body: tokenRequestBody
        });

        // If we received a DPoP-Nonce in the response, save it
        const newNonce = tokenResponse.headers.get('DPoP-Nonce');

        if (!tokenResponse.ok) {
            let errorMsg = 'Token request failed';
            try {
                const errorData = await tokenResponse.json();
                errorMsg += `: ${errorData.error}`;
                if (errorData.error_description) {
                    errorMsg += ` - ${errorData.error_description}`;
                }

                // Handle the case where we need to use a DPoP nonce
                if (errorData.error === 'use_dpop_nonce' && newNonce) {
                    const retryDpopJwt = await createDpopJwt(
                        dpopKeypair,
                        'POST',
                        tokenEndpoint,
                        newNonce
                    );

                    const retryResponse = await fetch(tokenEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'DPoP': retryDpopJwt
                        },
                        body: tokenRequestBody
                    });

                    if (retryResponse.ok) {
                        const tokenData = await retryResponse.json();
                        // Get user profile to resolve handle
                        const handle = await resolveUserHandle(serverUrl, tokenData.access_token, tokenData.sub, dpopKeypair, retryResponse.headers.get('DPoP-Nonce') || newNonce);

                        return {
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token,
                            sub: tokenData.sub,
                            handle: handle,
                            dpopKeypair,
                            serverNonce: retryResponse.headers.get('DPoP-Nonce') || newNonce
                        };
                    } else {
                        const retryErrorData = await retryResponse.json();
                        throw new Error(`Retry token request failed: ${retryErrorData.error}`);
                    }
                }
            } catch (e) {
                console.error('Failed to parse error response', e);
            }
            throw new Error(errorMsg);
        }

        // 9. Parse the token response
        const tokenData = await tokenResponse.json();

        // 10. Get user profile to resolve handle
        const handle = await resolveUserHandle(serverUrl, tokenData.access_token, tokenData.sub, dpopKeypair, newNonce);

        return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            sub: tokenData.sub,
            handle: handle,
            dpopKeypair,
            serverNonce: newNonce
        };

    } catch (error) {
        console.error('OAuth callback error:', error);
        throw error;
    }
}

// Helper function to resolve user handle from profile
async function resolveUserHandle(serverUrl, accessToken, userDid, dpopKeypair, nonce) {
    try {
        console.log('Resolving handle for user DID:', userDid);

        // Use the public Bluesky API endpoint for profile fetching (no auth needed)
        const profileUrl = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${userDid}`;
        console.log('Fetching profile from public API:', profileUrl);

        const profileResponse = await fetch(profileUrl, {
            method: 'GET',
            // No Authorization header needed for public endpoints
        });

        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.handle && !profileData.handle.startsWith('did:')) {
                console.log('Successfully resolved handle:', profileData.handle);
                return profileData.handle;
            }
        }

        console.log('Failed to resolve handle, using DID as fallback');
        return userDid; // Fallback to DID if handle resolution fails
    } catch (error) {
        console.error('Failed to fetch user profile for handle resolution:', error);
        return userDid; // Fallback to DID on error
    }
}

// Store OAuth session
export async function storeOAuthSession(session) {
    try {
        console.log('Storing OAuth session, input session:', {
            hasAccessToken: !!session.accessToken,
            hasRefreshToken: !!session.refreshToken,
            hasSub: !!session.sub,
            hasHandle: !!session.handle,
            hasDpopKeypair: !!session.dpopKeypair,
            dpopKeypairType: typeof session.dpopKeypair
        });

        // Export the DPoP keypair to JWK format for storage
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', session.dpopKeypair.privateKey);
        const publicKeyJwk = await crypto.subtle.exportKey('jwk', session.dpopKeypair.publicKey);

        console.log('Exported JWK keys:', {
            privateKey: {
                kty: privateKeyJwk.kty,
                crv: privateKeyJwk.crv,
                hasX: !!privateKeyJwk.x,
                hasY: !!privateKeyJwk.y,
                hasD: !!privateKeyJwk.d,
                allKeys: Object.keys(privateKeyJwk)
            },
            publicKey: {
                kty: publicKeyJwk.kty,
                crv: publicKeyJwk.crv,
                hasX: !!publicKeyJwk.x,
                hasY: !!publicKeyJwk.y,
                allKeys: Object.keys(publicKeyJwk)
            }
        });

        // Ensure all required JWK fields are present
        if (!privateKeyJwk.kty || !publicKeyJwk.kty) {
            throw new Error('Invalid DPoP keypair - missing required JWK fields');
        }

        const sessionData = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            sub: session.sub,
            handle: session.handle,
            serverNonce: session.serverNonce,
            dpopKeypair: {
                privateKey: privateKeyJwk,
                publicKey: publicKeyJwk
            },
            timestamp: Date.now()
        };

        console.log('Storing OAuth session with DPoP keypair:', {
            hasPrivateKey: !!sessionData.dpopKeypair.privateKey,
            hasPublicKey: !!sessionData.dpopKeypair.publicKey,
            privateKeyType: sessionData.dpopKeypair.privateKey.kty,
            publicKeyType: sessionData.dpopKeypair.publicKey.kty
        });

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
        console.log('OAuth session stored successfully');
    } catch (error) {
        console.error('Failed to store OAuth session:', error);
        throw error;
    }
}

// Get stored OAuth session
export async function getStoredOAuthSession() {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
        try {
            const session = JSON.parse(stored);
            console.log('Retrieved stored OAuth session:', {
                hasAccessToken: !!session.accessToken,
                hasSub: !!session.sub,
                hasDpopKeypair: !!session.dpopKeypair,
                timestamp: session.timestamp
            });

            // Import the DPoP keypair if it exists
            if (session.dpopKeypair && session.dpopKeypair.privateKey && session.dpopKeypair.publicKey) {
                try {
                    // Validate JWK structure
                    if (!session.dpopKeypair.privateKey.kty || !session.dpopKeypair.publicKey.kty) {
                        console.error('Invalid JWK structure in stored DPoP keypair');
                        throw new Error('Invalid JWK structure');
                    }

                    const privateKey = await crypto.subtle.importKey(
                        'jwk',
                        session.dpopKeypair.privateKey,
                        {
                            name: 'ECDSA',
                            namedCurve: 'P-256'
                        },
                        true,
                        ['sign']
                    );

                    const publicKey = await crypto.subtle.importKey(
                        'jwk',
                        session.dpopKeypair.publicKey,
                        {
                            name: 'ECDSA',
                            namedCurve: 'P-256'
                        },
                        true,
                        ['verify']
                    );

                    session.dpopKeypair = {
                        privateKey,
                        publicKey
                    };

                    console.log('Successfully imported DPoP keypair');
                } catch (keyError) {
                    console.error('Failed to import DPoP keypair:', keyError);
                    // Remove the corrupted session
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                    return null;
                }
            } else {
                console.warn('No DPoP keypair found in stored session');
            }

            return session;
        } catch (e) {
            console.error('Failed to parse stored OAuth session:', e);
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }
    return null;
}

// Clear OAuth session
export function clearOAuthSession() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(CODE_VERIFIER_KEY);
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(SERVER_URL_KEY);
}