import { IncomingMessage, ServerResponse } from 'http';
import { Context } from './types.js';

// Create context object
export function createContext(req: IncomingMessage, res: ServerResponse, params: Record<string, string> = {}, query: Record<string, any> = {}, body: any = null): Context {
  const context: Context = {
    req,
    res,
    params,
    query,
    body,
    statusCode: 200,
    state: {},
    
    json(data: any) {
      if (!this.res.headersSent) {
        this.res.setHeader('Content-Type', 'application/json');
        this.res.end(JSON.stringify(data));
      }
      return this;
    },
    
    status(code: number) {
      this.statusCode = code;
      if (!this.res.headersSent) {
        this.res.statusCode = code;
      }
      return this;
    },
    
    redirect(url: string, status: number = 302) {
      if (!this.res.headersSent) {
        this.res.statusCode = status;
        this.res.setHeader('Location', url);
        this.res.end();
      }
      return this;
    },
    
    type(contentType: string) {
      if (!this.res.headersSent) {
        this.res.setHeader('Content-Type', contentType);
      }
      return this;
    },
    
    send(data: any) {
      if (!this.res.headersSent) {
        if (typeof data === 'string') {
          this.res.setHeader('Content-Type', 'text/plain');
          this.res.end(data);
        } else if (Buffer.isBuffer(data)) {
          this.res.end(data);
        } else {
          this.json(data);
        }
      }
      return this;
    },

    // New intuitive response methods
    ok(data?: any) {
      this.statusCode = 200;
      if (!this.res.headersSent) {
        this.res.statusCode = 200;
        if (data !== undefined) {
          this.json(data);
        } else {
          this.res.end();
        }
      }
      return this;
    },

    created(data?: any) {
      this.statusCode = 201;
      if (!this.res.headersSent) {
        this.res.statusCode = 201;
        if (data !== undefined) {
          this.json(data);
        } else {
          this.res.end();
        }
      }
      return this;
    },

    noContent() {
      this.statusCode = 204;
      if (!this.res.headersSent) {
        this.res.statusCode = 204;
        this.res.end();
      }
      return this;
    },

    badRequest(message: string = 'Bad Request') {
      this.statusCode = 400;
      if (!this.res.headersSent) {
        this.res.statusCode = 400;
        this.json({ error: message, status: 400 });
      }
      return this;
    },

    unauthorized(message: string = 'Unauthorized') {
      this.statusCode = 401;
      if (!this.res.headersSent) {
        this.res.statusCode = 401;
        this.json({ error: message, status: 401 });
      }
      return this;
    },

    forbidden(message: string = 'Forbidden') {
      this.statusCode = 403;
      if (!this.res.headersSent) {
        this.res.statusCode = 403;
        this.json({ error: message, status: 403 });
      }
      return this;
    },

    notFound(message: string = 'Not Found') {
      this.statusCode = 404;
      if (!this.res.headersSent) {
        this.res.statusCode = 404;
        this.json({ error: message, status: 404 });
      }
      return this;
    },

    conflict(message: string = 'Conflict') {
      this.statusCode = 409;
      if (!this.res.headersSent) {
        this.res.statusCode = 409;
        this.json({ error: message, status: 409 });
      }
      return this;
    },

    unprocessableEntity(message: string = 'Unprocessable Entity') {
      this.statusCode = 422;
      if (!this.res.headersSent) {
        this.res.statusCode = 422;
        this.json({ error: message, status: 422 });
      }
      return this;
    },

    tooManyRequests(message: string = 'Too Many Requests') {
      this.statusCode = 429;
      if (!this.res.headersSent) {
        this.res.statusCode = 429;
        this.json({ error: message, status: 429 });
      }
      return this;
    },

    internalError(message: string = 'Internal Server Error') {
      this.statusCode = 500;
      if (!this.res.headersSent) {
        this.res.statusCode = 500;
        this.json({ error: message, status: 500 });
      }
      return this;
    },

    // Convenience methods
    header(name: string, value: string) {
      if (!this.res.headersSent) {
        this.res.setHeader(name, value);
      }
      return this;
    },

    cookie(name: string, value: string, options: any = {}) {
      if (!this.res.headersSent) {
        const cookieString = `${name}=${value}${options.maxAge ? `; Max-Age=${options.maxAge}` : ''}${options.httpOnly ? '; HttpOnly' : ''}${options.secure ? '; Secure' : ''}${options.sameSite ? `; SameSite=${options.sameSite}` : ''}`;
        this.res.setHeader('Set-Cookie', cookieString);
      }
      return this;
    },

    clearCookie(name: string, options: any = {}) {
      if (!this.res.headersSent) {
        const cookieString = `${name}=; Max-Age=0${options.httpOnly ? '; HttpOnly' : ''}${options.secure ? '; Secure' : ''}${options.sameSite ? `; SameSite=${options.sameSite}` : ''}`;
        this.res.setHeader('Set-Cookie', cookieString);
      }
      return this;
    },

    // Request helpers
    is(mimeType: string): boolean {
      const contentType = this.req.headers['content-type'] || '';
      return contentType.includes(mimeType);
    },

    accepts(types: string[]): string | false {
      const accept = this.req.headers.accept || '';
      for (const type of types) {
        if (accept.includes(type)) {
          return type;
        }
      }
      return false;
    },

    get(field: string): string | undefined {
      return this.req.headers[field.toLowerCase()] as string;
    }
  };
  
  return context;
}
