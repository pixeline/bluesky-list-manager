# Bluesky List Manager - Deployment Guide

## 🚀 Deployment

### Manual Deployment

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start development server
npm run dev
```

### Subfolder Deployment (Production)

The application is configured to work in both local development and production subfolder environments:

```bash
# Build for production (subfolder deployment)
NODE_ENV=production npm run build

# Upload the dist/ folder to your web server subfolder
# Example: /var/www/html/bluesky-list-manager/
```

**Important**: For subfolder deployment, ensure your web server is configured to:
- Serve the `dist/` folder contents
- Handle API requests to `/api/` endpoints
- Include the `.htaccess` file for Apache servers

## 📋 What's Fixed in This Release

### ✅ Profile Loading Issues
- **Problem**: Profile components showing generic placeholder cards with question marks
- **Root Cause**: API was expecting profiles wrapped in `data` field, but Bluesky returns them directly
- **Solution**: Updated `api/profiles.php` to handle both response formats
- **Result**: Real profile information now displays properly

### ✅ Member Count Discrepancy
- **Problem**: Dropdown showed different count than list details (e.g., 1000 vs 1004)
- **Root Cause**: Dropdown used stale `listItemCount` from lists API, details used real-time count
- **Solution**: Updated dropdown to show real-time count for selected list
- **Result**: Consistent member counts across the interface

### ✅ Enhanced Debugging
- **Added**: Comprehensive logging to `api/list-members.php` and `api/profiles.php`
- **Added**: Better error messages and retry functionality
- **Added**: Fallback display with retry buttons when profile loading fails

## 🏗️ Architecture

### Frontend (Svelte + Vite)
- **Location**: `src/` directory
- **Build Output**: `dist/` directory
- **Key Components**:
  - `ListManager.svelte` - Main list management interface
  - `ProfileSearch.svelte` - Profile search functionality
  - `Header.svelte` - Navigation and list selection
  - `BlueskyUserProfile.svelte` - Individual profile display

### Backend (PHP APIs)
- **Location**: `api/` directory
- **Key Endpoints**:
  - `auth.php` - User authentication
  - `lists.php` - Fetch user's lists
  - `list-members.php` - Get list members (with real-time counting)
  - `profiles.php` - Fetch profile details (fixed response parsing)
  - `search.php` - Search for profiles
  - `add-to-list.php` - Add profiles to lists

### Configuration
- **Development**: `vite.config.js` and `svelte.config.js`
- **Debugging**: `api/debug.txt` for API request/response logging

## 🔧 Configuration

### Environment Variables
No environment variables required - the application uses client-side authentication with Bluesky.

### Dual Environment Support
The application automatically detects and adapts to different deployment environments:

- **Local Development**: Uses absolute paths (`/api`, `/static`)
- **Production Subfolder**: Uses relative paths (`./api`, `./static`)

This is handled automatically by the configuration system in `src/config.js`.

### API Endpoints
If using a PHP backend, endpoints are typically:
- `/api/auth.php` - Authentication
- `/api/lists.php` - Lists management
- `/api/list-members.php` - Member counting
- `/api/profiles.php` - Profile fetching
- `/api/search.php` - Profile search
- `/api/add-to-list.php` - List management

### CORS Configuration
APIs are configured to allow cross-origin requests from any domain for development flexibility.

## 🐳 Docker

Docker-based deployment was previously supported but is no longer maintained in this project. Use the manual/static deployment instructions above.

## 🔍 Troubleshooting

### Profile Loading Issues
1. Check `api/debug.txt` for API errors
2. Verify Bluesky API responses in debug logs
3. Check browser console for frontend errors
4. Use retry button in the interface

### Member Count Issues
1. Check `api/debug.txt` for list-members API logs
2. Verify real-time count vs cached count
3. Refresh the page to reload member data

### Authentication Issues
1. Ensure user is signed in to Bluesky
2. Check if session is valid
3. Try signing out and back in

## 📊 Monitoring

### Debug Logs
- **Location**: `api/debug.txt`
- **Content**: All API requests, responses, and errors
- **Rotation**: Manual (consider log rotation for production)

### Performance
- Profile loading: Individual requests (25 per page)
- Member counting: Real-time pagination through all list items
- Search: Paginated results with cursor-based navigation

## 🔒 Security Considerations

### API Security
- All endpoints validate session tokens
- Input sanitization on all user inputs
- CORS configured for development (restrict for production)

### Data Privacy
- No user data stored locally
- All data fetched from Bluesky APIs
- Session tokens handled client-side

## 🚀 Production Deployment

### Recommended Setup
1. **Web Server**: Nginx with PHP-FPM
2. **SSL**: HTTPS with valid certificate
3. **Caching**: Consider Redis for API response caching
4. **Monitoring**: Application performance monitoring
5. **Backup**: Regular backups of configuration and logs

### Performance Optimization
- Enable gzip compression
- Set appropriate cache headers
- Consider CDN for static assets
- Monitor API rate limits with Bluesky

## 📝 Changelog

### Latest Release
- ✅ Fixed profile loading and display
- ✅ Resolved member count discrepancies
- ✅ Enhanced error handling and debugging
- ✅ Improved user experience with retry functionality
- ✅ Added comprehensive API logging

### Previous Issues Resolved
- Profile components not hydrating properly
- Generic placeholder cards instead of real profiles
- Inconsistent member counts between UI elements
- Poor error feedback when API calls fail