import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-secret-with-at-least-thirty-two-characters';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/interviewos_test';

const [{ app }, { default: User }, { default: Interview }] = await Promise.all([
  import('../src/index.js'),
  import('../src/models/User.js'),
  import('../src/models/Interview.js')
]);

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.dropDatabase();
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('API health reports connected MongoDB', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.database, 'connected');
});

test('registration, login and user-owned interview lifecycle work end to end', async () => {
  const suffix = randomUUID();
  const email = `candidate-${suffix}@example.test`;
  const password = 'InterviewOS-test-password-2026';

  const registration = await request(app).post('/api/auth/register').send({
    name: 'Test Candidate',
    email,
    password
  }).expect(201);

  assert.ok(registration.body.token);
  assert.equal(registration.body.user.email, email);
  assert.equal(registration.body.user.passwordHash, undefined);

  const login = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  assert.ok(login.body.token);

  const created = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${login.body.token}`)
    .send({
      role: 'QA Automation Engineer',
      interviewType: 'Technical',
      level: 'Intermediate',
      difficulty: 'Medium',
      questions: [
        'How would you design a stable automation framework?',
        'How do you investigate a flaky end-to-end test?',
        'How would you validate a critical API workflow?'
      ]
    })
    .expect(201);

  const interviewId = created.body.interview._id;
  assert.ok(interviewId);

  const listed = await request(app)
    .get('/api/interviews')
    .set('Authorization', `Bearer ${login.body.token}`)
    .expect(200);
  assert.equal(listed.body.interviews.length, 1);

  await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${login.body.token}`)
    .send({
      status: 'completed',
      overallScore: 82,
      answers: [{
        question: 'How would you design a stable automation framework?',
        answer: 'I would separate test data, page objects, assertions and reporting.',
        feedback: { score: 82, strengths: ['Clear structure'] }
      }]
    })
    .expect(200);

  const saved = await request(app)
    .get(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${login.body.token}`)
    .expect(200);
  assert.equal(saved.body.interview.status, 'completed');
  assert.equal(saved.body.interview.overallScore, 82);
  assert.equal(saved.body.interview.answers.length, 1);

  const secondUser = await request(app).post('/api/auth/register').send({
    name: 'Another Candidate',
    email: `other-${suffix}@example.test`,
    password
  }).expect(201);

  await request(app)
    .get(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${secondUser.body.token}`)
    .expect(404);

  const ownSessions = await request(app)
    .get('/api/interviews')
    .set('Authorization', `Bearer ${secondUser.body.token}`)
    .expect(200);
  assert.equal(ownSessions.body.interviews.length, 0);

  assert.equal(await User.countDocuments(), 2);
  assert.equal(await Interview.countDocuments(), 1);
});

test('interview creation rejects invalid setup and unauthenticated access', async () => {
  await request(app).post('/api/interviews').send({ role: 'QA' }).expect(401);
  const account = await request(app).post('/api/auth/register').send({
    name: 'Validation User',
    email: `validation-${randomUUID()}@example.test`,
    password: 'InterviewOS-test-password-2026'
  }).expect(201);

  await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${account.body.token}`)
    .send({ role: 'Q', interviewType: 'Other' })
    .expect(400);
});
