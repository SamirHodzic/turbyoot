import { Turbyoot } from 'turbyoot';
import { createWriteStream, mkdir } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import formidable from 'formidable';

const app = new Turbyoot();
const uploadsDir = './uploads';

if (!existsSync(uploadsDir)) {
  mkdir(uploadsDir, { recursive: true }, () => {});
}

app.post('/upload', async (ctx) => {
  const form = formidable({
    fileWriteStreamHandler: (file) => {
      const filePath = join(uploadsDir, file.originalFilename || 'uploaded-file');
      const writeStream = createWriteStream(filePath);

      writeStream.on('finish', () => {});
      return writeStream;
    },
  });

  try {
    await form.parse(ctx.req);
    ctx.noContent();
  } catch (error) {
    ctx.internalError(error);
  }
});

app.listen(3000, () => {
  console.log('Turbyoot is running on port 3000');
});
