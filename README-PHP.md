# StackIt - PHP Backend

A Q&A platform built with **PHP** and **MySQL** (no Node.js required).

## 🚀 Quick Start

### Prerequisites
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache/Nginx (or PHP built-in server)

### Setup

1. **Database Setup**
   ```sql
   -- Run the database_setup.sql file in your MySQL server
   mysql -u root -p < database_setup.sql
   ```

2. **Configure Database**
   - Edit `config/database.php` with your MySQL credentials
   - Update host, username, password, and database name

3. **Create Test Users**
   ```bash
   php setup-test-users.php
   ```

4. **Start PHP Server**
   ```bash
   # Option 1: Using PHP built-in server
   php -S localhost:8000
   
   # Option 2: Using the startup script
   php start-php-server.php
   
   # Option 3: Using Apache/Nginx
   # Place files in your web server directory
   ```

5. **Access the Application**
   - Open: http://localhost:8000
   - Login with test credentials below

## 🔑 Test Login Credentials

- **Admin**: `admin@stackit.com` / `admin123`
- **User 1**: `john@example.com` / `user123`
- **User 2**: `jane@example.com` / `test123`

## 📁 Project Structure

```
StackIt/
├── api/                    # PHP API endpoints
│   ├── auth.php           # Authentication API
│   └── health.php         # Health check endpoint
├── config/                # Configuration files
│   └── database.php       # Database connection
├── includes/              # Shared functions
│   └── functions.php      # JWT, validation, utilities
├── models/                # Data models
│   └── User.php           # User model
├── *.html                 # Frontend pages
├── *.js                   # Frontend JavaScript
├── *.css                  # Frontend styles
├── .htaccess              # URL rewriting rules
└── setup-test-users.php   # Test user creation script
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Health Check
- `GET /api/health` - API health status

## 🛠️ Features

- ✅ **PHP Backend** (no Node.js required)
- ✅ **MySQL Database** with proper schema
- ✅ **JWT Authentication** with secure tokens
- ✅ **Password Hashing** using PHP's built-in functions
- ✅ **CORS Support** for cross-origin requests
- ✅ **Input Validation** and sanitization
- ✅ **Error Handling** with proper HTTP status codes
- ✅ **URL Rewriting** with .htaccess
- ✅ **Security Headers** for protection

## 🔒 Security Features

- Password hashing with `password_hash()`
- JWT token authentication
- Input sanitization
- SQL injection prevention with prepared statements
- CORS configuration
- Security headers

## 🚀 Deployment

### Apache/Nginx
1. Upload files to your web server
2. Ensure mod_rewrite is enabled (Apache)
3. Configure virtual host to point to project directory
4. Set proper file permissions

### Shared Hosting
1. Upload all files to your hosting directory
2. Update database credentials in `config/database.php`
3. Ensure PHP version is 7.4+

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL credentials in `config/database.php`
   - Ensure MySQL server is running
   - Verify database 'stackit' exists

2. **404 Errors**
   - Ensure mod_rewrite is enabled (Apache)
   - Check .htaccess file is present
   - Verify file permissions

3. **CORS Errors**
   - Check CORS headers in .htaccess
   - Verify API endpoints are accessible

4. **Login Issues**
   - Run `php setup-test-users.php` to create test users
   - Check database connection
   - Verify password hashing is working

## 📝 License

MIT License - feel free to use and modify as needed. 