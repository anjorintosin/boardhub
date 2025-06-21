# Deploy BoardHub Backend to Render

This guide will help you deploy your BoardHub backend to Render's free tier.

## 🚀 Quick Deploy (Recommended)

### Option 1: Using Render Blueprint (Easiest)

1. **Fork/Clone your repository** to GitHub, GitLab, or Bitbucket
2. **Go to [Render Dashboard](https://dashboard.render.com)**
3. **Click "New" → "Blueprint"**
4. **Connect your Git repository**
5. **Select the repository** containing your BoardHub backend
6. **Render will automatically detect the `render.yaml` file**
7. **Click "Apply"** to deploy

### Option 2: Manual Deploy

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New" → "Web Service"**
3. **Connect your Git repository**
4. **Configure the service:**
   - **Name**: `boardhub-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

## ⚙️ Environment Variables

Set these environment variables in Render Dashboard:

### Required Variables
```env
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-here
MONGODB_URI=your-mongodb-connection-string
```

### Optional Variables
```env
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SECURE=true
CORS_ORIGIN=https://your-frontend-domain.com
CORS_CREDENTIALS=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

## 🗄️ Database Setup

### Option 1: Use Render Postgres (Free Tier)

1. **Create a new Postgres database** in Render Dashboard
2. **Choose "Free" plan**
3. **Copy the connection string** from the database settings
4. **Set `MONGODB_URI`** to the Postgres connection string

**⚠️ Important**: Free Postgres databases expire after 30 days and have a 1GB limit.

### Option 2: Use MongoDB Atlas (Recommended)

1. **Create a free MongoDB Atlas cluster**
2. **Get your connection string**
3. **Set `MONGODB_URI`** in Render environment variables

## 🔧 Configuration Steps

### 1. Update CORS Settings
Update `CORS_ORIGIN` in environment variables to match your frontend domain:
```env
CORS_ORIGIN=https://your-frontend-app.com
```

### 2. Generate JWT Secret
Use a strong, random string for `JWT_SECRET`:
```bash
# Generate a random string
openssl rand -base64 32
```

### 3. Set Production Environment
Make sure `NODE_ENV=production` is set.

## 📊 Free Tier Limitations

According to [Render's free tier documentation](https://render.com/docs/free):

### Web Services
- **750 free instance hours** per month
- **Spins down after 15 minutes** of inactivity
- **Takes up to 1 minute** to spin back up
- **Limited to single instance** (no scaling)

### Postgres Database
- **1 GB storage limit**
- **Expires after 30 days**
- **No backups**
- **Single instance only**

## 🚀 Post-Deployment

### 1. Test Your API
```bash
# Health check
curl https://your-app-name.onrender.com/health

# API documentation
https://your-app-name.onrender.com/api-docs
```

### 2. Create Admin User
```bash
# Run the seed script locally with production database
npm run seed:admin
```

### 3. Update Frontend Configuration
Update your frontend to use the new API URL:
```javascript
const API_BASE_URL = 'https://your-app-name.onrender.com/api';
```

## 🔍 Monitoring

### View Logs
- Go to your service in Render Dashboard
- Click on "Logs" tab
- Monitor for any errors

### Health Checks
- Render automatically checks `/health` endpoint
- Service will be marked unhealthy if health check fails

## 🛠️ Troubleshooting

### Common Issues

1. **Build Fails**
   - Check build logs in Render Dashboard
   - Ensure all dependencies are in `package.json`

2. **Database Connection Fails**
   - Verify `MONGODB_URI` is correct
   - Check if database is accessible from Render

3. **Service Won't Start**
   - Check start command (`npm start`)
   - Verify `PORT` environment variable

4. **CORS Errors**
   - Update `CORS_ORIGIN` to match your frontend domain
   - Check browser console for specific errors

### Getting Help
- Check Render's [deployment documentation](https://render.com/docs/deploy-an-app)
- View service logs in Render Dashboard
- Check the [free tier limitations](https://render.com/docs/free)

## 🔄 Updating Your App

1. **Push changes** to your Git repository
2. **Render automatically deploys** the new version
3. **Monitor the deployment** in Render Dashboard

## 💰 Cost Management

- **Free tier includes 750 hours** per month
- **Monitor usage** in Render Dashboard
- **Upgrade to paid plan** if needed for production

---

**🎉 Congratulations!** Your BoardHub backend is now deployed on Render's free tier! 

# If you haven't initialized git yet
git init
git add .
git commit -m "Initial commit - BoardHub backend ready for deployment"

# Create a repository on GitHub/GitLab/Bitbucket, then:
git remote add origin https://github.com/yourusername/boardhub-backend.git
git push -u origin main 