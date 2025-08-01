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
    return await crypto.subtle.generateKey(
        {
            name: 'ECDSA',
            namedCurve: 'P-256' // ES256 required by Bluesky
        },
        true, // Make keys extractable so we can export them for jose
        ['sign', 'verify'] // can be used for signing and verification
    );
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
            ? 'http://localhost:5173/client-metadata.json'
            : 'https://bluesky-list-manager.vercel.app/client-metadata.json';
        const redirectUri = `${window.location.origin}/oauth-callback.html`;

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
                ? 'http://localhost:5173/client-metadata.json'
                : 'https://bluesky-list-manager.vercel.app/client-metadata.json';
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
                    redirect_uri: `${window.location.origin}/oauth-callback.html`,
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
            ? 'http://localhost:5173/client-metadata.json'
            : 'https://bluesky-list-manager.vercel.app/client-metadata.json';
        const tokenRequestBody = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${window.location.origin}/oauth-callback.html`,
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
                        return {
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token,
                            sub: tokenData.sub,
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

        return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            sub: tokenData.sub,
            dpopKeypair,
            serverNonce: newNonce
        };

    } catch (error) {
        console.error('OAuth callback error:', error);
        throw error;
    }
}

// Store OAuth session
export function storeOAuthSession(session) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        sub: session.sub,
        serverNonce: session.serverNonce,
        timestamp: Date.now()
    }));
}

// Get stored OAuth session
export function getStoredOAuthSession() {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
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