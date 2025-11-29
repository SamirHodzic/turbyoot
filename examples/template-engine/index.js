import { Turbyoot } from 'turbyoot';
import ejs from 'ejs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Turbyoot();

app.configure({
  views: {
    views: join(__dirname, 'views'),
    engine: 'ejs',
    engines: {
      ejs: ejs.renderFile,
    },
    cache: false,
  },
});

app.get('/', async (ctx) => {
  await ctx.render('index', {
    title: 'Turbyoot Template Engine',
    message: 'Hello from EJS!',
    items: ['Item 1', 'Item 2', 'Item 3'],
  });
});

app.get('/user/:name', async (ctx) => {
  await ctx.render('user', {
    title: 'User Profile',
    name: ctx.params.name,
    email: `${ctx.params.name}@example.com`,
  });
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});

