import { IncomingMessage } from 'http';

export async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const contentType = req.headers['content-type'] || '';

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
