const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Task = require('../../src/models/Task');

const MONGO_URI = 'mongodb://localhost:27018/test_integration';

let authToken;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Task.deleteMany({});

  const registerRes = await request(app)
    .post('/api/users/register')
    .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

  authToken = registerRes.body.token;
});

describe('Health Endpoints', () => {
  test('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('User Auth Endpoints', () => {
  test('POST /api/users/register - success', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'New User', email: 'new@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/users/register - duplicate email', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'Dup', email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  test('POST /api/users/login - valid credentials', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/users/login - invalid credentials', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('GET /api/users/me - authenticated', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@example.com');
  });

  test('GET /api/users/me - unauthenticated', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

describe('Task CRUD Endpoints', () => {
  test('POST /api/tasks - create task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'My Task', description: 'Do something', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('My Task');
  });

  test('GET /api/tasks - get all tasks', async () => {
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Task 1', priority: 'low' });
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
  });

  test('PATCH /api/tasks/:id - update task', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Update Task' });
    const taskId = createRes.body.data._id;
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  test('DELETE /api/tasks/:id - delete task', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Delete Task' });
    const taskId = createRes.body.data._id;
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(204);
  });

  test('GET /api/tasks/stats - get task statistics', async () => {
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Stat Task' });
    const res = await request(app)
      .get('/api/tasks/stats')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
