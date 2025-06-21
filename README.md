# BoardHub Backend

A comprehensive RESTful API backend for BoardHub - A Trello-style project management tool built with Express.js, Node.js, and MongoDB.

## Features

- 🔐 **JWT Authentication** with role-based access control
- 📋 **Board Management** with member permissions
- 📝 **List & Card Management** with drag-and-drop ordering
- 👥 **User Management** with admin controls
- 🔍 **Search & Filtering** capabilities
- 📊 **Activity Tracking** and statistics
- 🛡️ **Security Features** including rate limiting, CORS, and input validation
- 📚 **Comprehensive API Documentation** with Swagger/OpenAPI
- 🚀 **Production Ready** with error handling and logging

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd boardhub-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   - Configure MongoDB connection in `.env`
   - See `setup-mongodb.md` for detailed instructions

5. **Create initial data (optional)**
   ```bash
   # Create super admin only
   npm run seed:admin
   
   # Or create complete sample data
   npm run seed:data
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Seed Data

The application includes seed scripts to create initial data:

### Quick Admin Setup
```bash
npm run seed:admin
```
Creates a super admin user:
- **Email**: admin@boardhub.com
- **Password**: Admin@123456

### Complete Sample Data
```bash
npm run seed:data
```
Creates multiple users and sample boards for testing.

See `scripts/README.md` for detailed information.

## API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:5000/api-docs`
- **API Base URL**: `http://localhost:5000/api`

## Authentication

The API uses JWT authentication. Include the token in requests:
```bash
Authorization: Bearer <your-jwt-token>
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed:admin` - Create super admin user
- `npm run seed:data` - Create complete sample data
- `npm run deploy:render` - Get deployment instructions for Render
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## 🚀 Deployment

### Deploy to Render (Free Tier)

Your BoardHub backend is ready to deploy to Render's free tier!

#### Quick Deploy
```bash
# Get deployment instructions and environment variables
npm run deploy:render
```

#### Manual Deploy
1. **Push your code** to GitHub/GitLab/Bitbucket
2. **Go to [Render Dashboard](https://dashboard.render.com)**
3. **Click "New" → "Blueprint"**
4. **Connect your repository**
5. **Render will detect `render.yaml` automatically**
6. **Click "Apply" to deploy**

#### Environment Variables
Set these in Render Dashboard:
```env
NODE_ENV=production
PORT=10000
JWT_SECRET=your-generated-jwt-secret
MONGODB_URI=your-mongodb-connection-string
```

See `DEPLOYMENT.md` for detailed instructions.

## Database Schema

### User
- `name` (String, required)
- `email` (String, required, unique)
- `password` (String, required, hashed)
- `avatar` (String, optional)
- `role` (String: 'user' | 'admin', default: 'user')
- `isActive` (Boolean, default: true)
- `preferences` (Object)
- `lastLogin` (Date)
- `createdAt` (Date)

### Board
- `title` (String, required)
- `description` (String, optional)
- `owner` (ObjectId, ref: 'User')
- `background` (Object: {type, value})
- `isPublic` (Boolean, default: false)
- `isArchived` (Boolean, default: false)
- `tags` ([String])
- `lastActivity` (Date)
- `createdAt` (Date)

### BoardMember
- `board` (ObjectId, ref: 'Board')
- `user` (ObjectId, ref: 'User')
- `role` (String: 'owner' | 'admin' | 'editor' | 'viewer')
- `permissions` (Object with granular permissions)
- `invitedAt` (Date)
- `joinedAt` (Date)

### List
- `title` (String, required)
- `board` (ObjectId, ref: 'Board')
- `order` (Number, required)
- `description` (String, optional)
- `color` (String, optional)
- `isArchived` (Boolean, default: false)
- `createdBy` (ObjectId, ref: 'User')
- `createdAt` (Date)

### Card
- `title` (String, required)
- `description` (String, optional)
- `list` (ObjectId, ref: 'List')
- `board` (ObjectId, ref: 'Board')
- `order` (Number, required)
- `color` (String, optional)
- `labels` ([Object: {name, color}])
- `assignees` ([ObjectId, ref: 'User'])
- `dueDate` (Date, optional)
- `isCompleted` (Boolean, default: false)
- `priority` (String: 'low' | 'medium' | 'high' | 'urgent')
- `comments` ([Object: {author, content, createdAt}])
- `votes` ([Object: {user, type, createdAt}])
- `checklists` ([Object: {title, items: [{text, isCompleted}]}])
- `isArchived` (Boolean, default: false)
- `createdBy` (ObjectId, ref: 'User')
- `createdAt` (Date)

## Security Features

- **JWT Authentication** with configurable expiration
- **Role-based Access Control** with granular permissions
- **Rate Limiting** to prevent abuse
- **CORS Protection** with configurable origins
- **Input Validation** using express-validator
- **Password Hashing** using bcryptjs
- **HTTP-Only Cookies** for secure token storage
- **Helmet.js** for security headers
- **Request Logging** for monitoring

## Development

### Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint errors
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/boardhub` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `30d` |
| `JWT_COOKIE_EXPIRES_IN` | Cookie expiration days | `7` |
| `SESSION_COOKIE_HTTPONLY` | HTTP-only cookie setting | `true` |
| `SESSION_COOKIE_SECURE` | Secure cookie setting | `false` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `CORS_CREDENTIALS` | Allow CORS credentials | `true` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### MongoDB Setup

1. **Local MongoDB**:
   ```bash
   # Install MongoDB locally
   brew install mongodb-community  # macOS
   
   # Start MongoDB service
   brew services start mongodb-community
   ```

2. **MongoDB Atlas** (Recommended for production):
   - Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a new cluster
   - Get connection string and add to `.env`

### Testing the Database Connection

```bash
node test-db.js
```

## Deployment

### Production Considerations

1. **Environment Variables**:
   - Set `NODE_ENV=production`
   - Use strong `JWT_SECRET`
   - Set `SESSION_COOKIE_SECURE=true` for HTTPS
   - Configure proper `CORS_ORIGIN`

2. **MongoDB**:
   - Use MongoDB Atlas or managed MongoDB service
   - Enable authentication and network access controls

3. **Security**:
   - Use HTTPS in production
   - Set up proper firewall rules
   - Monitor logs for suspicious activity

4. **Performance**:
   - Enable compression
   - Set up proper caching headers
   - Monitor database performance

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api-docs`
- Review the logs for debugging information

## Changelog

### v1.0.0
- Initial release
- Complete CRUD operations for boards, lists, and cards
- JWT authentication with role-based access control
- Comprehensive API documentation with Swagger
- Security features and input validation
- Production-ready configuration