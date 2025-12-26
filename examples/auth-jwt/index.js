import { Turbyoot } from 'turbyoot';
import { auth, requireAuth, requireRole, requirePermission } from 'turbyoot/middleware';
import { ValidationError, AuthenticationError } from 'turbyoot/core';
import jwt from 'jsonwebtoken';

const app = new Turbyoot();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '24h';

const userDatabase = {
  'admin@example.com': {
    id: '1',
    email: 'admin@example.com',
    password: 'admin123',
    roles: ['admin', 'user'],
    permissions: ['read:all', 'write:all'],
  },
  'user@example.com': {
    id: '2',
    email: 'user@example.com',
    password: 'user123',
    roles: ['user'],
    permissions: ['read:own'],
  },
};

app.use(
  auth({
    tokenExtractor: (ctx) => {
      return ctx.req.headers.authorization?.replace('Bearer ', '') || null;
    },
    userResolver: async (token) => {
      if (!token) return null;

      try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (!payload || !payload.email) return null;

        const user = userDatabase[payload.email];
        if (!user) return null;

        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return null;
        }
        return null;
      }
    },
  }),
);

app.post('/auth/login', async (ctx) => {
  const { email, password } = ctx.body;

  if (!email || !password) {
    throw ValidationError.fields([
      ...(!email ? [{ field: 'email', message: 'Email is required' }] : []),
      ...(!password ? [{ field: 'password', message: 'Password is required' }] : []),
    ]);
  }

  const user = userDatabase[email];
  if (!user || user.password !== password) {
    throw AuthenticationError.invalidCredentials();
  }

  const payload = {
    id: user.id,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  const { password: _, ...userWithoutPassword } = user;
  ctx.json({
    message: 'Login successful',
    user: userWithoutPassword,
    token: token,
  });
});

app.post('/auth/logout', requireAuth(), (ctx) => {
  ctx.json({ message: 'Logout successful' });
});

app.get('/auth/me', requireAuth(), (ctx) => {
  ctx.json({ user: ctx.state.user });
});

app.get('/protected', requireAuth(), (ctx) => {
  ctx.json({ user: ctx.state.user });
});

app.get('/admin', requireRole('admin'), (ctx) => {
  ctx.json({ message: 'Admin only' });
});

app.get('/read-data', requirePermission('read:all'), (ctx) => {
  ctx.json({ data: 'sensitive data' });
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
