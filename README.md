# StackIt - Q&A Platform Backend

A comprehensive backend API for StackIt, a community-driven question-and-answer platform built with Node.js, Express, and MongoDB.

## 🚀 Features

### Core Features
- **User Authentication & Authorization** - JWT-based authentication with role-based access control
- **Question Management** - Create, read, update, delete questions with rich text support
- **Answer System** - Post answers, vote, and accept best answers
- **Voting System** - Upvote/downvote questions and answers
- **Comment System** - Add comments to answers
- **Tag Management** - Organize content with tags and search functionality
- **Notification System** - Real-time notifications via Socket.IO
- **User Profiles** - Reputation system, badges, and user statistics
- **Search & Filtering** - Advanced search with pagination and filtering
- **Image Upload** - Cloudinary integration for image management

### Advanced Features
- **Real-time Updates** - Socket.IO for live notifications and updates
- **Rate Limiting** - Protect against abuse with configurable rate limits
- **Email Notifications** - Nodemailer integration for email alerts
- **File Upload** - Secure image upload with validation
- **Admin Panel** - User management, content moderation, and statistics
- **API Documentation** - Comprehensive REST API with validation

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **File Upload**: Multer + Cloudinary
- **Email**: Nodemailer
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest + Supertest

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn
- Cloudinary account (for image uploads)
- Email service (Gmail, SendGrid, etc.)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stackit-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/stackit
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "john_doe",
  "password": "SecurePass123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Questions Endpoints

#### Create Question
```http
POST /api/questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "How to implement authentication in Node.js?",
  "description": "I'm building a web application and need to implement user authentication...",
  "tags": ["nodejs", "authentication", "jwt"]
}
```

#### Get All Questions
```http
GET /api/questions?page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

#### Get Question by ID
```http
GET /api/questions/:id
```

#### Update Question
```http
PUT /api/questions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated question title",
  "description": "Updated description",
  "tags": ["updated", "tags"]
}
```

#### Vote on Question
```http
POST /api/questions/:id/vote
Authorization: Bearer <token>
Content-Type: application/json

{
  "voteType": "upvote"
}
```

### Answers Endpoints

#### Create Answer
```http
POST /api/answers
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Here's how you can implement authentication...",
  "questionId": "question_id_here"
}
```

#### Get Answers
```http
GET /api/answers?questionId=question_id&page=1&limit=10
```

#### Vote on Answer
```http
POST /api/answers/:id/vote
Authorization: Bearer <token>
Content-Type: application/json

{
  "voteType": "upvote"
}
```

#### Accept Answer
```http
POST /api/answers/:id/accept
Authorization: Bearer <token>
```

### User Endpoints

#### Get User Profile
```http
GET /api/users/:id
```

#### Update User Profile
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Updated bio",
  "avatar": "image_url"
}
```

#### Get User Questions
```http
GET /api/users/:id/questions
```

#### Get User Answers
```http
GET /api/users/:id/answers
```

### Notification Endpoints

#### Get Notifications
```http
GET /api/notifications
Authorization: Bearer <token>
```

#### Mark Notification as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Mark All Notifications as Read
```http
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

### Tag Endpoints

#### Get All Tags
```http
GET /api/tags
```

#### Search Tags
```http
GET /api/tags/search?q=javascript
```

#### Create Tag (Admin Only)
```http
POST /api/tags
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "new-tag",
  "description": "Description for the new tag"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/stackit` |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Required |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Required |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Required |
| `EMAIL_HOST` | SMTP host | Required |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP username | Required |
| `EMAIL_PASS` | SMTP password | Required |

### Rate Limiting

Configure rate limiting in your `.env` file:

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per window
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## 🚀 Deployment

### Local Development

```bash
npm run dev
```

### Production Deployment

1. Set environment variables:
   ```bash
   export NODE_ENV=production
   export PORT=5000
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js
   ```

## 📁 Project Structure

```
stackit-backend/
├── models/                 # Database models
│   ├── User.js
│   ├── Question.js
│   ├── Answer.js
│   ├── Notification.js
│   └── Tag.js
├── routes/                 # API routes
│   ├── auth.js
│   ├── questions.js
│   ├── answers.js
│   ├── users.js
│   ├── notifications.js
│   └── tags.js
├── middleware/             # Custom middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── validation.js
├── utils/                  # Utility functions
│   ├── emailService.js
│   └── uploadService.js
├── test/                   # Test files
│   └── basic.test.js
├── server.js              # Main server file
├── package.json           # Dependencies
├── env.example           # Environment variables template
└── README.md             # This file
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt
- **Rate Limiting** - Protect against abuse
- **Input Validation** - Comprehensive request validation
- **CORS Protection** - Configured for security
- **Helmet** - Security headers
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - Input sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section
2. Review the console for error messages
3. Verify all prerequisites are installed
4. Ensure environment variables are properly configured

## 📞 Contact

- **Project Link**: [https://github.com/your-username/stackit-backend](https://github.com/your-username/stackit-backend)
- **Issues**: [https://github.com/your-username/stackit-backend/issues](https://github.com/your-username/stackit-backend/issues)

---

**Built with ❤️ by the StackIt Team**
