# 🚀 Ad Astra Login System

A modern, secure login system built with JavaScript, Node.js, and MySQL. Features a beautiful space-themed UI with full authentication capabilities.

## ✨ Features

- **🔐 Secure Authentication** - Password hashing, session management, and brute force protection
- **🎨 Beautiful UI** - Space-themed design with animations and modern styling
- **📱 Responsive Design** - Works perfectly on all devices
- **🍪 Remember Me** - Persistent login functionality
- **🛡️ Security Features** - Session validation, IP tracking, and login attempt logging
- **⚡ Real-time Validation** - Instant form validation and error feedback

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: bcrypt, session tokens
- **Styling**: Custom CSS with animations

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [MySQL](https://dev.mysql.com/downloads/) (v8.0 or higher)
- [phpMyAdmin](https://www.phpmyadmin.net/) (optional, for database management)

## 🚀 Quick Start

### 1. Clone or Download the Project
```bash
# If using git
git clone <your-repo-url>
cd login-system

# Or simply download and extract the files
```

### 2. Set Up the Database

1. **Open phpMyAdmin** in your browser
2. **Go to the SQL tab**
3. **Copy and paste** the entire content of `database_setup.sql`
4. **Click Execute**

This will create:
- ✅ Database: `login_system`
- ✅ Tables: `users`, `user_sessions`, `login_attempts`
- ✅ Sample users with hashed passwords
- ✅ Stored procedures and views
- ✅ Automated cleanup events

### 3. Configure Database Connection

Edit `server.js` and update the database configuration:

```javascript
const dbConfig = {
    host: 'localhost',
    user: 'root',        // Your MySQL username
    password: '',        // Your MySQL password
    database: 'login_system',
    charset: 'utf8mb4'
};
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

### 6. Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## 👥 Sample Users

The database comes with pre-configured users for testing:

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `password123` | Administrator |
| `user@example.com` | `password123` | Regular User |
| `john@example.com` | `password123` | Regular User |
| `jane@example.com` | `password123` | Regular User |

## 📁 Project Structure

```
login-system/
├── login.html          # Login page
├── dashboard.html      # Dashboard page
├── login.js           # Frontend authentication logic
├── server.js          # Node.js backend server
├── styles1.css        # Space-themed styling
├── package.json       # Node.js dependencies
├── database_setup.sql # Database setup script
└── README.md         # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/check-session` - Validate session

### Registration
- `POST /api/register` - User registration

## 🎨 Customization

### Styling
Edit `styles1.css` to customize the appearance:
- Colors and gradients
- Animations and effects
- Responsive breakpoints
- Typography

### Database
Modify `database_setup.sql` to:
- Add new user fields
- Create additional tables
- Set up custom stored procedures

### Backend
Update `server.js` to:
- Add new API endpoints
- Implement additional security features
- Integrate with external services

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt
- **Session Management**: Secure token-based sessions
- **Brute Force Protection**: Login attempt logging
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CSRF Protection**: SameSite cookies

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
1. Set environment variables:
   ```bash
   export NODE_ENV=production
   export PORT=3000
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

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check database credentials in `server.js`
- Ensure database `login_system` exists

### Port Already in Use
- Change the port in `server.js`:
  ```javascript
  const PORT = process.env.PORT || 3001;
  ```

### Module Not Found Errors
- Run `npm install` to install dependencies
- Check `package.json` for missing dependencies

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Review the console for error messages
3. Verify all prerequisites are installed
4. Ensure database is properly configured

---

**Enjoy your journey through the stars! 🌟**
