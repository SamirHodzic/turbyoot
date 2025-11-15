export interface SanitizeOptions {
  removeHtml?: boolean;
  maxDepth?: number;
}

function isPrototypePollutionKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function sanitizeString(value: string, options: SanitizeOptions = {}): string {
  const { removeHtml = true } = options;
  let sanitized = value;

  if (removeHtml) {
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '');
  }

  return sanitized;
}

function sanitizeValue(value: any, options: SanitizeOptions = {}, depth: number = 0): any {
  const { maxDepth = 10 } = options;

  if (depth > maxDepth) {
    return value;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value, options);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, options, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        if (isPrototypePollutionKey(key)) {
          continue;
        }
        const sanitizedKey = typeof key === 'string' ? sanitizeString(key, options) : key;
        if (isPrototypePollutionKey(sanitizedKey)) {
          continue;
        }
        sanitized[sanitizedKey] = sanitizeValue(value[key], options, depth + 1);
      }
    }
    return sanitized;
  }

  return value;
}

export function sanitize(data: any, options: SanitizeOptions = {}): any {
  return sanitizeValue(data, options, 0);
}

