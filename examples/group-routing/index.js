import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

app.group('/api', (router) => {
  // mapping to /api/users
  router.group('/users', (userRouter) => {
    userRouter.get('/', (ctx) => ctx.ok({ users: [] }));
    userRouter.post('/', (ctx) => ctx.created({ user: { id: 1, ...ctx.body } }));
  });

  // mapping to /api/posts
  router.group('/posts', (pRouter) => {
    pRouter.get('/', (ctx) => ctx.ok({ posts: [] }));
    pRouter.get('/:postId', (ctx) => ctx.ok({ post: { id: ctx.params.postId } }));

    // mapping with resource routing to /api/posts/:id/comments
    pRouter.resource('/:postId/comments', {
      handlers: {
        index: async (ctx) => {
          ctx.ok({ comments: [] });
        },
        show: async (ctx) => {
          ctx.ok({ comment: { id: ctx.params.id } });
        },
      },
    });
  });
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
