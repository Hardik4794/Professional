const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Task = require('../../src/models/Task');
 
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_integration';
let authToken;
 
beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
}, 60000);
 
afterAll(async () => {
  try { await mongoose.connection.dropDatabase(); } catch(e) {}
  await mongoose.disconnect();
}, 60000);
 
beforeEach(async () => {
  try { await User.deleteMany({}); await Task.deleteMany({}); } catch(e) {}
  const res = await request(app).post('/api/users/register')
    .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });
  authToken = res.body.token;
}, 30000);
 
describe('Health Endpoints', () => {
  test('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  }, 15000);
});
 
describe('User Auth Endpoints', () => {
  test('POST /api/users/register - success', async () => {
    const res = await request(app).post('/api/users/register')
      .send({ name: 'New User', email: 'new@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  }, 15000);
 
  test('POST /api/users/register - duplicate email', async () => {
    const res = await request(app).post('/api/users/register')
      .send({ name: 'Dup', email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  }, 15000);
 
  test('POST /api/users/login - valid credentials', async () => {
    const res = await request(app).post('/api/users/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  }, 15000);
 
  test('POST /api/users/login - invalid credentials', async () => {
    const res = await request(app).post('/api/users/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  }, 15000);
 
  test('GET /api/users/me - authenticated', async () => {
    const res = await request(app).get('/api/users/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@example.com');
  }, 15000);
 
  test('GET /api/users/me - unauthenticated', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  }, 15000);
});
 
describe('Task CRUD Endpoints', () => {
  test('POST /api/tasks - create task', async () => {
    const res = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'My Task', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('My Task');
  }, 15000);
 
  test('GET /api/tasks - get all tasks', async () => {
    await request(app).post('/api/tasks').set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Task 1' });
    const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
  }, 15000);
 
  test('PATCH /api/tasks/:id - update task', async () => {
    const createRes = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`).send({ title: 'Update Task' });
    const res = await request(app).patch(`/api/tasks/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${authToken}`).send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  }, 15000);
 
  test('DELETE /api/tasks/:id - delete task', async () => {
    const createRes = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`).send({ title: 'Delete Task' });
    const res = await request(app).delete(`/api/tasks/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(204);
  }, 15000);
 
  test('GET /api/tasks/stats', async () => {
    await request(app).post('/api/tasks').set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Stat Task' });
    const res = await request(app).get('/api/tasks/stats').set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  }, 15000);
});
 
