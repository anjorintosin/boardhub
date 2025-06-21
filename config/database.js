const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    // Simplified connection options for better compatibility
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    
    // Provide helpful error message for common issues
    if (error.message.includes('ECONNREFUSED')) {
      logger.error('MongoDB server is not running. Please start MongoDB first.');
      logger.error('For local development, you can start MongoDB with: brew services start mongodb-community');
    } else if (error.message.includes('Authentication failed')) {
      logger.error('MongoDB authentication failed. Please check your username and password.');
    } else if (error.message.includes('ENOTFOUND')) {
      logger.error('MongoDB host not found. Please check your connection string.');
    }
    
    process.exit(1);
  }
};

module.exports = { connectDB }; 