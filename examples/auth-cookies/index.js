import { Turbyoot } from 'turbyoot';
import { auth, requireAuth, requireRole, requirePermission, setAuthCookie, clearAuthCookie } from 'turbyoot/middleware';
import { ValidationError, AuthenticationError } from 'turbyoot/core';

const app = new Turbyoot();

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

const tokenToUser = {};

const authOptions = {
  cookieName: 'turbyoot-auth',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax',
};

app.use(
  auth({
    ...authOptions,
    tokenExtractor: (ctx) => {
      const authHeader = ctx.req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) return authHeader;

      const cookies = ctx.req.headers.cookie || '';
      const cookieMatch = cookies.match(new RegExp(`${authOptions.cookieName}=([^;]+)`));
      if (cookieMatch) return cookieMatch[1];

      return null;
    },
    userResolver: async (token) => {
      if (!token) return null;

      try {
        const user = tokenToUser[token];
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }

        return null;
      } catch (error) {
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

  const token = `${user.email.split('@')[0]}-token`;
  tokenToUser[token] = user;

  setAuthCookie(ctx, token, authOptions, 86400);

  const { password: _, ...userWithoutPassword } = user;
  ctx.json({
    message: 'Login successful',
    user: userWithoutPassword,
    token: token,
  });
});

app.post('/auth/logout', (ctx) => {
  clearAuthCookie(ctx, authOptions);
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
