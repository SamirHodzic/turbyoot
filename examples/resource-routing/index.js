import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

app.resource('users', {
  prefix: '/api',
  handlers: {
    index: (ctx) => ctx.ok({ users: [] }),
    show: (ctx) => ctx.ok({ user: { id: ctx.params.id } }),
    create: (ctx) => ctx.created({ user: ctx.body }),
    update: (ctx) => ctx.ok({ user: { id: ctx.params.id, ...ctx.body } }),
    destroy: (ctx) => ctx.noContent(),
  },
});

app.resource('posts', {
  prefix: '/api',
  middleware: [],
  only: ['index', 'show', 'create'],
  handlers: {
    index: (ctx) => ctx.ok({ posts: [] }),
    show: (ctx) => ctx.ok({ post: { id: ctx.params.id } }),
    create: (ctx) => ctx.created({ post: ctx.body }),
  },
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
