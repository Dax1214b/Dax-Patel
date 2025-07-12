-- StackIt Database Setup
-- MySQL Database Schema for Q&A Platform

-- Create database
CREATE DATABASE IF NOT EXISTS stackit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stackit;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('guest', 'user', 'admin') DEFAULT 'user',
    bio TEXT,
    avatar VARCHAR(255),
    reputation INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Tags table
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL,
    description TEXT,
    usage_count INT DEFAULT 0,
    questions_count INT DEFAULT 0,
    synonyms JSON,
    related_tags JSON,
    is_moderated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_usage_count (usage_count)
);

-- Questions table
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    author_id INT NOT NULL,
    status ENUM('open', 'closed', 'duplicate', 'off_topic') DEFAULT 'open',
    views INT DEFAULT 0,
    votes INT DEFAULT 0,
    accepted_answer_id INT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_author_id (author_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_votes (votes),
    INDEX idx_views (views)
);

-- Question tags relationship table
CREATE TABLE question_tags (
    question_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (question_id, tag_id),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Answers table
CREATE TABLE answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    question_id INT NOT NULL,
    author_id INT NOT NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    votes INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_question_id (question_id),
    INDEX idx_author_id (author_id),
    INDEX idx_is_accepted (is_accepted),
    INDEX idx_votes (votes)
);

-- Comments table
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    answer_id INT NOT NULL,
    author_id INT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_answer_id (answer_id),
    INDEX idx_author_id (author_id)
);

-- Votes table
CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target_type ENUM('question', 'answer') NOT NULL,
    target_id INT NOT NULL,
    vote_type ENUM('upvote', 'downvote') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (user_id, target_type, target_id),
    INDEX idx_target (target_type, target_id),
    INDEX idx_user_id (user_id)
);

-- Notifications table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    sender_id INT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_recipient_id (recipient_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- User sessions table
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    remember_token VARCHAR(255) NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_remember_token (remember_token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Login attempts table
CREATE TABLE login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at)
);

-- Insert sample data
INSERT INTO users (username, email, password, role, bio) VALUES
('admin', 'admin@stackit.com', 'admin123', 'admin', 'StackIt Administrator'),
('john_doe', 'john@example.com', 'john123', 'user', 'Software Developer'),
('jane_smith', 'jane@example.com', 'jane123', 'user', 'Web Designer');

INSERT INTO tags (name, description) VALUES
('javascript', 'JavaScript programming language'),
('nodejs', 'Node.js runtime environment'),
('react', 'React.js library'),
('sql', 'Structured Query Language'),
('mongodb', 'MongoDB database'),
('express', 'Express.js framework');

-- Create stored procedures
DELIMITER //

-- Procedure to update question stats
CREATE PROCEDURE UpdateQuestionStats(IN question_id INT)
BEGIN
    UPDATE questions q
    SET 
        views = (SELECT COUNT(*) FROM question_views WHERE question_id = q.id),
        votes = (SELECT COALESCE(SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END), 0) 
                FROM votes WHERE target_type = 'question' AND target_id = q.id)
    WHERE q.id = question_id;
END //

-- Procedure to update answer stats
CREATE PROCEDURE UpdateAnswerStats(IN answer_id INT)
BEGIN
    UPDATE answers a
    SET 
        votes = (SELECT COALESCE(SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END), 0) 
                FROM votes WHERE target_type = 'answer' AND target_id = a.id)
    WHERE a.id = answer_id;
END //

-- Procedure to update user reputation
CREATE PROCEDURE UpdateUserReputation(IN user_id INT)
BEGIN
    UPDATE users u
    SET reputation = (
        SELECT COALESCE(SUM(
            CASE 
                WHEN v.vote_type = 'upvote' THEN 10
                WHEN v.vote_type = 'downvote' THEN -2
                ELSE 0
            END
        ), 0)
        FROM votes v
        WHERE v.user_id = u.id
    )
    WHERE u.id = user_id;
END //

DELIMITER ;

-- Create views
CREATE VIEW question_stats AS
SELECT 
    q.id,
    q.title,
    q.views,
    q.votes,
    COUNT(a.id) as answer_count,
    u.username as author,
    GROUP_CONCAT(t.name) as tags
FROM questions q
LEFT JOIN users u ON q.author_id = u.id
LEFT JOIN answers a ON q.id = a.question_id AND a.is_deleted = FALSE
LEFT JOIN question_tags qt ON q.id = qt.question_id
LEFT JOIN tags t ON qt.tag_id = t.id
WHERE q.is_deleted = FALSE
GROUP BY q.id;

CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.reputation,
    COUNT(DISTINCT q.id) as questions_asked,
    COUNT(DISTINCT a.id) as answers_given,
    COUNT(DISTINCT v.id) as votes_received
FROM users u
LEFT JOIN questions q ON u.id = q.author_id AND q.is_deleted = FALSE
LEFT JOIN answers a ON u.id = a.author_id AND a.is_deleted = FALSE
LEFT JOIN votes v ON (v.target_type = 'question' AND v.target_id = q.id) 
                  OR (v.target_type = 'answer' AND v.target_id = a.id)
GROUP BY u.id;

-- Create indexes for better performance
CREATE INDEX idx_questions_created_at ON questions(created_at);
CREATE INDEX idx_answers_created_at ON answers(created_at);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read);

-- Create events for cleanup
CREATE EVENT IF NOT EXISTS cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
    DELETE FROM user_sessions WHERE expires_at < NOW();

CREATE EVENT IF NOT EXISTS cleanup_old_login_attempts
ON SCHEDULE EVERY 1 DAY
DO
    DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Enable events
SET GLOBAL event_scheduler = ON;

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON stackit.* TO 'stackit_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Show tables
SHOW TABLES; 