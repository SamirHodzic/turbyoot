import { Turbyoot } from '../dist/framework.js';

const app = new Turbyoot();

const n = parseInt(process.env.MW || '1', 10);
console.log('  %s middleware', n);

let count = n;
while (count--) {
  app.use(async (_, next) => {
    await next();
  });
}

app.get('*', async (ctx) => {
  ctx.send('Hello World');
});

app.listen(3333);
