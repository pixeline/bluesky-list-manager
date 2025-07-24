#!/bin/bash

# Build the production version
echo "Building production version..."
npm run build

# Upload to server (replace with your actual server details)
echo "Uploading to server..."
# Example using rsync (uncomment and modify as needed):
# rsync -avz --delete dist/ user@your-server.com:/path/to/bluesky-list-manager/

# Example using scp (uncomment and modify as needed):
# scp -r dist/* user@your-server.com:/path/to/bluesky-list-manager/

echo "Deployment complete!"
echo "Your app should be available at: https://pixeline.be/bluesky-list-manager"