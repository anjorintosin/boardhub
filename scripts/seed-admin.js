const mongoose = require('mongoose');
const User = require('../models/User');
const { logger } = require('../utils/logger');
require('dotenv').config();

// Admin user data
const adminData = {
  name: 'Super Admin',
  email: 'admin@boardhub.com',
  password: 'Admin@123456',
  role: 'admin',
  isActive: true,
  emailVerified: true,
  preferences: {
    theme: 'system',
    notifications: {
      email: true,
      push: true
    }
  }
};

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        logger.info('Super admin already exists!');
        logger.info(`Email: ${existingAdmin.email}`);
        logger.info(`Role: ${existingAdmin.role}`);
        logger.info(`Created: ${existingAdmin.createdAt}`);
        return;
      } else {
        // Update existing user to admin
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        logger.info('Existing user promoted to super admin!');
        logger.info(`Email: ${existingAdmin.email}`);
        logger.info(`Role: ${existingAdmin.role}`);
        return;
      }
    }

    // Create new admin user
    const admin = new User(adminData);
    await admin.save();

    logger.info('✅ Super admin created successfully!');
    logger.info(`Name: ${admin.name}`);
    logger.info(`Email: ${admin.email}`);
    logger.info(`Role: ${admin.role}`);
    logger.info(`Password: ${adminData.password}`);
    logger.info('⚠️  Please change the password after first login!');

  } catch (error) {
    logger.error('Failed to create super admin:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  createSuperAdmin();
}

module.exports = { createSuperAdmin }; 