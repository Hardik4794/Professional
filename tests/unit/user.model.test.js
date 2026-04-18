const mongoose = require('mongoose');
const User = require('../../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_users';

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
}, 60000);

afterAll(async () => {
  try { await mongoose.connection.dropDatabase(); } catch(e) {}
  await mongoose.disconnect();
}, 60000);

afterEach(async () => {
  try { await User.deleteMany({}); } catch(e) {}
});

describe('User Model', () => {
  test('should create a user with valid fields', async () => {
    const user = await User.create({ name: 'John Doe', email: 'john@example.com', password: 'password123' });
    expect(user._id).toBeDefined();
    expect(user.name).toBe('John Doe');
    expect(user.role).toBe('user');
  }, 15000);

  test('should hash password before saving', async () => {
    const user = await User.create({ name: 'Jane', email: 'jane@example.com', password: 'password123' });
    const found = await User.findById(user._id).select('+password');
    expect(found.password).not.toBe('password123');
  }, 15000);

  test('should compare password correctly', async () => {
    const user = await User.create({ name: 'Test', email: 'test@example.com', password: 'password123' });
    const found = await User.findById(user._id).select('+password');
    expect(await found.comparePassword('password123')).toBe(true);
    expect(await found.comparePassword('wrong')).toBe(false);
  }, 15000);

  test('should require name field', async () => {
    await expect(User.create({ email: 'x@x.com', password: 'password123' })).rejects.toThrow();
  }, 15000);

  test('should require unique email', async () => {
    await User.create({ name: 'One', email: 'dup@example.com', password: 'password123' });
    await expect(User.create({ name: 'Two', email: 'dup@example.com', password: 'password123' })).rejects.toThrow();
  }, 15000);

  test('should default role to user', async () => {
    const user = await User.create({ name: 'Role', email: 'role@example.com', password: 'password123' });
    expect(user.role).toBe('user');
  }, 15000);
});
