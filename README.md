# Bluesky List Manager

A modern web application for managing members in your Bluesky lists. Built with Svelte, Vite, and PHP.

## 🚀 Quick Start

### Manual Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## ✨ Features

- **List Management**: View and manage members in your Bluesky lists
- **Profile Search**: Search for profiles by keywords in bio, display name, or handle
- **Real-time Counts**: Accurate member counts with real-time updates
- **Modern UI**: Clean, responsive interface built with Svelte and Tailwind CSS
- **Error Handling**: Robust error handling with retry functionality

## 🔧 Recent Fixes

### ✅ Profile Loading Issues Resolved
- Fixed profile components showing generic placeholder cards
- Proper API response parsing for Bluesky profile data
- Enhanced error handling with retry buttons

### ✅ Member Count Discrepancy Fixed
- Resolved inconsistency between dropdown and list details counts
- Real-time member counting instead of stale cached data
- Consistent UI across all components

### ✅ Enhanced Debugging
- Comprehensive API logging for troubleshooting
- Better error messages and user feedback
- Improved development experience

## 📁 Project Structure

```
bluesky-search-for-belgians/
├── src/                    # Svelte frontend components
├── api/                    # PHP backend APIs
├── static/                 # Static assets
├── dist/                   # Built application (after npm run build)
└── DEPLOYMENT.md          # Detailed deployment guide
```

## 🛠️ Development

### Prerequisites
- Node.js 16+ and npm
- PHP 8.0+ (for API endpoints)

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔍 Troubleshooting

### Profile Loading Issues
1. Check `api/debug.txt` for API errors
2. Use retry button in the interface
3. Verify Bluesky API responses

### Member Count Issues
1. Refresh the page to reload data
2. Check debug logs for counting errors
3. Verify list selection is correct

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Comprehensive deployment instructions
- [Svelte Development](README-SVELTE.md) - Frontend development guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

For issues and questions:
1. Check the [troubleshooting section](#troubleshooting)
2. Review the debug logs in `api/debug.txt`
3. Open an issue on GitHub

---

**Status**: ✅ Ready for deployment with all major issues resolved
