# Deployment Guide (No PHP Required)

This application now works entirely in the browser using OAuth authentication. No PHP backend is required!

## Deployment Options

### 1. Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect to existing project
vercel --prod
```

### 2. Netlify
```bash
# Build the project
npm run build

# Deploy the dist folder to Netlify
```

### 3. GitHub Pages
```bash
# Build the project
npm run build

# Push dist folder to gh-pages branch
```

### 4. Any Static Hosting
- Build with `npm run build`
- Upload the `dist` folder to any static hosting service

## OAuth Setup

### 1. Register OAuth Client
You need to register your OAuth client with Bluesky. Use the `client-metadata.json` file:

```json
{
  "client_id": "https://your-domain.com/client-metadata.json",
  "client_name": "Bluesky List Manager",
  "client_uri": "https://your-domain.com",
  "redirect_uris": ["https://your-domain.com/oauth-callback.html"]
}
```

### 2. Update Client Metadata
Update `client-metadata.json` with your actual domain:
- Replace `https://bluesky-list-manager.vercel.app` with your domain
- Update `redirect_uris` to include your domain

### 3. Deploy Client Metadata
Make sure `client-metadata.json` is accessible at your domain root.

## Build and Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy the dist folder
```

## Environment Variables

No environment variables needed! Everything works client-side.

## CORS

No CORS issues since all requests go directly to Bluesky APIs from the browser.

## Benefits of No-PHP Version

1. **Simpler Deployment**: Just static files
2. **Better Performance**: No server round-trips
3. **Lower Costs**: No server hosting required
4. **Easier Maintenance**: No backend code to maintain
5. **Better Security**: OAuth tokens handled client-side
6. **Scalability**: Can handle unlimited users

## Migration from PHP Version

If you're migrating from the PHP version:

1. **Backup**: Keep your PHP version as backup
2. **Test OAuth**: Ensure OAuth works with your domain
3. **Update URLs**: Update any hardcoded URLs
4. **Deploy**: Deploy the new static version
5. **Monitor**: Watch for any issues

## Troubleshooting

### OAuth Not Working
- Check client registration with Bluesky
- Verify redirect URIs match exactly
- Check browser console for errors

### Build Issues
- Ensure all dependencies are installed
- Check for any remaining PHP references
- Verify all imports are correct

### Deployment Issues
- Ensure `client-metadata.json` is accessible
- Check that all static assets are included
- Verify OAuth callback URL is accessible