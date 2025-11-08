import { Turbyoot } from 'turbyoot';
import { validate, validateQuery } from 'turbyoot/middleware';

const app = new Turbyoot();

app.post(
  '/users',
  validate({
    schema: {
      body: {
        name: { required: true, type: 'string', minLength: 2 },
        email: {
          required: true,
          type: 'string',
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        age: { type: 'number', min: 0, max: 120 },
      },
    },
  }),
  (ctx) => {
    ctx.json({ message: 'User created', user: ctx.body });
  },
);

app.get(
  '/search',
  validateQuery({
    q: { required: true, type: 'string', minLength: 2 },
    page: { type: 'number', min: 1 },
    limit: { type: 'number', min: 1, max: 100 },
  }),
  (ctx) => {
    ctx.json({ results: [], query: ctx.query });
  },
);

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
