import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../src/middleware/auth.js';

process.env.JWT_SECRET = 'test-only-secret-with-at-least-thirty-two-characters';

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

test('rejects requests without a bearer token', () => {
  const { result } = callMiddleware();
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('accepts a valid InterviewOS token and attaches the user id', () => {
  const token = jwt.sign({ sub: 'user-123' }, process.env.JWT_SECRET, {
    expiresIn: '2h', issuer: 'interviewos-api', audience: 'interviewos-client'
  });
  const { req, result } = callMiddleware(`Bearer ${token}`);
  assert.equal(result.nextCalled, true);
  assert.equal(req.user.id, 'user-123');
});

test('rejects a token issued for another audience', () => {
  const token = jwt.sign({ sub: 'user-123' }, process.env.JWT_SECRET, {
    expiresIn: '2h', issuer: 'interviewos-api', audience: 'another-client'
  });
  const { result } = callMiddleware(`Bearer ${token}`);
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('rejects malformed bearer tokens', () => {
  const { result } = callMiddleware('Bearer not-a-jwt');
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});
