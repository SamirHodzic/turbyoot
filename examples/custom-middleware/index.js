import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

app.use(async (ctx, next) => {
  console.log(`Request: ${ctx.req.method} ${ctx.req.url}`);
  await next();
  console.log(`Response: ${ctx.res.statusCode}`);
});

app.get('/users', (ctx) => {
  ctx.json({ users: [] });
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
