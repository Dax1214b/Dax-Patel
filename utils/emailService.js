const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Send email notification
  async sendNotification(to, subject, html, text) {
    try {
      const mailOptions = {
        from: `"StackIt" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to StackIt!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #667eea;">Welcome to StackIt!</h1>
        <p>Hi ${user.username},</p>
        <p>Welcome to StackIt - your community-driven Q&A platform!</p>
        <p>Here's what you can do:</p>
        <ul>
          <li>Ask questions and get answers from the community</li>
          <li>Answer questions and help others</li>
          <li>Vote on questions and answers</li>
          <li>Earn reputation and badges</li>
          <li>Connect with other developers</li>
        </ul>
        <p>Get started by asking your first question!</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
           style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Start Exploring
        </a>
        <p>Best regards,<br>The StackIt Team</p>
      </div>
    `;

    const text = `
      Welcome to StackIt!
      
      Hi ${user.username},
      
      Welcome to StackIt - your community-driven Q&A platform!
      
      Here's what you can do:
      - Ask questions and get answers from the community
      - Answer questions and help others
      - Vote on questions and answers
      - Earn reputation and badges
      - Connect with other developers
      
      Get started by asking your first question!
      
      Best regards,
      The StackIt Team
    `;

    return this.sendNotification(user.email, subject, html, text);
  }

  // Send answer notification
  async sendAnswerNotification(question, answer, recipient) {
    const subject = `New answer to your question: ${question.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">New Answer Received</h2>
        <p>Hi ${recipient.username},</p>
        <p>Someone answered your question: <strong>${question.title}</strong></p>
        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
          <p style="margin: 0; color: #666;">${answer.content.substring(0, 200)}${answer.content.length > 200 ? '...' : ''}</p>
        </div>
        <p>By: ${answer.author.username}</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/questions/${question._id}" 
           style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          View Answer
        </a>
        <p>Best regards,<br>The StackIt Team</p>
      </div>
    `;

    const text = `
      New Answer Received
      
      Hi ${recipient.username},
      
      Someone answered your question: ${question.title}
      
      Answer preview: ${answer.content.substring(0, 200)}${answer.content.length > 200 ? '...' : ''}
      
      By: ${answer.author.username}
      
      View the full answer on StackIt.
      
      Best regards,
      The StackIt Team
    `;

    return this.sendNotification(recipient.email, subject, html, text);
  }

  // Send comment notification
  async sendCommentNotification(question, answer, comment, recipient) {
    const subject = `New comment on your answer`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">New Comment</h2>
        <p>Hi ${recipient.username},</p>
        <p>Someone commented on your answer to: <strong>${question.title}</strong></p>
        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
          <p style="margin: 0; color: #666;">${comment.content}</p>
        </div>
        <p>By: ${comment.author.username}</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/questions/${question._id}" 
           style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          View Comment
        </a>
        <p>Best regards,<br>The StackIt Team</p>
      </div>
    `;

    const text = `
      New Comment
      
      Hi ${recipient.username},
      
      Someone commented on your answer to: ${question.title}
      
      Comment: ${comment.content}
      
      By: ${comment.author.username}
      
      View the comment on StackIt.
      
      Best regards,
      The StackIt Team
    `;

    return this.sendNotification(recipient.email, subject, html, text);
  }

  // Send answer accepted notification
  async sendAnswerAcceptedNotification(question, answer, recipient) {
    const subject = `Your answer was accepted!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Answer Accepted! 🎉</h2>
        <p>Hi ${recipient.username},</p>
        <p>Great news! Your answer to <strong>${question.title}</strong> was accepted by the question author.</p>
        <p>You've earned <strong>15 reputation points</strong> for this!</p>
        <div style="background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
          <p style="margin: 0; color: #155724;">${answer.content.substring(0, 200)}${answer.content.length > 200 ? '...' : ''}</p>
        </div>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/questions/${question._id}" 
           style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          View Question
        </a>
        <p>Keep up the great work!</p>
        <p>Best regards,<br>The StackIt Team</p>
      </div>
    `;

    const text = `
      Answer Accepted! 🎉
      
      Hi ${recipient.username},
      
      Great news! Your answer to ${question.title} was accepted by the question author.
      
      You've earned 15 reputation points for this!
      
      Answer preview: ${answer.content.substring(0, 200)}${answer.content.length > 200 ? '...' : ''}
      
      Keep up the great work!
      
      Best regards,
      The StackIt Team
    `;

    return this.sendNotification(recipient.email, subject, html, text);
  }

  // Send mention notification
  async sendMentionNotification(question, answer, mentioner, recipient) {
    const subject = `You were mentioned in a ${answer ? 'comment' : 'question'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">You Were Mentioned</h2>
        <p>Hi ${recipient.username},</p>
        <p>${mentioner.username} mentioned you in a ${answer ? 'comment' : 'question'}: <strong>${question.title}</strong></p>
        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
          <p style="margin: 0; color: #666;">${answer ? answer.content : question.description}</p>
        </div>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/questions/${question._id}" 
           style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          View ${answer ? 'Comment' : 'Question'}
        </a>
        <p>Best regards,<br>The StackIt Team</p>
      </div>
    `;

    const text = `
      You Were Mentioned
      
      Hi ${recipient.username},
      
      ${mentioner.username} mentioned you in a ${answer ? 'comment' : 'question'}: ${question.title}
      
      Content: ${answer ? answer.content : question.description}
      
      View it on StackIt.
      
      Best regards,
      The StackIt Team
    `;

    return this.sendNotification(recipient.email, subject, html, text);
  }

  // Send badge notification
  async sendBadgeNotification(user, badgeName, badgeDescription) {
    const subject = `You earned a new badge: ${badgeName}!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc107;">New Badge Earned! 🏆</h2>
        <p>Hi ${user.username},</p>
        <p>Congratulations! You've earned a new badge: <strong>${badgeName}</strong></p>
        <p>${badgeDescription}</p>
        <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">Keep contributing to earn more badges!</p>
        </div>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/users/${user._id}" 
           style="background: #ffc107; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          View Profile
        </a>
        <p>Best regards,<br>The StackIt Team</p>
      </div>
    `;

    const text = `
      New Badge Earned! 🏆
      
      Hi ${user.username},
      
      Congratulations! You've earned a new badge: ${badgeName}
      
      ${badgeDescription}
      
      Keep contributing to earn more badges!
      
      Best regards,
      The StackIt Team
    `;

    return this.sendNotification(user.email, subject, html, text);
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const subject = 'Password Reset Request';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Password Reset Request</h2>
        <p>Hi ${user.username},</p>
        <p>You requested a password reset for your StackIt account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" 
           style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>The StackIt Team</p>
      </div>
    `;

    const text = `
      Password Reset Request
      
      Hi ${user.username},
      
      You requested a password reset for your StackIt account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      If you didn't request this, you can safely ignore this email.
      
      This link will expire in 1 hour.
      
      Best regards,
      The StackIt Team
    `;

    return this.sendNotification(user.email, subject, html, text);
  }

  // Send account verification email
  async sendVerificationEmail(user, verificationToken) {
    const subject = 'Verify Your StackIt Account';
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Verify Your Account</h2>
        <p>Hi ${user.username},</p>
        <p>Welcome to StackIt! Please verify your email address to complete your registration.</p>
        <a href="${verifyUrl}" 
           style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>The StackIt Team</p>
      </div>
    `;

    const text = `
      Verify Your Account
      
      Hi ${user.username},
      
      Welcome to StackIt! Please verify your email address to complete your registration.
      
      Click the link below to verify your email:
      ${verifyUrl}
      
      If you didn't create an account, you can safely ignore this email.
      
      Best regards,
      The StackIt Team
    `;

    return this.sendNotification(user.email, subject, html, text);
  }
}

module.exports = new EmailService(); 