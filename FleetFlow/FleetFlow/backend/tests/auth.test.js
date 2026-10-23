const request = require('supertest');
const app = require('../app');

// These tests exercise validation and authorization logic that doesn't require
// a live database write. Full CRUD round-trip tests (creating a vessel, voyage,
// etc. against real data) need MONGO_URI pointed at a reachable MongoDB instance —
// see backend/README.md for how to run those once a DB is connected.

describe('Health check', () => {
  it('GET /api/health returns success', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Auth validation', () => {
  it('rejects register with an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'not-an-email', password: 'validpass123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects register with a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@fleetflow.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects login with missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@fleetflow.com' });
    expect(res.status).toBe(400);
  });
});

describe('Route protection', () => {
  it('rejects unauthenticated access to vessels', async () => {
    const res = await request(app).get('/api/vessels');
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated access to voyages', async () => {
    const res = await request(app).get('/api/voyages');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed/expired token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

describe('Not found handling', () => {
  it('returns 404 for an unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
