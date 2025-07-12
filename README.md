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

#### Add Comment
```http
POST /api/answers/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great answer! Here's an additional tip..."
}
```

### Users Endpoints

#### Get User Profile
```http
GET /api/users/:id
```

#### Get User Questions
```http
GET /api/users/:id/questions?page=1&limit=10
```

#### Get User Answers
```http
GET /api/users/:id/answers?page=1&limit=10
```

#### Get Leaderboard
```http
GET /api/users/leaderboard?limit=10&period=all
```

### Tags Endpoints

#### Get Popular Tags
```http
GET /api/tags/popular?limit=10
```

#### Search Tags
```http
GET /api/tags/search?q=javascript&page=1&limit=20
```

#### Get Tag Details
```http
GET /api/tags/:name
```

### Notifications Endpoints

#### Get Notifications
```http
GET /api/notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer <token>
```

#### Mark Notification as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Get Unread Count
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## 👥 User Roles

- **Guest**: View questions and answers
- **User**: Register, login, post questions/answers, vote, comment
- **Admin**: All user permissions + content moderation, user management

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/stackit |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRE` | JWT expiration time | 7d |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Required |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Required |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Required |
| `EMAIL_HOST` | SMTP host | Required |
| `EMAIL_PORT` | SMTP port | 587 |
| `EMAIL_USER` | SMTP username | Required |
| `EMAIL_PASS` | SMTP password | Required |

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📦 Deployment

### Using Docker

1. **Build the image**
   ```bash
   docker build -t stackit-backend .
   ```

2. **Run the container**
   ```bash
   docker run -p 5000:5000 --env-file .env stackit-backend
   ```

### Using PM2

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Start the application**
   ```bash
   pm2 start server.js --name "stackit-backend"
   ```

3. **Monitor the application**
   ```bash
   pm2 monit
   ```

### Using Heroku

1. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   # ... set other environment variables
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for password security
- **Rate Limiting** - Prevent abuse with configurable limits
- **Input Validation** - Comprehensive request validation
- **CORS Protection** - Cross-origin resource sharing protection
- **Helmet Security** - Security headers middleware
- **SQL Injection Protection** - MongoDB with parameterized queries
- **XSS Protection** - Input sanitization and validation

## 📊 Database Schema

### User Model
- Username, email, password
- Role (guest, user, admin)
- Reputation, badges, bio
- Preferences and settings

### Question Model
- Title, description, tags
- Author, votes, views
- Answers, accepted answer
- Status and metadata

### Answer Model
- Content, author, question
- Votes, comments
- Accepted status
- Edit history

### Notification Model
- Recipient, sender, type
- Title, message, data
- Read status, timestamps

### Tag Model
- Name, description
- Usage count, questions count
- Synonyms, related tags
- Moderation status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Email: support@stackit.com
- Documentation: [API Docs](https://docs.stackit.com)

## 🔄 Changelog

### v1.0.0
- Initial release
- Complete Q&A functionality
- User authentication and authorization
- Real-time notifications
- Image upload support
- Comprehensive API documentation

## 🙏 Acknowledgments

- Express.js team for the amazing framework
- MongoDB team for the database
- Socket.IO team for real-time functionality
- All contributors and community members

---

**Built with ❤️ by the StackIt Team**
