#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 BoardHub Render Deployment Helper\n');

// Check if render.yaml exists
const renderYamlPath = path.join(__dirname, '..', 'render.yaml');
if (!fs.existsSync(renderYamlPath)) {
  console.error('❌ render.yaml not found! Please create it first.');
  process.exit(1);
}

console.log('✅ render.yaml found');

// Check if package.json exists
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found!');
  process.exit(1);
}

console.log('✅ package.json found');

// Check if .env.example exists
const envExamplePath = path.join(__dirname, '..', 'env.example');
if (!fs.existsSync(envExamplePath)) {
  console.error('❌ env.example not found!');
  process.exit(1);
}

console.log('✅ env.example found');

// Generate JWT secret
const jwtSecret = crypto.randomBytes(32).toString('base64');

console.log('\n🔧 Environment Variables for Render:\n');

console.log('Required Variables:');
console.log('==================');
console.log(`NODE_ENV=production`);
console.log(`PORT=10000`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`MONGODB_URI=your-mongodb-connection-string`);

console.log('\nOptional Variables:');
console.log('==================');
console.log(`JWT_EXPIRES_IN=7d`);
console.log(`JWT_COOKIE_EXPIRES_IN=7`);
console.log(`SESSION_COOKIE_HTTPONLY=true`);
console.log(`SESSION_COOKIE_SECURE=true`);
console.log(`CORS_ORIGIN=https://your-frontend-domain.com`);
console.log(`CORS_CREDENTIALS=true`);
console.log(`RATE_LIMIT_WINDOW_MS=900000`);
console.log(`RATE_LIMIT_MAX_REQUESTS=100`);
console.log(`BCRYPT_ROUNDS=12`);

console.log('\n📋 Deployment Steps:');
console.log('==================');
console.log('1. Push your code to GitHub/GitLab/Bitbucket');
console.log('2. Go to https://dashboard.render.com');
console.log('3. Click "New" → "Blueprint"');
console.log('4. Connect your repository');
console.log('5. Render will detect render.yaml automatically');
console.log('6. Click "Apply" to deploy');
console.log('7. Set environment variables in Render Dashboard');
console.log('8. Test your API at: https://your-app-name.onrender.com/health');

console.log('\n🔗 Useful Links:');
console.log('================');
console.log('• Render Dashboard: https://dashboard.render.com');
console.log('• Free Tier Docs: https://render.com/docs/free');
console.log('• Deployment Guide: https://render.com/docs/deploy-an-app');

console.log('\n⚠️  Important Notes:');
console.log('==================');
console.log('• Free tier has 750 hours/month limit');
console.log('• Service spins down after 15 minutes of inactivity');
console.log('• Takes up to 1 minute to spin back up');
console.log('• Update CORS_ORIGIN to match your frontend domain');

console.log('\n🎉 Ready to deploy!'); 