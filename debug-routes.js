import { Turbyoot } from './dist/framework/index.js';

const app = new Turbyoot();

console.log('=== Testing Nested Groups ===');

// Test nested groups
app.group('/api/v1', (router) => {
  router.group('/users', (userRouter) => {
    userRouter.get('/', (ctx) => ctx.ok({ users: [] }));
    userRouter.post('/', (ctx) => ctx.created({ user: { id: 1, ...ctx.body } }));
    userRouter.get('/:id', (ctx) => ctx.ok({ user: { id: ctx.params.id } }));
    userRouter.put('/:id', (ctx) => ctx.ok({ user: { id: ctx.params.id, ...ctx.body } }));
    userRouter.del('/:id', (ctx) => ctx.noContent());
  });

  router.group('/posts', (postRouter) => {
    postRouter.get('/', (ctx) => ctx.ok({ posts: [] }));
    postRouter.post('/', (ctx) => ctx.created({ post: { id: 1, ...ctx.body } }));
    postRouter.get('/:id', (ctx) => ctx.ok({ post: { id: ctx.params.id } }));
    postRouter.put('/:id', (ctx) => ctx.ok({ post: { id: ctx.params.id, ...ctx.body } }));
    postRouter.del('/:id', (ctx) => ctx.noContent());

    postRouter.group('/comments', (commentRouter) => {
      commentRouter.get('/', (ctx) => ctx.ok({ comments: [] }));
      commentRouter.post('/', (ctx) => ctx.created({ comment: { id: 1, ...ctx.body } }));
      commentRouter.get('/:id', (ctx) => ctx.ok({ comment: { id: ctx.params.id } }));
      commentRouter.put('/:id', (ctx) => ctx.ok({ comment: { id: ctx.params.id, ...ctx.body } }));
      commentRouter.del('/:id', (ctx) => ctx.noContent());

      commentRouter.group('/replies', (replyRouter) => {
        replyRouter.get('/', (ctx) => ctx.ok({ replies: [] }));
        replyRouter.post('/', (ctx) => ctx.created({ reply: { id: 1, ...ctx.body } }));
        replyRouter.get('/:id', (ctx) => ctx.ok({ reply: { id: ctx.params.id } }));
        replyRouter.put('/:id', (ctx) => ctx.ok({ reply: { id: ctx.params.id, ...ctx.body } }));
        replyRouter.del('/:id', (ctx) => ctx.noContent());

        replyRouter.group('/likes', (likeRouter) => {
          likeRouter.get('/', (ctx) => ctx.ok({ likes: [] }));
          likeRouter.post('/', (ctx) => ctx.created({ like: { id: 1, ...ctx.body } }));
          likeRouter.get('/:id', (ctx) => ctx.ok({ like: { id: ctx.params.id } }));
          likeRouter.put('/:id', (ctx) => ctx.ok({ like: { id: ctx.params.id, ...ctx.body } }));
          likeRouter.del('/:id', (ctx) => ctx.noContent());
        });
      });
    });
  });
});

console.log('=== Routes registered ===');
console.log('Total routes:', app.routes || 'No routes property');

// Start server to test
const port = 3005;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Test these URLs:');
  console.log('- http://localhost:3005/api/users');
  console.log('- http://localhost:3005/v1/health');
  console.log('- http://localhost:3005/admin/users');
});
