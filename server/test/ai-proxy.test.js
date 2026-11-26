import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';

// A local stand-in for the AI service that accepts connections but never answers,
// so the API-side timeout and its error response can be verified.
const hangingAi = http.createServer(() => {});
await new Promise(resolve => hangingAi.listen(0, '127.0.0.1', resolve));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'ai-proxy-test-secret-with-at-least-thirty-two-characters';
process.env.AI_SERVICE_URL = `http://127.0.0.1:${hangingAi.address().port}`;
process.env.AI_REVIEW_TIMEOUT_MS = '5000';
process.env.AI_QUESTIONS_TIMEOUT_MS = '5000';
process.env.PORT = '0';
delete process.env.HOST;
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/interviewos_test';

const { app, startServer, timeoutFromEnv } = await import('../src/index.js');
const token = jwt.sign({ sub: '0123456789abcdef01234567' }, process.env.JWT_SECRET, { expiresIn: '5m', issuer: 'interviewos-api', audience: 'interviewos-client' });

after(async () => {
  hangingAi.closeAllConnections?.();
  await new Promise(resolve => hangingAi.close(resolve));
});

test('timeoutFromEnv uses defaults for missing/invalid values and clamps to sane bounds', () => {
  delete process.env.UNSET_TIMEOUT_FOR_TEST;
  assert.equal(timeoutFromEnv('UNSET_TIMEOUT_FOR_TEST', 60000), 60000);
  process.env.BAD_TIMEOUT_FOR_TEST = 'abc';
  assert.equal(timeoutFromEnv('BAD_TIMEOUT_FOR_TEST', 60000), 60000);
  process.env.SMALL_TIMEOUT_FOR_TEST = '10';
  assert.equal(timeoutFromEnv('SMALL_TIMEOUT_FOR_TEST', 60000), 5000);
  process.env.BIG_TIMEOUT_FOR_TEST = '99999999';
  assert.equal(timeoutFromEnv('BIG_TIMEOUT_FOR_TEST', 60000), 300000);
});

test('review returns a clear 504 when the AI service does not answer in time', async () => {
  const started = Date.now();
  const response = await request(app).post('/api/review').set('Authorization', `Bearer ${token}`).send({
    question: 'How do you handle a production bug?',
    answer: 'I reproduce it, check logs, isolate the cause and verify the fix.'
  }).expect(504);
  assert.equal(response.body.error, 'AI review timed out');
  assert.match(response.body.message, /did not respond within 5 seconds/);
  assert.equal(response.body.mode, 'unavailable');
  assert.ok(Date.now() - started >= 4500);
});

test('question generation returns a clear 504 when the AI service does not answer in time', async () => {
  const response = await request(app).post('/api/questions').set('Authorization', `Bearer ${token}`).send({
    role: 'QA Engineer', interviewType: 'Technical', count: 3
  }).expect(504);
  assert.equal(response.body.error, 'Question generation timed out');
});

test('review returns 503 (not 504) when the AI service is unreachable', async () => {
  const previous = process.env.AI_SERVICE_URL;
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:9';
  try {
    const response = await request(app).post('/api/review').set('Authorization', `Bearer ${token}`).send({
      question: 'How do you handle a production bug?',
      answer: 'I reproduce it, check logs, isolate the cause and verify the fix.'
    }).expect(503);
    assert.equal(response.body.error, 'AI review service is unavailable');
  } finally {
    process.env.AI_SERVICE_URL = previous;
  }
});

test('API binds to 127.0.0.1 by default when HOST is not set', async () => {
  const server = await startServer();
  try {
    await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
    assert.equal(server.address().address, '127.0.0.1');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }
});
