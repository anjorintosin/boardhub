# Seed Scripts

This directory contains scripts to populate your BoardHub database with initial data.

## Available Scripts

### 1. Create Super Admin Only
```bash
npm run seed:admin
```

Creates a single super admin user:
- **Email**: admin@boardhub.com
- **Password**: Admin@123456
- **Role**: admin

### 2. Create Complete Sample Data
```bash
npm run seed:data
```

Creates multiple users and sample boards:
- 1 Super Admin user
- 3 Regular users (John, Jane, Bob)
- 3 Sample boards (Project Alpha, Marketing Campaign, Bug Tracker)

## User Credentials

### Admin User
- **Email**: admin@boardhub.com
- **Password**: Admin@123456
- **Role**: admin

### Regular Users
- **John Doe**: john@example.com / Password123!
- **Jane Smith**: jane@example.com / Password123!
- **Bob Wilson**: bob@example.com / Password123!

## Safety Features

- Scripts check for existing users/boards before creating
- Won't overwrite existing data
- Safe to run multiple times
- Proper error handling and logging

## Usage

1. **Make sure your .env file is configured** with MongoDB connection
2. **Run the desired script**:
   ```bash
   # For admin only
   npm run seed:admin
   
   # For complete sample data
   npm run seed:data
   ```
3. **Check the console output** for created data and credentials
4. **Login to the application** using the provided credentials

## Customization

You can modify the scripts to:
- Change default passwords
- Add more sample users
- Create different types of boards
- Add sample lists and cards

**⚠️ Important**: Change the default passwords after first login for security! 