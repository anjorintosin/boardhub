const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('Connection string:', process.env.MONGODB_URI || 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('Please create a .env file with: MONGODB_URI=mongodb://localhost:27017/boardhub');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connected successfully!');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);
    
    // Test creating a simple document
    const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));
    await TestModel.create({ name: 'test' });
    console.log('✅ Database write test successful');
    
    // Clean up
    await TestModel.deleteOne({ name: 'test' });
    console.log('✅ Database cleanup successful');

    await mongoose.connection.close();
    console.log('✅ Connection closed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB server is not running. Please start MongoDB first:');
      console.log('   macOS: brew services start mongodb-community');
      console.log('   Windows: Start MongoDB service');
      console.log('   Linux: sudo systemctl start mongodb');
      console.log('   Docker: docker run -d --name mongodb -p 27017:27017 mongo:latest');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Authentication failed. Check your username and password in the connection string.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Host not found. Check your connection string.');
    }
    
    process.exit(1);
  }
}

testConnection(); 