process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let mongo;
let tokenA;
let tokenB;
let taskId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('Auth', () => {
  it('registers a user and hides the password', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
    tokenA = res.body.data.token;
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Alice', email: 'ALICE@example.com', password: 'secret123' });
    expect(res.status).toBe(409);
  });

  it('validates registration input', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: '', email: 'bad', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns profile for authenticated user', async () => {
    const res = await request(app).get('/api/auth/profile').set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  it('blocks profile without token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('blocks invalid token', async () => {
    const res = await request(app).get('/api/auth/profile').set(auth('abc.def.ghi'));
    expect(res.status).toBe(401);
  });
});

describe('Tasks', () => {
  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'secret123' });
    tokenB = res.body.data.token;
  });

  it('creates a task with defaults', async () => {
    const res = await request(app).post('/api/tasks').set(auth(tokenA))
      .send({ title: 'Write docs', description: 'README for API', dueDate: '2026-12-31' });
    expect(res.status).toBe(201);
    expect(res.body.data.task.status).toBe('Pending');
    expect(res.body.data.task.priority).toBe('Medium');
    expect(res.body.data.task.createdAt).toBeDefined();
    taskId = res.body.data.task._id;
  });

  it('ignores non-whitelisted fields (e.g. user)', async () => {
    const res = await request(app).post('/api/tasks').set(auth(tokenA))
      .send({ title: 'Sneaky', user: new mongoose.Types.ObjectId().toString(), priority: 'High', status: 'Completed' });
    expect(res.status).toBe(201);
    const profile = await request(app).get('/api/auth/profile').set(auth(tokenA));
    expect(res.body.data.task.user).toBe(profile.body.data.user._id);
  });

  it('validates task fields', async () => {
    const res = await request(app).post('/api/tasks').set(auth(tokenA))
      .send({ status: 'Done', priority: 'Urgent', dueDate: 'tomorrow' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['title', 'status', 'priority', 'dueDate'])
    );
  });

  it('lists, filters, searches and paginates', async () => {
    for (let i = 0; i < 12; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post('/api/tasks').set(auth(tokenA))
        .send({ title: `Bulk ${i}`, priority: i % 2 ? 'Low' : 'High' });
    }
    let res = await request(app).get('/api/tasks?page=2&limit=5').set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.data.tasks).toHaveLength(5);
    expect(res.body.data.pagination).toMatchObject({ total: 14, page: 2, limit: 5, totalPages: 3 });

    res = await request(app).get('/api/tasks?status=Completed&page=1&limit=10').set(auth(tokenA));
    expect(res.body.data.tasks).toHaveLength(1);

    res = await request(app).get('/api/tasks?priority=Low').set(auth(tokenA));
    expect(res.body.data.pagination.total).toBe(6);

    res = await request(app).get('/api/tasks?search=readme').set(auth(tokenA));
    expect(res.body.data.tasks).toHaveLength(1);
    expect(res.body.data.tasks[0].title).toBe('Write docs');

    res = await request(app).get('/api/tasks?search=(.*').set(auth(tokenA));
    expect(res.status).toBe(200);

    res = await request(app).get('/api/tasks?status=Done').set(auth(tokenA));
    expect(res.status).toBe(400);
  });

  it('gets a single task', async () => {
    const res = await request(app).get(`/api/tasks/${taskId}`).set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.data.task.title).toBe('Write docs');
  });

  it('rejects invalid id', async () => {
    const res = await request(app).get('/api/tasks/123').set(auth(tokenA));
    expect(res.status).toBe(400);
  });

  it('prevents other users accessing the task', async () => {
    expect((await request(app).get(`/api/tasks/${taskId}`).set(auth(tokenB))).status).toBe(404);
    expect((await request(app).put(`/api/tasks/${taskId}`).set(auth(tokenB)).send({ title: 'x' })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${taskId}`).set(auth(tokenB))).status).toBe(404);
    const list = await request(app).get('/api/tasks').set(auth(tokenB));
    expect(list.body.data.pagination.total).toBe(0);
  });

  it('updates a task', async () => {
    const res = await request(app).put(`/api/tasks/${taskId}`).set(auth(tokenA))
      .send({ status: 'In Progress', priority: 'High' });
    expect(res.status).toBe(200);
    expect(res.body.data.task).toMatchObject({ status: 'In Progress', priority: 'High', title: 'Write docs' });
  });

  it('rejects empty update', async () => {
    const res = await request(app).put(`/api/tasks/${taskId}`).set(auth(tokenA)).send({});
    expect(res.status).toBe(400);
  });

  it('deletes a task', async () => {
    const res = await request(app).delete(`/api/tasks/${taskId}`).set(auth(tokenA));
    expect(res.status).toBe(200);
    expect((await request(app).get(`/api/tasks/${taskId}`).set(auth(tokenA))).status).toBe(404);
  });

  it('requires auth for task routes', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
