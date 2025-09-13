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
    },
    
    type(contentType: string) {
      if (!this.res.headersSent) {
        this.res.setHeader('Content-Type', contentType);
      }
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
    }
  };
  
  return context;
}
