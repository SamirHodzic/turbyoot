import { Turbyoot } from 'turbyoot';
import { readFile, readdir, stat } from 'fs/promises';
import { join, resolve, extname } from 'path';
import { existsSync } from 'fs';

const app = new Turbyoot();
const filesDir = './files';

app.get('/download/:filename', async (ctx) => {
  const filename = ctx.params.filename;
  const filePath = resolve(join(filesDir, filename));

  if (!filePath.startsWith(resolve(filesDir))) {
    ctx.forbidden();
    return;
  }

  if (!existsSync(filePath)) {
    ctx.notFound();
    return;
  }

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      ctx.notFound();
      return;
    }

    const fileContent = await readFile(filePath);
    const contentType = 'application/octet-stream';
    const downloadName = ctx.query.name || filename;

    ctx.res.setHeader('Content-Type', contentType);
    ctx.res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    ctx.res.setHeader('Content-Length', stats.size.toString());
    ctx.statusCode = 200;
    ctx.res.statusCode = 200;
    ctx.res.end(fileContent);
  } catch (error) {
    ctx.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/download', async (ctx) => {
  try {
    const files = await readdir(filesDir);
    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = join(filesDir, file);
        const stats = await stat(filePath);
        return {
          name: file,
          size: stats.size,
          url: `/download/${file}`,
        };
      }),
    );

    ctx.json({
      files: fileList,
    });
  } catch (error) {
    ctx.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
