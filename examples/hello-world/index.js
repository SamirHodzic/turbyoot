import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

app.get('/hello', (ctx) => {
  ctx.ok({ message: 'Hello World' });
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
