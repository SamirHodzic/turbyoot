import { IncomingMessage } from 'http';
import { Http2ServerRequest } from 'http2';
import { Readable } from 'stream';
import { BodyParser } from '../types.js';

type RequestLike = IncomingMessage | Http2ServerRequest | Readable & { headers: Record<string, string | string[] | undefined>; method?: string | null };

export interface BodyParseOptions {
  limit?: number;
  parsers?: Record<string, BodyParser>;
}

const DEFAULT_BODY_LIMIT = 1024 * 1024;

export async function parseBody(req: RequestLike, options: BodyParseOptions = {}): Promise<any> {
  const { limit = DEFAULT_BODY_LIMIT, parsers = {} } = options;
  return new Promise((resolve, reject) => {
    let body = '';
    let bodyLength = 0;

    req.on('data', (chunk) => {
      bodyLength += chunk.length;
      if (bodyLength > limit) {
        reject(new Error(`Request body exceeds limit of ${limit} bytes`));
        return;
      }
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const rawContentType = req.headers['content-type'];
        const contentType = Array.isArray(rawContentType) ? rawContentType[0] : (rawContentType || '');
        const mimeType = contentType.split(';')[0].trim();

        const customParser = findParser(mimeType, parsers);
        if (customParser) {
          const result = await customParser(body, contentType);
          resolve(result);
          return;
        }

        if (contentType.includes('application/json')) {
          resolve(body ? JSON.parse(body) : {});
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          resolve(parseFormData(body));
        } else if (contentType.includes('text/plain')) {
          resolve(body);
        } else {
          resolve(body);
        }
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function findParser(mimeType: string, parsers: Record<string, BodyParser>): BodyParser | null {
  if (parsers[mimeType]) {
    return parsers[mimeType];
  }

  for (const pattern of Object.keys(parsers)) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(mimeType)) {
        return parsers[pattern];
      }
    }
  }

  return null;
}

function parseFormData(formData: string): Record<string, any> {
  const result: Record<string, any> = {};

  if (!formData) return result;

  const pairs = formData.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key) {
      result[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  }

  return result;
}
