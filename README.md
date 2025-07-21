# 🦋 Bluesky Profile Catcher

A PHP web application for discovering and curating Bluesky profiles. Search for profiles matching specific terms and add them to your Bluesky lists with ease.

## ✨ Features

- **Smart Search**: Find profiles containing specific terms in their names or descriptions
- **List Management**: Add selected profiles to your Bluesky lists in bulk
- **Duplicate Prevention**: Automatically detects and prevents adding profiles already in your list
- **Visual Feedback**: Clear indicators showing which profiles are already in your list
- **Docker Support**: Easy deployment with Docker Compose

## 🚀 Quick Start

### 1. Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your Bluesky credentials:

```env
BLUESKY_HANDLE=your_handle.bsky.social
BLUESKY_APP_PASSWORD=your_app_password_here
```

**Finding your LIST_RKEY:**
- Go to your Bluesky list in the web interface
- The URL will be something like: `https://bsky.app/profile/your_handle/lists/LIST_RKEY`
- Copy the LIST_RKEY part

### 2. Run with Docker

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### 3. Access the Application

Open your browser and go to: http://localhost:8080

## 🛠️ Local Development

If you prefer to run without Docker:

```bash
# Make sure PHP is installed
php --version

# Start the built-in PHP server
php -S localhost:8000

# Access at http://localhost:8000
```

## 📝 How It Works

1. **Search**: The app searches Bluesky for profiles matching your query
2. **Filter**: Results are filtered to show matches in profile names/descriptions
3. **Deduplicate**: Profiles already in your target list are marked
4. **Bulk Add**: Select multiple profiles and add them to your list at once
5. **Paginate**: Browse through all search results page by page

## 🔧 Configuration Options

- `BLUESKY_HANDLE`: Your Bluesky handle (e.g., username.bsky.social)
- `BLUESKY_APP_PASSWORD`: Generate this in Bluesky Settings > App Passwords

## 🐳 Docker Details

- **Image**: PHP 8.2 with Apache
- **Port**: 8080 (maps to container port 80)

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is open source and available under the MIT License.
