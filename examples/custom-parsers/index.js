import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

app.configure({
  body: {
    parsers: {
      'text/csv': (body) => {
        const lines = body.trim().split('\n');
        const headers = lines[0].split(',').map((h) => h.trim());
        return lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim());
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i] || '';
            return obj;
          }, {});
        });
      },

      'application/x-ndjson': (body) => {
        return body
          .trim()
          .split('\n')
          .filter((line) => line)
          .map((line) => JSON.parse(line));
      },
    },
  },
});

app.post('/csv', (ctx) => {
  ctx.ok({ parsed: ctx.body });
});

app.post('/ndjson', (ctx) => {
  ctx.ok({ parsed: ctx.body });
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
  console.log(`curl -X POST http://localhost:3000/csv -H "Content-Type: text/csv" -d $'name,age\\nJohn,30\\nJane,25'`);
  console.log(`curl -X POST http://localhost:3000/ndjson -H "Content-Type: application/x-ndjson" -d $'{"id":1}\\n{"id":2}'`);
});
