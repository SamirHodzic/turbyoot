import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Turbyoot } from 'turbyoot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Turbyoot();
const port = 3444;

app.get('/', (ctx) => {
  ctx.ok({
    message: 'Hello from HTTP/2 server!',
    protocol: 'HTTP/2',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/data', (ctx) => {
  ctx.ok({
    data: [1, 2, 3, 4, 5],
    protocol: 'HTTP/2',
  });
});

try {
  const key = readFileSync(join(__dirname, 'key.pem'));
  const cert = readFileSync(join(__dirname, 'cert.pem'));

  app.listen(
    port,
    {
      protocol: 'http2',
      https: {
        key,
        cert,
      },
      http2: {
        allowHTTP1: true,
        settings: {
          enablePush: true,
          initialWindowSize: 65535,
        },
      },
    },
    () => {
      console.log(`Turbyootis running on https://localhost:${port}`);
    },
  );
} catch (error) {
  console.error('Error starting HTTP/2 server:', error.message);
  console.error('\nPlease generate SSL certificates first by running:');
  console.error('  openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes');
  process.exit(1);
}
