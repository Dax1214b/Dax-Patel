class Answer {
  constructor(db) {
    this.db = db;
  }

  // Create a new answer
  async create(answerData) {
    try {
      const { content, question_id, author_id } = answerData;
      
      const [result] = await this.db.execute(
        'INSERT INTO answers (content, question_id, author_id) VALUES (?, ?, ?)',
        [content, question_id, author_id]
      );
      
      return { id: result.insertId, content, question_id, author_id };
    } catch (error) {
      throw error;
    }
  }

  // Find answer by ID with author info
  async findById(id) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          a.*,
          u.username as author_username,
          u.avatar as author_avatar,
          u.reputation as author_reputation
        FROM answers a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.id = ? AND a.is_deleted = FALSE
      `, [id]);
      
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Get answers for a question
  async findByQuestion(questionId, options = {}) {
    try {
      const { sort = 'votes', order = 'DESC' } = options;
      
      const [rows] = await this.db.execute(`
        SELECT 
          a.*,
          u.username as author_username,
          u.avatar as author_avatar,
          u.reputation as author_reputation
        FROM answers a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.question_id = ? AND a.is_deleted = FALSE
        ORDER BY a.${sort} ${order}, a.created_at ASC
      `, [questionId]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Update answer
  async update(id, updateData) {
    try {
      const { content } = updateData;
      
      if (!content) return false;
      
      const [result] = await this.db.execute(
        'UPDATE answers SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [content, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete answer (soft delete)
  async delete(id) {
    try {
      const [result] = await this.db.execute(
        'UPDATE answers SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Accept answer
  async accept(id) {
    try {
      // First, unaccept all other answers for the same question
      const [answerRows] = await this.db.execute(
        'SELECT question_id FROM answers WHERE id = ?',
        [id]
      );
      
      if (answerRows.length === 0) return false;
      
      const questionId = answerRows[0].question_id;
      
      await this.db.execute(
        'UPDATE answers SET is_accepted = FALSE WHERE question_id = ?',
        [questionId]
      );
      
      // Accept this answer
      const [result] = await this.db.execute(
        'UPDATE answers SET is_accepted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      // Update question's accepted_answer_id
      await this.db.execute(
        'UPDATE questions SET accepted_answer_id = ? WHERE id = ?',
        [id, questionId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Unaccept answer
  async unaccept(id) {
    try {
      const [result] = await this.db.execute(
        'UPDATE answers SET is_accepted = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows > 0) {
        // Update question's accepted_answer_id to NULL
        const [answerRows] = await this.db.execute(
          'SELECT question_id FROM answers WHERE id = ?',
          [id]
        );
        
        if (answerRows.length > 0) {
          await this.db.execute(
            'UPDATE questions SET accepted_answer_id = NULL WHERE id = ?',
            [answerRows[0].question_id]
          );
        }
      }
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get answers by user
  async findByAuthor(authorId, limit = 10, offset = 0) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          a.*,
          q.title as question_title,
          q.id as question_id
        FROM answers a
        LEFT JOIN questions q ON a.question_id = q.id
        WHERE a.author_id = ? AND a.is_deleted = FALSE
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `, [authorId, limit, offset]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get accepted answers by user
  async findAcceptedByAuthor(authorId, limit = 10, offset = 0) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          a.*,
          q.title as question_title,
          q.id as question_id
        FROM answers a
        LEFT JOIN questions q ON a.question_id = q.id
        WHERE a.author_id = ? AND a.is_accepted = TRUE AND a.is_deleted = FALSE
        ORDER BY a.updated_at DESC
        LIMIT ? OFFSET ?
      `, [authorId, limit, offset]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get answer count for a question
  async getCountByQuestion(questionId) {
    try {
      const [rows] = await this.db.execute(
        'SELECT COUNT(*) as count FROM answers WHERE question_id = ? AND is_deleted = FALSE',
        [questionId]
      );
      
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  // Get answer count by user
  async getCountByAuthor(authorId) {
    try {
      const [rows] = await this.db.execute(
        'SELECT COUNT(*) as count FROM answers WHERE author_id = ? AND is_deleted = FALSE',
        [authorId]
      );
      
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  // Get accepted answer count by user
  async getAcceptedCountByAuthor(authorId) {
    try {
      const [rows] = await this.db.execute(
        'SELECT COUNT(*) as count FROM answers WHERE author_id = ? AND is_accepted = TRUE AND is_deleted = FALSE',
        [authorId]
      );
      
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  // Check if user has answered a question
  async hasUserAnswered(questionId, userId) {
    try {
      const [rows] = await this.db.execute(
        'SELECT id FROM answers WHERE question_id = ? AND author_id = ? AND is_deleted = FALSE',
        [questionId, userId]
      );
      
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get best answers (most voted)
  async getBestAnswers(limit = 10) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          a.*,
          u.username as author_username,
          u.avatar as author_avatar,
          q.title as question_title,
          q.id as question_id
        FROM answers a
        LEFT JOIN users u ON a.author_id = u.id
        LEFT JOIN questions q ON a.question_id = q.id
        WHERE a.is_deleted = FALSE AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY a.votes DESC
        LIMIT ?
      `, [limit]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Answer; 