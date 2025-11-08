import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

app.use(
  app.static('./files', {
    prefix: '/static',
  }),
);

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
