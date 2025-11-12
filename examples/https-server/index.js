import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Turbyoot } from 'turbyoot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Turbyoot();
const port = 3443;

app.get('/', (ctx) => {
  ctx.ok({
    message: 'Hello from HTTPS server!',
    protocol: 'HTTPS',
    timestamp: new Date().toISOString(),
  });
});

app.get('/secure', (ctx) => {
  ctx.ok({
    message: 'This is a secure endpoint',
    secure: true,
  });
});

try {
  const key = readFileSync(join(__dirname, 'key.pem'));
  const cert = readFileSync(join(__dirname, 'cert.pem'));

  app.listen(
    port,
    {
      protocol: 'https',
      https: {
        key,
        cert,
      },
    },
    () => {
      console.log(`Turyboot is running on https://localhost:${port}`);
    },
  );
} catch (error) {
  console.error('Error starting HTTPS server:', error.message);
  console.error('\nPlease generate SSL certificates first by running:');
  console.error('  openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes');
  process.exit(1);
}
