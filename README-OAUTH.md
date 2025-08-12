# OAuth Authentication for Bluesky Search

This application now supports both OAuth and App Password authentication methods for Bluesky.

## Authentication Methods

### 1. OAuth (Recommended)
- **More Secure**: No passwords are stored on this site
- **User-Friendly**: Users are redirected to Bluesky to sign in
- **Modern**: Uses the latest OAuth 2.0 standards with PKCE and DPoP

### 2. App Password (Legacy)
- **Traditional**: Uses Bluesky app passwords
- **Fallback**: Available if OAuth is not working
- **Manual**: Users need to create app passwords in their Bluesky settings

## OAuth Implementation Details

### Frontend Components
- `src/services/oauthService.js` - OAuth flow implementation
- `src/stores/blueskyStore.js` - Updated to support both auth methods
- `src/services/blueskyApi.js` - Updated to handle OAuth requests
- `src/components/SignInModal.svelte` - UI for choosing auth method
- `oauth-callback.html` - OAuth callback handler

### Backend Components
- `api/oauth-helper.php` - PHP helper for OAuth requests
- `api/lists.php` - Updated to support OAuth
- Other API endpoints can be updated similarly

### OAuth Flow
1. User clicks "Sign in with Bluesky" (OAuth)
2. Application generates PKCE code verifier and challenge
3. User is redirected to Bluesky with authorization request
4. User authenticates on Bluesky and grants permissions
5. Bluesky redirects back to our callback page with authorization code
6. Application exchanges code for access token using DPoP
7. Access token is stored and used for API requests

### Security Features
- **PKCE**: Proof Key for Code Exchange prevents authorization code interception
- **DPoP**: Demonstrating Proof of Possession binds tokens to client
- **State Parameter**: Prevents CSRF attacks
- **Secure Storage**: Tokens stored in localStorage (consider more secure storage for production)

## Setup Instructions

### 1. Register OAuth Client
You need to register your OAuth client with Bluesky. The client metadata is in `client-metadata.json`.

For development:
```json
{
  "client_id": "http://localhost:5173/client-metadata.json",
  "redirect_uris": ["http://localhost:5173/oauth-callback.html"]
}
```

For production:
```json
{
  "client_id": "https://bluesky-search-for-belgians.vercel.app/client-metadata.json",
  "redirect_uris": ["https://bluesky-search-for-belgians.vercel.app/oauth-callback.html"]
}
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test OAuth Flow
1. Open the application
2. Click "Sign in"
3. Select "OAuth (Recommended)"
4. Click "Sign in with Bluesky"
5. Complete authentication on Bluesky
6. You should be redirected back and signed in

## API Changes

### Frontend API Calls
All API calls now accept an `authType` parameter:
```javascript
// OAuth
await blueskyApi.getUserLists(session, 'oauth');

// App Password
await blueskyApi.getUserLists(session, 'app_password');
```

### Backend API Changes
Backend APIs now support both authentication methods:
- Check for OAuth headers (`Authorization: Bearer` + `DPoP`)
- Fall back to session-based authentication
- Use `make_bluesky_request()` helper for consistent API calls

## Troubleshooting

### Common Issues

1. **OAuth Not Working**
   - Check that your client is registered with Bluesky
   - Verify redirect URIs match exactly
   - Check browser console for errors

2. **CORS Issues**
   - Ensure backend allows `Authorization` and `DPoP` headers
   - Check that OAuth callback URL is accessible

3. **Token Issues**
   - OAuth tokens expire and need refresh
   - DPoP tokens are single-use and need regeneration

### Debug Mode
Enable debug logging by checking browser console and server logs.

## Migration from App Password

Existing users can continue using app passwords. The application will:
1. Detect the authentication method automatically
2. Use appropriate API calls for each method
3. Store authentication type for future requests

## Security Considerations

- OAuth tokens should be refreshed when expired
- Consider implementing token refresh logic
- For production, consider more secure token storage
- Implement proper error handling for OAuth failures
- Add rate limiting for OAuth requests

## Future Improvements

- [ ] Token refresh implementation
- [ ] More secure token storage
- [ ] OAuth error recovery
- [ ] Session persistence improvements
- [ ] Better error messages for OAuth failures