class Tag {
  constructor(db) {
    this.db = db;
  }

  // Create a new tag
  async create(tagData) {
    try {
      const { name, description = '' } = tagData;
      
      const [result] = await this.db.execute(
        'INSERT INTO tags (name, description) VALUES (?, ?)',
        [name, description]
      );
      
      return { id: result.insertId, name, description };
    } catch (error) {
      throw error;
    }
  }

  // Find tag by ID
  async findById(id) {
    try {
      const [rows] = await this.db.execute(
        'SELECT * FROM tags WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find tag by name
  async findByName(name) {
    try {
      const [rows] = await this.db.execute(
        'SELECT * FROM tags WHERE name = ?',
        [name]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Get all tags with pagination
  async findAll(options = {}) {
    try {
      const { page = 1, limit = 50, sort = 'usage_count', order = 'DESC', search = null } = options;
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      let params = [];
      
      if (search) {
        whereClause = 'WHERE name LIKE ? OR description LIKE ?';
        params = [`%${search}%`, `%${search}%`];
      }
      
      const [rows] = await this.db.execute(`
        SELECT * FROM tags 
        ${whereClause}
        ORDER BY ${sort} ${order}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get popular tags
  async getPopular(limit = 20) {
    try {
      const [rows] = await this.db.execute(`
        SELECT * FROM tags 
        ORDER BY usage_count DESC, questions_count DESC
        LIMIT ?
      `, [limit]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get tags for a question
  async getTagsForQuestion(questionId) {
    try {
      const [rows] = await this.db.execute(`
        SELECT t.* 
        FROM tags t
        JOIN question_tags qt ON t.id = qt.tag_id
        WHERE qt.question_id = ?
        ORDER BY t.name
      `, [questionId]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Update tag
  async update(id, updateData) {
    try {
      const { name, description } = updateData;
      const fields = [];
      const values = [];
      
      if (name) {
        fields.push('name = ?');
        values.push(name);
      }
      
      if (description !== undefined) {
        fields.push('description = ?');
        values.push(description);
      }
      
      if (fields.length === 0) return false;
      
      values.push(id);
      const [result] = await this.db.execute(
        `UPDATE tags SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete tag
  async delete(id) {
    try {
      const [result] = await this.db.execute(
        'DELETE FROM tags WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Increment usage count
  async incrementUsage(id) {
    try {
      const [result] = await this.db.execute(
        'UPDATE tags SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Update questions count
  async updateQuestionsCount(id) {
    try {
      const [result] = await this.db.execute(`
        UPDATE tags t 
        SET questions_count = (
          SELECT COUNT(DISTINCT qt.question_id) 
          FROM question_tags qt 
          JOIN questions q ON qt.question_id = q.id 
          WHERE qt.tag_id = t.id AND q.is_deleted = FALSE
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE t.id = ?
      `, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get tag statistics
  async getStats(id) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          t.*,
          (SELECT COUNT(DISTINCT qt.question_id) 
           FROM question_tags qt 
           JOIN questions q ON qt.question_id = q.id 
           WHERE qt.tag_id = t.id AND q.is_deleted = FALSE) as actual_questions_count,
          (SELECT COUNT(DISTINCT qt.question_id) 
           FROM question_tags qt 
           JOIN questions q ON qt.question_id = q.id 
           WHERE qt.tag_id = t.id AND q.is_deleted = FALSE AND q.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as questions_this_month
        FROM tags t
        WHERE t.id = ?
      `, [id]);
      
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Search tags
  async search(query, limit = 10) {
    try {
      const [rows] = await this.db.execute(`
        SELECT * FROM tags 
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY usage_count DESC
        LIMIT ?
      `, [`%${query}%`, `%${query}%`, limit]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get related tags
  async getRelatedTags(tagId, limit = 10) {
    try {
      const [rows] = await this.db.execute(`
        SELECT DISTINCT t2.*, COUNT(*) as overlap_count
        FROM question_tags qt1
        JOIN question_tags qt2 ON qt1.question_id = qt2.question_id
        JOIN tags t2 ON qt2.tag_id = t2.id
        WHERE qt1.tag_id = ? AND qt2.tag_id != ?
        GROUP BY t2.id
        ORDER BY overlap_count DESC, t2.usage_count DESC
        LIMIT ?
      `, [tagId, tagId, limit]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get tag count
  async getCount() {
    try {
      const [rows] = await this.db.execute(
        'SELECT COUNT(*) as count FROM tags'
      );
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  // Get tags with questions count
  async getTagsWithCounts(limit = 50) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          t.*,
          (SELECT COUNT(DISTINCT qt.question_id) 
           FROM question_tags qt 
           JOIN questions q ON qt.question_id = q.id 
           WHERE qt.tag_id = t.id AND q.is_deleted = FALSE) as actual_questions_count
        FROM tags t
        ORDER BY actual_questions_count DESC, t.usage_count DESC
        LIMIT ?
      `, [limit]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Tag; 