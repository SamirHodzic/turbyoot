import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

app
  .route()
  .get('/api/users', (ctx) => {
    ctx.ok({ users: [] });
  })
  .post('/api/users', (ctx) => {
    ctx.created({ user: ctx.body });
  })
  .patch('/api/users/:id', (ctx) => {
    ctx.ok({ user: ctx.body });
  })
  .put('/api/users/:id', (ctx) => {
    ctx.ok({ user: ctx.body });
  })
  .del('/api/users/:id', (ctx) => {
    ctx.noContent();
  });

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
