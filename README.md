# 🇧🇪 Bluesky Search for Belgians

A PHP web application that searches for Belgian profiles on Bluesky and allows you to manage them in a custom list.

## ✨ Features

- **Smart Search**: Searches for profiles containing "belge" (or any custom term) in display names and descriptions
- **List Management**: Add found users to your Bluesky list via AT Protocol API
- **Intelligent Sorting**: Shows new candidates first, already-added users after
- **Professional Pagination**: Numbered page navigation with session-based cursor management
- **Duplicate Prevention**: Automatically detects users already in your list
- **Bulk Operations**: Select multiple users and add them all at once
- **Real-time Feedback**: Success/error messages and detailed statistics

## 🚀 Installation

### Prerequisites

- PHP 8.0 or higher
- cURL extension enabled
- A Bluesky account
- A Bluesky App Password (created at [bsky.app/settings/app-passwords](https://bsky.app/settings/app-passwords))

### Setup

1. **Clone or download this repository:**
   ```bash
   git clone <repository-url>
   cd bluesky-search-for-belgians
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your actual values:
   ```env
   BLUESKY_HANDLE=your-handle.bsky.social
   BLUESKY_APP_PASSWORD=your-app-password-here
   QUERY=belge
   PAGE_SIZE=25
   LIST_RKEY=your-list-rkey-here
   ```

3. **Get your List RKEY:**
   - Go to your Bluesky list: `https://bsky.app/profile/your-handle/lists/LIST_ID`
   - Copy the `LIST_ID` part and put it in your `.env` as `LIST_RKEY`

4. **Start the development server:**
   ```bash
   php -S localhost:8000
   ```

5. **Open your browser:**
   Navigate to `http://localhost:8000`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BLUESKY_HANDLE` | Your Bluesky handle (without @) | `pixeline.be` |
| `BLUESKY_APP_PASSWORD` | App password from Bluesky settings | `abcd-efgh-ijkl-mnop` |
| `QUERY` | Search term to find profiles | `belge` |
| `PAGE_SIZE` | Number of results per page | `25` |
| `LIST_RKEY` | Your list identifier from Bluesky URL | `3kmkqahpucb2z` |

### Creating an App Password

1. Go to [Bluesky Settings → App Passwords](https://bsky.app/settings/app-passwords)
2. Click "Add App Password"
3. Give it a name (e.g., "Belgian Search Tool")
4. Copy the generated password to your `.env` file

## 🎯 Usage

1. **Browse Results**: The app shows profiles matching your search term
2. **Identify New Users**: New candidates appear first with empty checkboxes
3. **See Existing Members**: Users already in your list show with ✅ checked boxes
4. **Select Users**: Check the boxes for users you want to add
5. **Bulk Add**: Click "Add Selected to List" to add them all
6. **Navigate Pages**: Use numbered pagination to browse more results

## 🛠 Technical Details

### AT Protocol Integration

This app uses Bluesky's AT Protocol APIs:

- **`com.atproto.server.createSession`**: Authentication
- **`app.bsky.actor.searchActors`**: Search for users
- **`com.atproto.repo.createRecord`**: Add users to lists
- **`com.atproto.repo.listRecords`**: Get existing list members
- **`com.atproto.repo.getRecord`**: Get list information

### List Management

Users are added to your list by creating `app.bsky.graph.listitem` records with:
```json
{
  "$type": "app.bsky.graph.listitem",
  "subject": "did:plc:user-did-here",
  "list": "at://your-did/app.bsky.graph.list/list-rkey",
  "createdAt": "2025-01-19T22:00:00.000Z"
}
```

### Session Management

- Uses PHP sessions to store pagination cursors
- Maintains state across page navigation
- Reset pagination option available

## 🔒 Security

- **Environment Variables**: Sensitive credentials stored in `.env` (not committed)
- **Input Sanitization**: All user inputs are properly escaped
- **App Passwords**: Uses Bluesky's secure app password system
- **No Hardcoded Secrets**: All credentials configurable via environment

## 🐛 Troubleshooting

### "Environment file not found"
- Make sure you copied `.env.example` to `.env`
- Ensure the `.env` file is in the same directory as `index.php`

### "BLUESKY_APP_PASSWORD not set"
- Check your `.env` file has the correct app password
- Ensure there are no extra spaces around the `=` sign

### "Failed to authenticate"
- Verify your handle is correct (without @ symbol)
- Make sure your app password is valid and not expired
- Check if your account has 2FA enabled

### Users not showing as "already in list"
- The app fetches all list members on each load
- Large lists (1000+ members) may take a moment to load
- Check the debug information for member count

## 📊 Statistics

The app provides detailed statistics:
- **Per-page counts**: How many users found on current page
- **List status**: How many are already in your list vs new candidates
- **Total members**: Current size of your list
- **Debug info**: Technical details for troubleshooting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is open source. Feel free to use, modify, and distribute.

## 🔗 Links

- [Bluesky Social](https://bsky.app)
- [AT Protocol Documentation](https://atproto.com)
- [Bluesky API Reference](https://docs.bsky.app)

---

Made with ❤️ for the Belgian Bluesky community 🇧🇪