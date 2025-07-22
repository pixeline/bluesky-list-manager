# Bluesky List Manager (Svelte Version)

A modern, component-based Bluesky list management tool built with Svelte.js. Find and curate profiles to add to your Bluesky lists with an improved user experience.

## Features

- 🔐 **Secure Authentication**: Sign in with your Bluesky credentials (stored locally)
- 📋 **List Management**: Select and manage your Bluesky lists
- 🔍 **Profile Search**: Search for profiles by keywords in bio, display name, or handle
- ✅ **Smart Filtering**: See which profiles are already in your list
- 📊 **List Statistics**: View detailed information about your selected list
- 🎯 **Bulk Actions**: Add multiple profiles to your list with one click
- 📱 **Responsive Design**: Works great on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bluesky-search-for-belgians
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/           # Svelte components
│   ├── BlueskyUserProfile.svelte
│   ├── Header.svelte
│   ├── AuthInstructions.svelte
│   ├── SignInModal.svelte
│   ├── ListSelector.svelte
│   ├── ListManager.svelte
│   ├── ListStatistics.svelte
│   └── ProfileSearch.svelte
├── stores/              # Svelte stores for state management
│   ├── blueskyStore.js
│   └── listStore.js
├── services/            # API services
│   └── blueskyApi.js
├── App.svelte          # Main application component
└── main.js             # Application entry point
```

## Key Components

### BlueskyUserProfile
A reusable component that displays a user profile card with:
- Profile picture (with fallback)
- Display name and handle
- Description
- Status tag (e.g., "New candidate", "Already in list")
- Selection checkbox

### State Management
The application uses Svelte stores for state management:
- `blueskyStore`: Manages authentication and session
- `listStore`: Manages list selection and list data

### API Service
The `blueskyApi` service handles all communication with the Bluesky API:
- Authentication
- List management
- Profile search
- Adding users to lists

## UX Improvements

### 1. Clear User Flow
- **Not logged in**: Shows welcome screen with feature explanation
- **Logged in, no list selected**: Shows list selector
- **List selected**: Shows list manager with statistics, search, and members

### 2. Better Information Architecture
- List statistics prominently displayed
- Search form clearly separated
- Latest 100 list members shown with pagination
- Clear status indicators for profiles

### 3. Enhanced Profile Cards
- Consistent design matching the provided image
- Status tags to show if profile is already in list
- Better visual hierarchy
- Responsive layout

## Development

### Adding New Features

1. Create new components in `src/components/`
2. Add new stores if needed in `src/stores/`
3. Extend the API service for new endpoints
4. Update the main App.svelte to include new views

### Styling

The application uses Tailwind CSS for styling. All components include their own styles where needed.

### State Management

- Use Svelte stores for global state
- Keep component state local when possible
- Use reactive statements (`$:`) for derived state

## Security

- All credentials are stored locally in the browser
- No credentials are sent to our servers
- Direct communication with Bluesky API only
- Session tokens are managed securely

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]