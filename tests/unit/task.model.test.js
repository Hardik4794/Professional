const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Task = require('../../src/models/Task');
const User = require('../../src/models/User');

let mongoServer;
let testUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  testUser = await User.create({ name: 'Test', email: 'test@test.com', password: 'password123' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Task.deleteMany({});
});

describe('Task Model', () => {
  test('should create a task with valid fields', async () => {
    const task = await Task.create({
      title: 'Test Task',
      description: 'A test task description',
      createdBy: testUser._id
    });

    expect(task._id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.status).toBe('pending');
    expect(task.priority).toBe('medium');
  });

  test('should require title', async () => {
    await expect(Task.create({ createdBy: testUser._id })).rejects.toThrow();
  });

  test('should require createdBy', async () => {
    await expect(Task.create({ title: 'No creator' })).rejects.toThrow();
  });

  test('should validate status enum', async () => {
    await expect(Task.create({
      title: 'Invalid Status',
      status: 'invalid',
      createdBy: testUser._id
    })).rejects.toThrow();
  });

  test('should validate priority enum', async () => {
    await expect(Task.create({
      title: 'Invalid Priority',
      priority: 'critical',
      createdBy: testUser._id
    })).rejects.toThrow();
  });

  test('should update task status', async () => {
    const task = await Task.create({ title: 'Update Me', createdBy: testUser._id });
    task.status = 'completed';
    await task.save();

    const updated = await Task.findById(task._id);
    expect(updated.status).toBe('completed');
  });
});
