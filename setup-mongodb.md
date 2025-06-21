# MongoDB Setup Guide

## Quick Fix for Connection Error

The error you're seeing indicates that MongoDB is not running or not accessible. Here's how to fix it:

### Option 1: Use MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Update your `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/boardhub
```

### Option 2: Install MongoDB Locally

#### On macOS (using Homebrew):
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify it's running
brew services list | grep mongodb
```

#### On Windows:
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install and start the MongoDB service
3. Or use MongoDB Compass (GUI tool)

#### On Linux (Ubuntu/Debian):
```bash
# Install MongoDB
sudo apt update
sudo apt install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Check status
sudo systemctl status mongodb
```

### Option 3: Use Docker

```bash
# Pull and run MongoDB container
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Your connection string will be:
MONGODB_URI=mongodb://localhost:27017/boardhub
```

### Verify Connection

After setting up MongoDB, test your connection:

```bash
# Start your server
npm run dev
```

You should see: `MongoDB Connected: localhost` or your Atlas cluster name.

### Troubleshooting

1. **Port 27017 in use**: Change MongoDB port or stop other services
2. **Permission denied**: Run with sudo (Linux) or as Administrator (Windows)
3. **Connection timeout**: Check firewall settings
4. **Authentication failed**: Verify username/password in connection string

### Default Local Connection String

For local MongoDB, use this in your `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/boardhub
``` 