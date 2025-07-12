-- Database setup for Login System
-- Run this script in phpMyAdmin to create the database structure

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS login_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE login_system;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_sessions table for session management
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    remember_token VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create login_attempts table for security
CREATE TABLE login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_ip (email, ip_address),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample users (passwords are hashed with password_hash())
-- Default password for all users: password123
INSERT INTO users (username, email, password, first_name, last_name, is_admin, email_verified) VALUES
('admin', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', TRUE, TRUE),
('user', 'user@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Regular', 'User', FALSE, TRUE),
('john_doe', 'john@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', FALSE, TRUE),
('jane_smith', 'jane@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', FALSE, TRUE);

-- Create stored procedures for common operations

-- Procedure to authenticate user
DELIMITER //
CREATE PROCEDURE AuthenticateUser(
    IN p_email VARCHAR(100),
    IN p_password VARCHAR(255)
)
BEGIN
    DECLARE user_id INT;
    DECLARE user_password VARCHAR(255);
    DECLARE user_is_admin BOOLEAN;
    DECLARE user_is_active BOOLEAN;
    
    SELECT id, password, is_admin, is_active 
    INTO user_id, user_password, user_is_admin, user_is_active
    FROM users 
    WHERE email = p_email;
    
    IF user_id IS NOT NULL AND user_is_active = TRUE THEN
        IF p_password = user_password THEN -- In production, use password_verify()
            -- Update last login
            UPDATE users SET last_login = NOW() WHERE id = user_id;
            
            -- Return user data
            SELECT 
                id, username, email, first_name, last_name, 
                is_admin, email_verified, created_at
            FROM users 
            WHERE id = user_id;
        ELSE
            SELECT NULL as id;
        END IF;
    ELSE
        SELECT NULL as id;
    END IF;
END //
DELIMITER ;

-- Procedure to create session
DELIMITER //
CREATE PROCEDURE CreateSession(
    IN p_user_id INT,
    IN p_session_token VARCHAR(255),
    IN p_remember_token VARCHAR(255),
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT,
    IN p_expires_at DATETIME
)
BEGIN
    INSERT INTO user_sessions (
        user_id, session_token, remember_token, 
        ip_address, user_agent, expires_at
    ) VALUES (
        p_user_id, p_session_token, p_remember_token,
        p_ip_address, p_user_agent, p_expires_at
    );
END //
DELIMITER ;

-- Procedure to validate session
DELIMITER //
CREATE PROCEDURE ValidateSession(
    IN p_session_token VARCHAR(255)
)
BEGIN
    SELECT 
        us.id as session_id,
        us.user_id,
        us.remember_token,
        us.expires_at,
        u.username,
        u.email,
        u.is_admin,
        u.is_active
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.session_token = p_session_token 
    AND us.is_active = TRUE 
    AND us.expires_at > NOW();
END //
DELIMITER ;

-- Procedure to log login attempt
DELIMITER //
CREATE PROCEDURE LogLoginAttempt(
    IN p_email VARCHAR(100),
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT,
    IN p_success BOOLEAN
)
BEGIN
    INSERT INTO login_attempts (email, ip_address, user_agent, success)
    VALUES (p_email, p_ip_address, p_user_agent, p_success);
END //
DELIMITER ;

-- Create views for easier data access

-- View for active sessions
CREATE VIEW active_sessions AS
SELECT 
    us.id as session_id,
    us.session_token,
    us.remember_token,
    us.created_at as session_created,
    us.expires_at,
    u.id as user_id,
    u.username,
    u.email,
    u.is_admin
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.is_active = TRUE AND us.expires_at > NOW();

-- View for recent login attempts
CREATE VIEW recent_login_attempts AS
SELECT 
    email,
    ip_address,
    success,
    created_at,
    CASE 
        WHEN success = TRUE THEN 'Success'
        ELSE 'Failed'
    END as status
FROM login_attempts
WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY created_at DESC;

-- Create triggers for data integrity

-- Trigger to update updated_at timestamp
DELIMITER //
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- Trigger to clean up expired sessions
DELIMITER //
CREATE EVENT cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    DELETE FROM login_attempts 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END //
DELIMITER ;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON login_system.* TO 'your_username'@'localhost';

-- Show table structure
DESCRIBE users;
DESCRIBE user_sessions;
DESCRIBE login_attempts;

-- Show sample data
SELECT id, username, email, is_admin, created_at FROM users; 