# 🦋 Bluesky Profile Catcher

*Build targeted communities by catching the right profiles*

A PHP web application that searches for Bluesky profiles based on keywords and effortlessly adds them to your custom lists. Perfect for community builders, researchers, and anyone looking to curate meaningful connections on Bluesky.

## ✨ Features

- **🔍 Smart Keyword Search**: Find profiles containing any term in display names and descriptions
- **📋 Effortless List Building**: Add discovered users to your Bluesky lists via AT Protocol API
- **🧠 Intelligent Sorting**: New candidates appear first, existing members clearly marked
- **📄 Professional Pagination**: Smooth navigation through large result sets
- **🛡️ Duplicate Prevention**: Automatically detects users already in your lists
- **⚡ Bulk Operations**: Select and add multiple users with one click
- **📊 Real-time Analytics**: Live statistics and detailed progress tracking
- **🔧 Flexible Configuration**: Customize search terms, page sizes, and target lists

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
   cd bluesky-profile-catcher
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your actual values:
   ```env
   BLUESKY_HANDLE=your-handle.bsky.social
   BLUESKY_APP_PASSWORD=your-app-password-here
   QUERY=artist
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

| Variable | Description | Examples |
|----------|-------------|----------|
| `BLUESKY_HANDLE` | Your Bluesky handle (without @) | `your-handle.bsky.social` |
| `BLUESKY_APP_PASSWORD` | App password from Bluesky settings | `abcd-efgh-ijkl-mnop` |
| `QUERY` | Search term to find profiles | `artist`, `developer`, `writer`, `belge` |
| `PAGE_SIZE` | Number of results per page | `25` |
| `LIST_RKEY` | Your list identifier from Bluesky URL | `3kmkqahpucb2z` |

### Creating an App Password

1. Go to [Bluesky Settings → App Passwords](https://bsky.app/settings/app-passwords)
2. Click "Add App Password"
3. Give it a name (e.g., "Belgian Search Tool")
4. Copy the generated password to your `.env` file

## 🎯 Use Cases

**🎨 Creative Communities**
- Search: `artist`, `photographer`, `designer`
- Build lists of creators in your niche

**🌍 Geographic Communities**
- Search: `belge`, `australian`, `canadian`
- Connect people from specific regions

**💼 Professional Networks**
- Search: `developer`, `marketing`, `startup`
- Curate industry-specific connections

**🎮 Interest Groups**
- Search: `gaming`, `books`, `cooking`
- Build hobby-based communities

**🔬 Research & Academia**
- Search: `researcher`, `phd`, `science`
- Find academic professionals

## 🎯 Usage

1. **🔍 Browse Results**: View profiles matching your search term
2. **✨ Identify New Users**: Fresh candidates appear first with empty checkboxes
3. **✅ See Existing Members**: Users already in your list show checked boxes
4. **📝 Select Users**: Check boxes for users you want to add
5. **⚡ Bulk Add**: Click "Add Selected to List" to add them all
6. **📄 Navigate Pages**: Use numbered pagination to explore more results

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

### No results found
- Try broader search terms (e.g., `art` instead of `artist`)
- Check if the term exists in profiles' display names or descriptions
- Some terms may have limited results in the current user base

## 📊 Analytics Dashboard

The Profile Catcher provides comprehensive analytics:
- **📈 Discovery Metrics**: How many profiles found per search
- **✅ List Growth**: Track new vs existing members
- **🎯 Success Rate**: Conversion from discovery to list addition
- **🔍 Search Insights**: Most effective search terms
- **📊 Progress Tracking**: Real-time statistics and debug information

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

Made with ❤️ for the Bluesky community 🦋
*Catch profiles, build communities, spread your wings*