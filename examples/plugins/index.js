import { Turbyoot } from 'turbyoot';
import { Client } from 'pg';

const app = new Turbyoot();

const databasePlugin = {
  name: 'database',
  install: async (app) => {
    app.db = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/db_name',
    });
    await app.db.connect();

    app.use(async (ctx, next) => {
      ctx.db = app.db;
      await next();
    });
  },
};

app.plugin(databasePlugin);

app.get('/users', async (ctx) => {
  const users = await ctx.db.query('SELECT * FROM users');
  ctx.json({ users: users.rows });
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
