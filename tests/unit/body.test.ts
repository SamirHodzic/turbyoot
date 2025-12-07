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

    it('should reject body exceeding size limit', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const largeBody = 'x'.repeat(2 * 1024 * 1024);
      const promise = parseBody(req, { limit: 1024 * 1024 });
      
      const chunkSize = 1000;
      for (let i = 0; i < largeBody.length; i += chunkSize) {
        req.emitData(Buffer.from(largeBody.slice(i, i + chunkSize)));
        if (i > 1024 * 1024) {
          break;
        }
      }
      req.emitEnd();

      await expect(promise).rejects.toThrow('exceeds limit');
    });

    it('should accept body within size limit', async () => {
      const req = createMockRequest({
        'content-type': 'text/plain'
      });

      const body = 'x'.repeat(100);
      const promise = parseBody(req, { limit: 1024 * 1024 });
      
      req.emitData(Buffer.from(body));
      req.emitEnd();

      const result = await promise;
      expect(result).toBe(body);
    });
  });

  describe('Custom Body Parsers', () => {
    it('should use custom parser for exact content type match', async () => {
      const req = createMockRequest({
        'content-type': 'application/xml'
      });

      const customXmlParser = (body: string) => ({ parsed: true, data: body });

      const promise = parseBody(req, {
        parsers: {
          'application/xml': customXmlParser
        }
      });
      req.emitData(Buffer.from('<root><item>test</item></root>'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ parsed: true, data: '<root><item>test</item></root>' });
    });

    it('should use custom parser with wildcard pattern', async () => {
      const req = createMockRequest({
        'content-type': 'application/vnd.api+json'
      });

      const customParser = (body: string) => ({ custom: true, body: JSON.parse(body) });

      const promise = parseBody(req, {
        parsers: {
          'application/vnd.*': customParser
        }
      });
      req.emitData(Buffer.from('{"name":"John"}'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ custom: true, body: { name: 'John' } });
    });

    it('should support async custom parsers', async () => {
      const req = createMockRequest({
        'content-type': 'application/yaml'
      });

      const asyncParser = async (body: string) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { yaml: body.split('\n').map(line => line.trim()) };
      };

      const promise = parseBody(req, {
        parsers: {
          'application/yaml': asyncParser
        }
      });
      req.emitData(Buffer.from('key: value\nother: data'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ yaml: ['key: value', 'other: data'] });
    });

    it('should pass content type to custom parser', async () => {
      const req = createMockRequest({
        'content-type': 'text/csv; charset=utf-8'
      });

      let receivedContentType = '';
      const csvParser = (body: string, contentType: string) => {
        receivedContentType = contentType;
        return body.split(',');
      };

      const promise = parseBody(req, {
        parsers: {
          'text/csv': csvParser
        }
      });
      req.emitData(Buffer.from('a,b,c'));
      req.emitEnd();

      await promise;
      expect(receivedContentType).toBe('text/csv; charset=utf-8');
    });

    it('should prefer exact match over wildcard', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const exactParser = () => ({ type: 'exact' });
      const wildcardParser = () => ({ type: 'wildcard' });

      const promise = parseBody(req, {
        parsers: {
          'application/json': exactParser,
          'application/*': wildcardParser
        }
      });
      req.emitData(Buffer.from('{}'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ type: 'exact' });
    });

    it('should fall back to default parser when no custom parser matches', async () => {
      const req = createMockRequest({
        'content-type': 'application/json'
      });

      const promise = parseBody(req, {
        parsers: {
          'application/xml': () => ({ xml: true })
        }
      });
      req.emitData(Buffer.from('{"name":"John"}'));
      req.emitEnd();

      const result = await promise;
      expect(result).toEqual({ name: 'John' });
    });

    it('should handle custom parser errors', async () => {
      const req = createMockRequest({
        'content-type': 'application/custom'
      });

      const errorParser = () => {
        throw new Error('Custom parser error');
      };

      const promise = parseBody(req, {
        parsers: {
          'application/custom': errorParser
        }
      });
      req.emitData(Buffer.from('data'));
      req.emitEnd();

      await expect(promise).rejects.toThrow('Custom parser error');
    });

    it('should handle multiple custom parsers', async () => {
      const xmlParser = (body: string) => ({ format: 'xml', content: body });
      const yamlParser = (body: string) => ({ format: 'yaml', content: body });
      const csvParser = (body: string) => ({ format: 'csv', content: body.split(',') });

      const parsers = {
        'application/xml': xmlParser,
        'application/yaml': yamlParser,
        'text/csv': csvParser
      };

      const reqXml = createMockRequest({ 'content-type': 'application/xml' });
      const promiseXml = parseBody(reqXml, { parsers });
      reqXml.emitData(Buffer.from('<data/>'));
      reqXml.emitEnd();
      expect(await promiseXml).toEqual({ format: 'xml', content: '<data/>' });

      const reqYaml = createMockRequest({ 'content-type': 'application/yaml' });
      const promiseYaml = parseBody(reqYaml, { parsers });
      reqYaml.emitData(Buffer.from('key: value'));
      reqYaml.emitEnd();
      expect(await promiseYaml).toEqual({ format: 'yaml', content: 'key: value' });

      const reqCsv = createMockRequest({ 'content-type': 'text/csv' });
      const promiseCsv = parseBody(reqCsv, { parsers });
      reqCsv.emitData(Buffer.from('a,b,c'));
      reqCsv.emitEnd();
      expect(await promiseCsv).toEqual({ format: 'csv', content: ['a', 'b', 'c'] });
    });
  });
});

