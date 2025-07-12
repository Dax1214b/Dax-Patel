class Question {
  constructor(db) {
    this.db = db;
  }

  // Create a new question
  async create(questionData) {
    try {
      const { title, description, author_id, tags = [] } = questionData;
      
      // Insert question
      const [result] = await this.db.execute(
        'INSERT INTO questions (title, description, author_id) VALUES (?, ?, ?)',
        [title, description, author_id]
      );
      
      const questionId = result.insertId;
      
      // Add tags if provided
      if (tags.length > 0) {
        await this.addTags(questionId, tags);
      }
      
      return { id: questionId, title, description, author_id };
    } catch (error) {
      throw error;
    }
  }

  // Find question by ID with author and tags
  async findById(id) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          q.*,
          u.username as author_username,
          u.avatar as author_avatar,
          u.reputation as author_reputation
        FROM questions q
        LEFT JOIN users u ON q.author_id = u.id
        WHERE q.id = ? AND q.is_deleted = FALSE
      `, [id]);
      
      if (rows.length === 0) return null;
      
      const question = rows[0];
      
      // Get tags for this question
      const [tagRows] = await this.db.execute(`
        SELECT t.id, t.name, t.description
        FROM tags t
        JOIN question_tags qt ON t.id = qt.tag_id
        WHERE qt.question_id = ?
      `, [id]);
      
      question.tags = tagRows;
      
      return question;
    } catch (error) {
      throw error;
    }
  }

  // Get all questions with pagination and filters
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = 'created_at',
        order = 'DESC',
        tag = null,
        search = null,
        status = 'open'
      } = options;
      
      const offset = (page - 1) * limit;
      let whereClause = 'q.is_deleted = FALSE';
      let params = [];
      
      if (status) {
        whereClause += ' AND q.status = ?';
        params.push(status);
      }
      
      if (search) {
        whereClause += ' AND (q.title LIKE ? OR q.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (tag) {
        whereClause += ' AND EXISTS (SELECT 1 FROM question_tags qt JOIN tags t ON qt.tag_id = t.id WHERE qt.question_id = q.id AND t.name = ?)';
        params.push(tag);
      }
      
      const [rows] = await this.db.execute(`
        SELECT 
          q.*,
          u.username as author_username,
          u.avatar as author_avatar,
          u.reputation as author_reputation,
          (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id AND a.is_deleted = FALSE) as answers_count
        FROM questions q
        LEFT JOIN users u ON q.author_id = u.id
        WHERE ${whereClause}
        ORDER BY q.${sort} ${order}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);
      
      // Get tags for each question
      for (let question of rows) {
        const [tagRows] = await this.db.execute(`
          SELECT t.id, t.name, t.description
          FROM tags t
          JOIN question_tags qt ON t.id = qt.tag_id
          WHERE qt.question_id = ?
        `, [question.id]);
        question.tags = tagRows;
      }
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Update question
  async update(id, updateData) {
    try {
      const { title, description, tags } = updateData;
      const fields = [];
      const values = [];
      
      if (title) {
        fields.push('title = ?');
        values.push(title);
      }
      
      if (description) {
        fields.push('description = ?');
        values.push(description);
      }
      
      if (fields.length === 0) return false;
      
      values.push(id);
      const [result] = await this.db.execute(
        `UPDATE questions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
      
      // Update tags if provided
      if (tags) {
        await this.updateTags(id, tags);
      }
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete question (soft delete)
  async delete(id) {
    try {
      const [result] = await this.db.execute(
        'UPDATE questions SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Add tags to question
  async addTags(questionId, tagNames) {
    try {
      for (const tagName of tagNames) {
        // Check if tag exists, create if not
        let [tagRows] = await this.db.execute(
          'SELECT id FROM tags WHERE name = ?',
          [tagName]
        );
        
        let tagId;
        if (tagRows.length === 0) {
          // Create new tag
          const [tagResult] = await this.db.execute(
            'INSERT INTO tags (name) VALUES (?)',
            [tagName]
          );
          tagId = tagResult.insertId;
        } else {
          tagId = tagRows[0].id;
        }
        
        // Add tag to question (ignore if already exists)
        await this.db.execute(
          'INSERT IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)',
          [questionId, tagId]
        );
      }
    } catch (error) {
      throw error;
    }
  }

  // Update tags for question
  async updateTags(questionId, tagNames) {
    try {
      // Remove existing tags
      await this.db.execute(
        'DELETE FROM question_tags WHERE question_id = ?',
        [questionId]
      );
      
      // Add new tags
      await this.addTags(questionId, tagNames);
    } catch (error) {
      throw error;
    }
  }

  // Increment view count
  async incrementViews(id) {
    try {
      const [result] = await this.db.execute(
        'UPDATE questions SET views = views + 1 WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get questions by user
  async findByAuthor(authorId, limit = 10, offset = 0) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          q.*,
          (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id AND a.is_deleted = FALSE) as answers_count
        FROM questions q
        WHERE q.author_id = ? AND q.is_deleted = FALSE
        ORDER BY q.created_at DESC
        LIMIT ? OFFSET ?
      `, [authorId, limit, offset]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get trending questions
  async getTrending(limit = 10) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          q.*,
          u.username as author_username,
          u.avatar as author_avatar,
          (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id AND a.is_deleted = FALSE) as answers_count
        FROM questions q
        LEFT JOIN users u ON q.author_id = u.id
        WHERE q.is_deleted = FALSE AND q.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY (q.votes + q.views) DESC
        LIMIT ?
      `, [limit]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get question count
  async getCount(filters = {}) {
    try {
      let whereClause = 'is_deleted = FALSE';
      let params = [];
      
      if (filters.status) {
        whereClause += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters.author_id) {
        whereClause += ' AND author_id = ?';
        params.push(filters.author_id);
      }
      
      const [rows] = await this.db.execute(
        `SELECT COUNT(*) as count FROM questions WHERE ${whereClause}`,
        params
      );
      
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Question; 