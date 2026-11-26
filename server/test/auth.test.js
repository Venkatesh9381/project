import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../src/middleware/auth.js';

process.env.JWT_SECRET = 'test-only-secret-with-at-least-thirty-two-characters';
const userId = '507f1f77bcf86cd799439011';

function callMiddleware(header) {
  const req = { headers: { authorization: header ?? '' } };
  const result = { statusCode: 200, body: null, nextCalled: false };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; return this; }
  };
  requireAuth(req, res, () => { result.nextCalled = true; });
  return { req, result };
}

function createToken(payload = { sub: userId }, options = {}) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '2h',
    issuer: 'interviewos-api',
    audience: 'interviewos-client',
    ...options
  });
}

test('rejects requests without a bearer token', () => {
  const { result } = callMiddleware();
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('accepts a valid InterviewOS token and attaches a MongoDB user id', () => {
  const { req, result } = callMiddleware(`Bearer ${createToken()}`);
  assert.equal(result.nextCalled, true);
  assert.equal(req.user.id, userId);
});

test('rejects a token issued for another audience', () => {
  const { result } = callMiddleware(`Bearer ${createToken({ sub: userId }, { audience: 'another-client' })}`);
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('rejects tokens without a subject', () => {
  const { result } = callMiddleware(`Bearer ${createToken({})}`);
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('rejects non-MongoDB subject identifiers', () => {
  const { result } = callMiddleware(`Bearer ${createToken({ sub: 'user-123' })}`);
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('rejects malformed bearer tokens and extra authorization parts', () => {
  for (const header of ['Bearer not-a-jwt', `Bearer ${createToken()} extra`]) {
    const { result } = callMiddleware(header);
    assert.equal(result.statusCode, 401);
    assert.equal(result.nextCalled, false);
  }
});
