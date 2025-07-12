class Notification {
  constructor(db) {
    this.db = db;
  }

  // Create a new notification
  async create(notificationData) {
    try {
      const { recipient_id, sender_id, type, title, message, data = null } = notificationData;
      
      const [result] = await this.db.execute(
        'INSERT INTO notifications (recipient_id, sender_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)',
        [recipient_id, sender_id, type, title, message, data ? JSON.stringify(data) : null]
      );
      
      return { id: result.insertId, recipient_id, sender_id, type, title, message };
    } catch (error) {
      throw error;
    }
  }

  // Find notification by ID
  async findById(id) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          n.*,
          u.username as sender_username,
          u.avatar as sender_avatar
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.id = ?
      `, [id]);
      
      if (rows.length === 0) return null;
      
      const notification = rows[0];
      if (notification.data) {
        notification.data = JSON.parse(notification.data);
      }
      
      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Get notifications for a user
  async findByRecipient(recipientId, options = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = options;
      const offset = (page - 1) * limit;
      
      let whereClause = 'n.recipient_id = ?';
      let params = [recipientId];
      
      if (unreadOnly) {
        whereClause += ' AND n.is_read = FALSE';
      }
      
      const [rows] = await this.db.execute(`
        SELECT 
          n.*,
          u.username as sender_username,
          u.avatar as sender_avatar
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);
      
      // Parse JSON data
      rows.forEach(row => {
        if (row.data) {
          row.data = JSON.parse(row.data);
        }
      });
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get unread notification count for a user
  async getUnreadCount(recipientId) {
    try {
      const [rows] = await this.db.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = FALSE',
        [recipientId]
      );
      
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(id) {
    try {
      const [result] = await this.db.execute(
        'UPDATE notifications SET is_read = TRUE WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(recipientId) {
    try {
      const [result] = await this.db.execute(
        'UPDATE notifications SET is_read = TRUE WHERE recipient_id = ?',
        [recipientId]
      );
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  }

  // Delete notification
  async delete(id) {
    try {
      const [result] = await this.db.execute(
        'DELETE FROM notifications WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete all notifications for a user
  async deleteAllForUser(recipientId) {
    try {
      const [result] = await this.db.execute(
        'DELETE FROM notifications WHERE recipient_id = ?',
        [recipientId]
      );
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  }

  // Create notification for question answer
  async createAnswerNotification(questionId, answerId, answerAuthorId, questionAuthorId) {
    try {
      // Get question details
      const [questionRows] = await this.db.execute(
        'SELECT title FROM questions WHERE id = ?',
        [questionId]
      );
      
      if (questionRows.length === 0) return null;
      
      const questionTitle = questionRows[0].title;
      
      // Get answer author details
      const [userRows] = await this.db.execute(
        'SELECT username FROM users WHERE id = ?',
        [answerAuthorId]
      );
      
      if (userRows.length === 0) return null;
      
      const answerAuthorName = userRows[0].username;
      
      return await this.create({
        recipient_id: questionAuthorId,
        sender_id: answerAuthorId,
        type: 'answer',
        title: 'New Answer',
        message: `${answerAuthorName} answered your question: "${questionTitle}"`,
        data: {
          question_id: questionId,
          answer_id: answerId,
          question_title: questionTitle
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Create notification for answer acceptance
  async createAcceptanceNotification(answerId, answerAuthorId, questionAuthorId) {
    try {
      // Get answer and question details
      const [rows] = await this.db.execute(`
        SELECT q.title as question_title, u.username as question_author_name
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        JOIN users u ON q.author_id = u.id
        WHERE a.id = ?
      `, [answerId]);
      
      if (rows.length === 0) return null;
      
      const { question_title, question_author_name } = rows[0];
      
      return await this.create({
        recipient_id: answerAuthorId,
        sender_id: questionAuthorId,
        type: 'acceptance',
        title: 'Answer Accepted',
        message: `${question_author_name} accepted your answer for: "${question_title}"`,
        data: {
          answer_id: answerId,
          question_title: question_title
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Create notification for vote
  async createVoteNotification(targetType, targetId, voterId, targetAuthorId, voteType) {
    try {
      // Get voter details
      const [voterRows] = await this.db.execute(
        'SELECT username FROM users WHERE id = ?',
        [voterId]
      );
      
      if (voterRows.length === 0) return null;
      
      const voterName = voterRows[0].username;
      
      let title, message, data;
      
      if (targetType === 'question') {
        const [questionRows] = await this.db.execute(
          'SELECT title FROM questions WHERE id = ?',
          [targetId]
        );
        
        if (questionRows.length === 0) return null;
        
        title = voteType === 'upvote' ? 'Question Upvoted' : 'Question Downvoted';
        message = `${voterName} ${voteType === 'upvote' ? 'upvoted' : 'downvoted'} your question: "${questionRows[0].title}"`;
        data = {
          question_id: targetId,
          question_title: questionRows[0].title,
          vote_type: voteType
        };
      } else if (targetType === 'answer') {
        const [answerRows] = await this.db.execute(`
          SELECT q.title as question_title
          FROM answers a
          JOIN questions q ON a.question_id = q.id
          WHERE a.id = ?
        `, [targetId]);
        
        if (answerRows.length === 0) return null;
        
        title = voteType === 'upvote' ? 'Answer Upvoted' : 'Answer Downvoted';
        message = `${voterName} ${voteType === 'upvote' ? 'upvoted' : 'downvoted'} your answer for: "${answerRows[0].question_title}"`;
        data = {
          answer_id: targetId,
          question_title: answerRows[0].question_title,
          vote_type: voteType
        };
      }
      
      return await this.create({
        recipient_id: targetAuthorId,
        sender_id: voterId,
        type: 'vote',
        title,
        message,
        data
      });
    } catch (error) {
      throw error;
    }
  }

  // Create notification for comment
  async createCommentNotification(answerId, commentAuthorId, answerAuthorId) {
    try {
      // Get answer and question details
      const [rows] = await this.db.execute(`
        SELECT q.title as question_title, u.username as comment_author_name
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        JOIN users u ON u.id = ?
        WHERE a.id = ?
      `, [commentAuthorId, answerId]);
      
      if (rows.length === 0) return null;
      
      const { question_title, comment_author_name } = rows[0];
      
      return await this.create({
        recipient_id: answerAuthorId,
        sender_id: commentAuthorId,
        type: 'comment',
        title: 'New Comment',
        message: `${comment_author_name} commented on your answer for: "${question_title}"`,
        data: {
          answer_id: answerId,
          question_title: question_title
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Get notification statistics for a user
  async getStats(recipientId) {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread,
          SUM(CASE WHEN type = 'answer' THEN 1 ELSE 0 END) as answers,
          SUM(CASE WHEN type = 'acceptance' THEN 1 ELSE 0 END) as acceptances,
          SUM(CASE WHEN type = 'vote' THEN 1 ELSE 0 END) as votes,
          SUM(CASE WHEN type = 'comment' THEN 1 ELSE 0 END) as comments
        FROM notifications 
        WHERE recipient_id = ?
      `, [recipientId]);
      
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Clean old notifications (older than 30 days)
  async cleanOldNotifications() {
    try {
      const [result] = await this.db.execute(
        'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
        []
      );
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Notification; 