import { Turbyoot } from 'turbyoot';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  RateLimitError,
  InternalError,
} from 'turbyoot/core';

const app = new Turbyoot();

app.get('/validation-error', (ctx) => {
  throw ValidationError.fields([
    { field: 'email', message: 'Invalid email format' },
    { field: 'age', message: 'Must be at least 18' },
  ]);
});

app.get('/validation-required', (ctx) => {
  throw ValidationError.required('username');
});

app.get('/auth-error', (ctx) => {
  throw new AuthenticationError('Please log in to continue');
});

app.get('/token-expired', (ctx) => {
  throw AuthenticationError.tokenExpired();
});

app.get('/forbidden', (ctx) => {
  throw AuthorizationError.insufficientPermissions(['admin', 'moderator']);
});

app.get('/not-found', (ctx) => {
  throw NotFoundError.resource('User', '123');
});

app.get('/conflict', (ctx) => {
  throw ConflictError.resourceExists('User', 'john@example.com');
});

app.get('/bad-request', (ctx) => {
  throw BadRequestError.invalidJson('Unexpected token at position 42');
});

app.get('/rate-limit', (ctx) => {
  throw new RateLimitError('Too many requests', {
    retryAfter: 60,
    limit: 100,
    remaining: 0,
  });
});

app.get('/internal-error', (ctx) => {
  throw new InternalError('Database connection failed');
});

app.get('/unhandled', (ctx) => {
  throw new Error('This is an unhandled error');
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
