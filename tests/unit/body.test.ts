import { describe, it, expect } from '@jest/globals';
import { parseBody } from '../../src/utils/body.js';
import { EventEmitter } from 'events';
import { IncomingMessage } from 'http';

class MockIncomingMessage extends EventEmitter {
  headers: Record<string, string> = {};

  constructor(headers: Record<string, string> = {}) {
    super();
    this.headers = headers;
  }

  emitData(chunk: Buffer | string) {
    this.emit('data', chunk);
  }

  emitEnd() {
    this.emit('end');
  }

  emitError(error: Error) {
    this.emit('error', error);
  }
}

function createMockRequest(headers: Record<string, string> = {}): IncomingMessage & {
  emitData: (chunk: Buffer | string) => void;
  emitEnd: () => void;
  emitError: (error: Error) => void;
} {
  const req = new MockIncomingMessage(headers);
  return req as any;
}

describe('Body Parser', () => {
  describe('parseBody()', () => {
    it('should parse JSON body', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('{"name":"John","age":30}'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse empty JSON body as empty object', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req);
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({});
    });

    it('should parse JSON with nested objects', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('{"user":{"name":"John","address":{"city":"NYC"}}}'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({
        user: {
          name: 'John',
          address: {
            city: 'NYC'
          }
        }
      });
    });

    it('should parse JSON with arrays', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('{"items":["apple","banana","cherry"]}'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ items: ['apple', 'banana', 'cherry'] });
    });

    it('should handle multiple data chunks for JSON', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('{"name":"'));
      req.emitData(Buffer.from('John","age":'));
      req.emitData(Buffer.from('30}'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should reject invalid JSON', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('{"name":"John",invalid}'));
      req.emitEnd();

      await expect(promise).rejects.toThrow();
    });

    it('should parse form-urlencoded body', async () => {
      const req = createMockRequest({
        'content-type': 'application/x-www-form-urlencoded'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('name=John&age=30'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should parse empty form-urlencoded body', async () => {
      const req = createMockRequest({
        'content-type': 'application/x-www-form-urlencoded'
      });

      const promise = parseBody(req);
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({});
    });

    it('should URL decode form data', async () => {
      const req = createMockRequest({
        'content-type': 'application/x-www-form-urlencoded'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('name=John%20Doe&email=test%40example.com'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ name: 'John Doe', email: 'test@example.com' });
    });

    it('should handle form data with missing values', async () => {
      const req = createMockRequest({
        'content-type': 'application/x-www-form-urlencoded'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('name=John&age=&city=NYC'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ name: 'John', age: '', city: 'NYC' });
    });

    it('should handle form data with only key (no value)', async () => {
      const req = createMockRequest({
        'content-type': 'application/x-www-form-urlencoded'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('name=John&flag'));
      req.emitEnd();

      const result = await promise;
      expect(result.name).toBe('John');
      expect(result.flag).toBe('');
    });

    it('should parse text/plain body', async () => {
      const req = createMockRequest({
        'content-type': 'text/plain'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('Hello, World!'));
      req.emitEnd();

      const result = await promise;
      expect(result).toBe('Hello, World!');
    });

    it('should parse empty text/plain body', async () => {
      const req = createMockRequest({
        'content-type': 'text/plain'
      });

      const promise = parseBody(req);
      req.emitEnd();

      const result = await promise;
      expect(result).toBe('');
    });

    it('should handle multiple chunks for text/plain', async () => {
      const req = createMockRequest({
        'content-type': 'text/plain'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('Hello, '));
      req.emitData(Buffer.from('World!'));
      req.emitEnd();

      const result = await promise;
      expect(result).toBe('Hello, World!');
    });

    it('should parse body with unknown content type as string', async () => {
      const req = createMockRequest({
        'content-type': 'application/xml'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('<xml>data</xml>'));
      req.emitEnd();

      const result = await promise;
      expect(result).toBe('<xml>data</xml>');
    });

    it('should parse body without content-type header as string', async () => {
      const req = createMockRequest();

      const promise = parseBody(req);
      req.emitData(Buffer.from('some data'));
      req.emitEnd();

      const result = await promise;
      expect(result).toBe('some data');
    });

    it('should handle empty body with unknown content type', async () => {
      const req = createMockRequest({
        'content-type': 'application/xml'
      });

      const promise = parseBody(req);
      req.emitEnd();

      const result = await promise;
      expect(result).toBe('');
    });

    it('should handle request errors', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req);
      const error = new Error('Request error');
      req.emitError(error);

      await expect(promise).rejects.toThrow('Request error');
    });

    it('should handle request errors after data received', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('{"name":"John"}'));
      const error = new Error('Connection error');
      req.emitError(error);

      await expect(promise).rejects.toThrow('Connection error');
    });

    it('should handle content-type with charset', async () => {
      const req = createMockRequest({
        'content-type': 'application/json; charset=utf-8'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('{"name":"John"}'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ name: 'John' });
    });

    it('should handle form-urlencoded with charset', async () => {
      const req = createMockRequest({
        'content-type': 'application/x-www-form-urlencoded; charset=utf-8'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('name=John&age=30'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should handle content-type with mixed case in value', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('{"name":"John"}'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ name: 'John' });
    });

    it('should handle form data with special characters', async () => {
      const req = createMockRequest({
        'content-type': 'application/x-www-form-urlencoded'
      });

      const promise = parseBody(req);
      req.emitData(Buffer.from('message=Hello%20%26%20Welcome&symbol=%24%25%26'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ message: 'Hello & Welcome', symbol: '$%&' });
    });

    it('should handle large JSON body in multiple chunks', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const largeData = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` })) };
      const jsonString = JSON.stringify(largeData);
      const chunkSize = 100;

      const promise = parseBody(req);
      for (let i = 0; i < jsonString.length; i += chunkSize) {
        req.emitData(Buffer.from(jsonString.slice(i, i + chunkSize)));
      }
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual(largeData);
    });
  });
});

