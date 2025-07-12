const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');

describe('StackIt API Tests', () => {
  let testUser;
  let testQuestion;
  let testAnswer;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/stackit_test');
    
    // Clear test data
    await User.deleteMany({});
    await Question.deleteMany({});
    await Answer.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Authentication', () => {
    test('POST /api/auth/register - should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();

      testUser = response.body.data.user;
      authToken = response.body.data.token;
    });

    test('POST /api/auth/login - should login user', async () => {
      const loginData = {
        identifier: 'testuser',
        password: 'TestPass123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(loginData.identifier);
      expect(response.body.data.token).toBeDefined();
    });

    test('GET /api/auth/me - should get current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
    });
  });

  describe('Questions', () => {
    test('POST /api/questions - should create a new question', async () => {
      const questionData = {
        title: 'Test Question Title',
        description: 'This is a test question description with enough content to meet the minimum requirement.',
        tags: ['test', 'javascript']
      };

      const response = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(questionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.question.title).toBe(questionData.title);
      expect(response.body.data.question.tags).toEqual(questionData.tags);

      testQuestion = response.body.data.question;
    });

    test('GET /api/questions - should get all questions', async () => {
      const response = await request(app)
        .get('/api/questions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questions).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('GET /api/questions/:id - should get question by ID', async () => {
      const response = await request(app)
        .get(`/api/questions/${testQuestion._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.question._id).toBe(testQuestion._id);
      expect(response.body.data.question.title).toBe(testQuestion.title);
    });

    test('PUT /api/questions/:id - should update question', async () => {
      const updateData = {
        title: 'Updated Test Question Title',
        description: 'This is an updated test question description with enough content.'
      };

      const response = await request(app)
        .put(`/api/questions/${testQuestion._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.question.title).toBe(updateData.title);
    });
  });

  describe('Answers', () => {
    test('POST /api/answers - should create a new answer', async () => {
      const answerData = {
        content: 'This is a test answer with enough content to meet the minimum requirement for answers.',
        questionId: testQuestion._id
      };

      const response = await request(app)
        .post('/api/answers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(answerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.answer.content).toBe(answerData.content);
      expect(response.body.data.answer.question).toBe(testQuestion._id);

      testAnswer = response.body.data.answer;
    });

    test('GET /api/answers - should get all answers', async () => {
      const response = await request(app)
        .get('/api/answers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.answers).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('GET /api/answers/:id - should get answer by ID', async () => {
      const response = await request(app)
        .get(`/api/answers/${testAnswer._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.answer._id).toBe(testAnswer._id);
      expect(response.body.data.answer.content).toBe(testAnswer.content);
    });
  });

  describe('Voting', () => {
    test('POST /api/questions/:id/vote - should vote on question', async () => {
      const voteData = {
        voteType: 'upvote'
      };

      const response = await request(app)
        .post(`/api/questions/${testQuestion._id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(voteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.voteCount).toBeDefined();
    });

    test('POST /api/answers/:id/vote - should vote on answer', async () => {
      const voteData = {
        voteType: 'upvote'
      };

      const response = await request(app)
        .post(`/api/answers/${testAnswer._id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(voteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.voteCount).toBeDefined();
    });
  });

  describe('Comments', () => {
    test('POST /api/answers/:id/comments - should add comment to answer', async () => {
      const commentData = {
        content: 'This is a test comment on the answer.'
      };

      const response = await request(app)
        .post(`/api/answers/${testAnswer._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comment.content).toBe(commentData.content);
    });
  });

  describe('Tags', () => {
    test('GET /api/tags/popular - should get popular tags', async () => {
      const response = await request(app)
        .get('/api/tags/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tags).toBeInstanceOf(Array);
    });

    test('GET /api/tags/search - should search tags', async () => {
      const response = await request(app)
        .get('/api/tags/search?q=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tags).toBeInstanceOf(Array);
    });
  });

  describe('Users', () => {
    test('GET /api/users/:id - should get user profile', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user._id).toBe(testUser._id);
      expect(response.body.data.user.username).toBe(testUser.username);
    });

    test('GET /api/users/leaderboard - should get user leaderboard', async () => {
      const response = await request(app)
        .get('/api/users/leaderboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    test('POST /api/auth/login - should fail with invalid credentials', async () => {
      const loginData = {
        identifier: 'testuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('GET /api/questions/invalid-id - should return 404 for invalid question ID', async () => {
      const response = await request(app)
        .get('/api/questions/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('POST /api/questions - should fail without authentication', async () => {
      const questionData = {
        title: 'Test Question',
        description: 'Test description',
        tags: ['test']
      };

      const response = await request(app)
        .post('/api/questions')
        .send(questionData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
}); 