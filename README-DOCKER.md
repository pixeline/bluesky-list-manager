# 🐳 Bluesky List Manager - Docker Setup

This document explains how to run the Bluesky List Manager application using Docker Compose.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Git (to clone the repository)

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd bluesky-search-for-belgians
```

### 2. Start the Application
```bash
./start-docker.sh
```

Or manually:
```bash
docker-compose up -d
```

### 3. Access the Application
- **Frontend (Svelte App)**: http://localhost:5173
- **Backend (PHP API)**: http://localhost:8000

## 🏗️ Architecture

The application runs in two containers:

### 📱 Node.js Container (`node-app`)
- **Image**: `node:24-alpine`
- **Port**: 5173
- **Purpose**: Svelte development server with hot reload
- **Volume**: Mounts the entire project directory for live code changes

### 🔧 PHP Container (`php-api`)
- **Image**: `php:8.2-apache`
- **Port**: 8000
- **Purpose**: Serves the PHP API endpoints for Bluesky integration
- **Volume**: Mounts the `./api` directory

## 🔧 Configuration

### Vite Configuration
The Svelte app is configured to:
- Run on `0.0.0.0:5173` (accessible from outside container)
- Proxy `/api/*` requests to the PHP container
- Enable hot module replacement for development

### Network
Both containers are connected via a custom bridge network (`bluesky-network`) for internal communication.

## 📋 Available Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Node.js only
docker-compose logs -f node-app

# PHP API only
docker-compose logs -f php-api
```

### Check Status
```bash
docker-compose ps
```

### Rebuild Containers
```bash
docker-compose up -d --build
```

## 🔍 Troubleshooting

### Port Conflicts
If ports 5173 or 8000 are already in use:
1. Stop the conflicting service
2. Or modify the ports in `docker-compose.yml`

### Container Won't Start
```bash
# Check logs
docker-compose logs

# Rebuild containers
docker-compose up -d --build

# Remove all containers and volumes
docker-compose down -v
docker-compose up -d
```

### Node Modules Issues
If you encounter node_modules problems:
```bash
# Remove node_modules volume and restart
docker-compose down
docker volume rm bluesky-search-for-belgians_app-data
docker-compose up -d
```

### PHP API Not Responding
Check if the PHP container is healthy:
```bash
docker-compose ps
```

If unhealthy, check PHP logs:
```bash
docker-compose logs php-api
```

## 🛠️ Development Workflow

### Code Changes
- **Svelte Components**: Changes are automatically reflected via hot reload
- **PHP API**: Changes require container restart or Apache reload
- **Configuration**: Some changes may require container rebuild

### Adding Dependencies
```bash
# For Node.js dependencies
docker-compose exec node-app npm install <package-name>

# For PHP dependencies (if using Composer)
docker-compose exec php-api composer require <package-name>
```

### Database (if needed in future)
The current setup doesn't include a database, but you can add one by:
1. Adding a database service to `docker-compose.yml`
2. Configuring the PHP API to connect to it
3. Adding database credentials to environment variables

## 🔒 Security Notes

- The PHP API runs on Apache with default security settings
- The Node.js container runs in development mode
- For production, consider:
  - Using production builds
  - Adding SSL/TLS
  - Implementing proper authentication
  - Using environment variables for sensitive data

## 📝 Environment Variables

You can add environment variables to the services in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=development
  - PHP_MEMORY_LIMIT=256M
  - APACHE_DOCUMENT_ROOT=/var/www/html
```

## 🎯 Next Steps

1. **Test the Application**: Visit http://localhost:5173
2. **Sign in with Bluesky**: Use your Bluesky credentials
3. **Select a List**: Choose a list to manage
4. **Search Profiles**: Use the search functionality
5. **Add to List**: Add profiles to your selected list

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify container status: `docker-compose ps`
3. Check network connectivity: `docker network ls`
4. Restart services: `docker-compose restart`

---

**Happy coding! 🦋✨**