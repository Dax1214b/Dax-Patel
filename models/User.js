const bcrypt = require('bcryptjs');

class User {
  constructor(db) {
    this.db = db;
  }

  // Create a new user
  async create(userData) {
    try {
      const { username, email, password, role = 'user', bio = '' } = userData;
      
      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const [result] = await this.db.execute(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, role]
      );
      
      return { id: result.insertId, username, email, role, bio };
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  async findById(id) {
    try {
      const [rows] = await this.db.execute(
        'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by username or email
  async findByUsernameOrEmail(identifier) {
    try {
      const [rows] = await this.db.execute(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [identifier, identifier]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by username
  async findByUsername(username) {
    try {
      const [rows] = await this.db.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  async findByEmail(email) {
    try {
      const [rows] = await this.db.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      
      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'password') {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });
      
      if (fields.length === 0) return null;
      
      values.push(id);
      const [result] = await this.db.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Update password
  async updatePassword(id, newPassword) {
    try {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      const [result] = await this.db.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [hashedPassword, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Update last login
  async updateLastLogin(id) {
    try {
      const [result] = await this.db.execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Update reputation
  async updateReputation(id, points) {
    try {
      const [result] = await this.db.execute(
        'UPDATE users SET reputation = reputation + ? WHERE id = ?',
        [points, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get user stats
  async getUserStats(id) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          (SELECT COUNT(*) FROM questions WHERE author_id = ? AND is_deleted = FALSE) as questions_count,
          (SELECT COUNT(*) FROM answers WHERE author_id = ? AND is_deleted = FALSE) as answers_count,
          (SELECT COUNT(*) FROM answers WHERE author_id = ? AND is_accepted = TRUE AND is_deleted = FALSE) as accepted_answers_count
      `, [id, id, id]);
      
      return rows[0] || { questions_count: 0, answers_count: 0, accepted_answers_count: 0 };
    } catch (error) {
      throw error;
    }
  }

  // Get all users (for admin)
  async findAll(limit = 50, offset = 0) {
    try {
      const [rows] = await this.db.execute(
        'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Delete user (soft delete)
  async delete(id) {
    try {
      const [result] = await this.db.execute(
        'UPDATE users SET is_active = FALSE WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Get public profile (without sensitive data)
  getPublicProfile(user) {
    const { password_hash, email, ...publicProfile } = user;
    return publicProfile;
  }
}

module.exports = User; 