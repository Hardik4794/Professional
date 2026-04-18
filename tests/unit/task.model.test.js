const mongoose = require('mongoose');
const Task = require('../../src/models/Task');
const User = require('../../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_tasks';
let testUser;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  testUser = await User.create({ name: 'Test', email: 'test@test.com', password: 'password123' });
}, 60000);

afterAll(async () => {
  try { await mongoose.connection.dropDatabase(); } catch(e) {}
  await mongoose.disconnect();
}, 60000);

afterEach(async () => {
  try { await Task.deleteMany({}); } catch(e) {}
});

describe('Task Model', () => {
  test('should create a task with valid fields', async () => {
    const task = await Task.create({ title: 'Test Task', createdBy: testUser._id });
    expect(task._id).toBeDefined();
    expect(task.status).toBe('pending');
    expect(task.priority).toBe('medium');
  }, 15000);

  test('should require title', async () => {
    await expect(Task.create({ createdBy: testUser._id })).rejects.toThrow();
  }, 15000);

  test('should require createdBy', async () => {
    await expect(Task.create({ title: 'No creator' })).rejects.toThrow();
  }, 15000);

  test('should validate status enum', async () => {
    await expect(Task.create({ title: 'Bad Status', status: 'invalid', createdBy: testUser._id })).rejects.toThrow();
  }, 15000);

  test('should validate priority enum', async () => {
    await expect(Task.create({ title: 'Bad Priority', priority: 'critical', createdBy: testUser._id })).rejects.toThrow();
  }, 15000);

  test('should update task status', async () => {
    const task = await Task.create({ title: 'Update Me', createdBy: testUser._id });
    task.status = 'completed';
    await task.save();
    const updated = await Task.findById(task._id);
    expect(updated.status).toBe('completed');
  }, 15000);
});
