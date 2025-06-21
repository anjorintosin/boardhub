const mongoose = require('mongoose');
const User = require('../models/User');
const Board = require('../models/Board');
const { logger } = require('../utils/logger');
require('dotenv').config();

// Sample users data
const usersData = [
  {
    name: 'Super Admin',
    email: 'admin@boardhub.com',
    password: 'Admin@123456',
    role: 'admin',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Password123!',
    role: 'user',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'Password123!',
    role: 'user',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'Bob Wilson',
    email: 'bob@example.com',
    password: 'Password123!',
    role: 'user',
    isActive: true,
    emailVerified: true
  }
];

// Sample boards data
const boardsData = [
  {
    title: 'Project Alpha',
    description: 'Main project board for Alpha development',
    color: '#3B82F6',
    isPublic: false
  },
  {
    title: 'Marketing Campaign',
    description: 'Marketing team collaboration board',
    color: '#10B981',
    isPublic: true
  },
  {
    title: 'Bug Tracker',
    description: 'Track and manage software bugs',
    color: '#EF4444',
    isPublic: false
  }
];

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('Connected to MongoDB');

    // Clear existing data (optional - uncomment if you want to start fresh)
    // await User.deleteMany({});
    // await Board.deleteMany({});
    // logger.info('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of usersData) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        logger.info(`User ${userData.email} already exists`);
        createdUsers.push(existingUser);
      } else {
        const user = new User(userData);
        await user.save();
        createdUsers.push(user);
        logger.info(`✅ Created user: ${user.name} (${user.email})`);
      }
    }

    // Get admin user
    const adminUser = createdUsers.find(user => user.role === 'admin');
    
    if (!adminUser) {
      throw new Error('No admin user found!');
    }

    // Create boards
    const createdBoards = [];
    for (const boardData of boardsData) {
      const existingBoard = await Board.findOne({ 
        title: boardData.title, 
        owner: adminUser._id 
      });
      
      if (existingBoard) {
        logger.info(`Board "${boardData.title}" already exists`);
        createdBoards.push(existingBoard);
      } else {
        const board = new Board({
          ...boardData,
          owner: adminUser._id
        });
        await board.save();
        createdBoards.push(board);
        logger.info(`✅ Created board: ${board.title}`);
      }
    }

    logger.info('\n🎉 Seed data created successfully!');
    logger.info('\n📊 Summary:');
    logger.info(`Users created: ${createdUsers.length}`);
    logger.info(`Boards created: ${createdBoards.length}`);
    
    logger.info('\n🔐 Admin Login:');
    logger.info(`Email: ${adminUser.email}`);
    logger.info(`Password: ${usersData[0].password}`);
    
    logger.info('\n👥 Regular Users:');
    createdUsers.filter(user => user.role === 'user').forEach(user => {
      logger.info(`Email: ${user.email}, Password: ${usersData.find(u => u.email === user.email).password}`);
    });

  } catch (error) {
    logger.error('Failed to seed data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  seedData();
}

module.exports = { seedData }; 