const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const User = require('../../src/models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('User Model', () => {
  test('should create a user with valid fields', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    });

    expect(user._id).toBeDefined();
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
    expect(user.role).toBe('user');
  });

  test('should hash password before saving', async () => {
    const user = await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123'
    });

    const foundUser = await User.findById(user._id).select('+password');
    expect(foundUser.password).not.toBe('password123');
  });

  test('should compare password correctly', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    const foundUser = await User.findById(user._id).select('+password');
    const isMatch = await foundUser.comparePassword('password123');
    const isNotMatch = await foundUser.comparePassword('wrongpassword');

    expect(isMatch).toBe(true);
    expect(isNotMatch).toBe(false);
  });

  test('should require name field', async () => {
    await expect(User.create({ email: 'x@x.com', password: 'password123' }))
      .rejects.toThrow();
  });

  test('should require unique email', async () => {
    await User.create({ name: 'User One', email: 'dup@example.com', password: 'password123' });
    await expect(User.create({ name: 'User Two', email: 'dup@example.com', password: 'password123' }))
      .rejects.toThrow();
  });

  test('should default role to user', async () => {
    const user = await User.create({ name: 'Role Test', email: 'role@example.com', password: 'password123' });
    expect(user.role).toBe('user');
  });
});
