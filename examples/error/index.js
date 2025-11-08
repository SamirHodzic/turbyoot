import { Turbyoot } from 'turbyoot';
import { errorHandler, HttpError } from 'turbyoot/core';

const app = new Turbyoot();

app.use(errorHandler());

app.get('/error', (ctx) => {
  throw new HttpError(400, 'Something went wrong');
});

app.get('/server-error', (ctx) => {
  throw new Error('Internal server error');
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
