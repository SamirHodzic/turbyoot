import { describe, it, expect } from '@jest/globals';
import { parseQueryParams } from '../../src/framework/utils/query.js';

describe('Query Parser', () => {
  describe('Basic Parsing', () => {
    it('should parse simple query string', () => {
      const result = parseQueryParams('name=John&age=30');
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should return empty object for empty string', () => {
      const result = parseQueryParams('');
      expect(result).toEqual({});
    });

    it('should handle keys without values', () => {
      const result = parseQueryParams('key1&key2=value');
      expect(result).toEqual({ key1: '', key2: 'value' });
    });

    it('should handle URL-encoded values', () => {
      const result = parseQueryParams('name=John%20Doe&city=New%20York');
      expect(result).toEqual({ name: 'John Doe', city: 'New York' });
    });
  });

  describe('parseNumbers', () => {
    it('should parse numeric strings as numbers by default', () => {
      const result = parseQueryParams('age=30&count=100');
      expect(result).toEqual({ age: 30, count: 100 });
    });

    it('should keep as strings when parseNumbers is false', () => {
      const result = parseQueryParams('age=30&count=100', { parseNumbers: false });
      expect(result).toEqual({ age: '30', count: '100' });
    });

    it('should handle decimal numbers', () => {
      const result = parseQueryParams('price=19.99&tax=0.08');
      expect(result).toEqual({ price: 19.99, tax: 0.08 });
    });

    it('should not parse non-numeric strings', () => {
      const result = parseQueryParams('name=John&age=30abc');
      expect(result).toEqual({ name: 'John', age: '30abc' });
    });
  });

  describe('parseBooleans', () => {
    it('should parse boolean strings as booleans by default', () => {
      const result = parseQueryParams('active=true&disabled=false');
      expect(result).toEqual({ active: true, disabled: false });
    });

    it('should keep as strings when parseBooleans is false', () => {
      const result = parseQueryParams('active=true&disabled=false', { parseBooleans: false });
      expect(result).toEqual({ active: 'true', disabled: 'false' });
    });
  });

  describe('parseArrays', () => {
    it('should parse bracket notation arrays', () => {
      const result = parseQueryParams('tags[]=js&tags[]=ts&tags[]=node', { arrayFormat: 'brackets' });
      expect(result).toEqual({ tags: ['js', 'ts', 'node'] });
    });

    it('should parse indices notation arrays', () => {
      const result = parseQueryParams('tags[0]=js&tags[1]=ts&tags[2]=node', { arrayFormat: 'indices' });
      expect(result).toEqual({ tags: ['js', 'ts', 'node'] });
    });

    it('should parse repeat format arrays', () => {
      const result = parseQueryParams('tags=js&tags=ts&tags=node', { arrayFormat: 'repeat', parseArrays: true });
      expect(result).toEqual({ tags: ['js', 'ts', 'node'] });
    });

    it('should not parse arrays when parseArrays is false', () => {
      const result = parseQueryParams('tags[]=js&tags[]=ts', { parseArrays: false });
      expect(result).toEqual({ 'tags[]': ['js', 'ts'] });
    });
  });

  describe('arrayLimit', () => {
    it('should limit array size to arrayLimit', () => {
      const result = parseQueryParams('tags[]=a&tags[]=b&tags[]=c&tags[]=d', { arrayLimit: 2, arrayFormat: 'brackets' });
      expect(result).toEqual({ tags: ['a', 'b'] });
    });

    it('should limit indices arrays to arrayLimit', () => {
      const result = parseQueryParams('tags[0]=a&tags[1]=b&tags[2]=c', { arrayLimit: 2, arrayFormat: 'indices' });
      expect(result).toEqual({ tags: ['a', 'b'] });
    });

    it('should limit repeat format arrays to arrayLimit', () => {
      const result = parseQueryParams('tags=a&tags=b&tags=c&tags=d', { arrayFormat: 'repeat', parseArrays: true, arrayLimit: 2 });
      expect(result).toEqual({ tags: ['a', 'b'] });
    });
  });

  describe('strictNullHandling', () => {
    it('should parse "null" as null when strictNullHandling is true', () => {
      const result = parseQueryParams('value=null', { strictNullHandling: true });
      expect(result).toEqual({ value: null });
    });

    it('should parse "null" as null by default', () => {
      const result = parseQueryParams('value=null');
      expect(result).toEqual({ value: null });
    });

    it('should parse "undefined" as undefined', () => {
      const result = parseQueryParams('value=undefined');
      expect(result).toEqual({ value: undefined });
    });
  });

  describe('skipNulls', () => {
    it('should skip null values when skipNulls is true', () => {
      const result = parseQueryParams('a=1&b=&c=2', { skipNulls: true });
      expect(result).toEqual({ a: 1, c: 2 });
    });

    it('should skip null strings when skipNulls is true', () => {
      const result = parseQueryParams('a=1&b=null&c=2', { skipNulls: true, strictNullHandling: true });
      expect(result).toEqual({ a: 1, c: 2 });
    });

    it('should include null values when skipNulls is false', () => {
      const result = parseQueryParams('a=1&b=&c=2', { skipNulls: false });
      expect(result).toEqual({ a: 1, b: '', c: 2 });
    });
  });

  describe('comma option', () => {
    it('should parse comma-separated arrays when comma is true', () => {
      const result = parseQueryParams('tags=js,ts,node', { comma: true });
      expect(result).toEqual({ tags: ['js', 'ts', 'node'] });
    });

    it('should use custom separator with comma option', () => {
      const result = parseQueryParams('tags=js|ts|node', { comma: true, arrayFormatSeparator: '|' });
      expect(result).toEqual({ tags: ['js', 'ts', 'node'] });
    });

    it('should parse numbers in comma-separated arrays', () => {
      const result = parseQueryParams('numbers=1,2,3', { comma: true, parseNumbers: true });
      expect(result).toEqual({ numbers: [1, 2, 3] });
    });

    it('should not parse comma-separated when comma is false', () => {
      const result = parseQueryParams('tags=js,ts,node', { comma: false });
      expect(result).toEqual({ tags: 'js,ts,node' });
    });
  });

  describe('arrayFormatSeparator', () => {
    it('should use custom separator for comma arrays', () => {
      const result = parseQueryParams('tags=js;ts;node', { comma: true, arrayFormatSeparator: ';' });
      expect(result).toEqual({ tags: ['js', 'ts', 'node'] });
    });
  });

  describe('allowSparse', () => {
    it('should create sparse arrays when allowSparse is true', () => {
      const result = parseQueryParams('arr[0]=a&arr[5]=b', { arrayFormat: 'indices', allowSparse: true });
      expect(result.arr).toHaveLength(6);
      expect(result.arr[0]).toBe('a');
      expect(result.arr[5]).toBe('b');
      expect(result.arr[1]).toBeUndefined();
    });

    it('should fill arrays when allowSparse is false', () => {
      const result = parseQueryParams('arr[0]=a&arr[5]=b', { arrayFormat: 'indices', allowSparse: false });
      expect(result.arr).toHaveLength(6);
      expect(result.arr[0]).toBe('a');
      expect(result.arr[5]).toBe('b');
    });
  });

  describe('allowPrototypes', () => {
    it('should prevent prototype pollution by default', () => {
      const result = parseQueryParams('__proto__=polluted&constructor=polluted&prototype=polluted');
      expect(result).toEqual({});
    });

    it('should allow prototype keys when allowPrototypes is true', () => {
      const result = parseQueryParams('__proto__=polluted', { allowPrototypes: true });
      expect(result).toEqual({ __proto__: 'polluted' });
    });

    it('should prevent prototype pollution in nested keys', () => {
      const result = parseQueryParams('obj.__proto__.polluted=true', { allowDots: true });
      expect(result).toEqual({ obj: {} });
    });
  });

  describe('plainObjects', () => {
    it('should return plain object when plainObjects is true', () => {
      const result = parseQueryParams('key=value', { plainObjects: true });
      expect(result).toEqual({ key: 'value' });
      expect(Object.getPrototypeOf(result)).toBeNull();
    });

    it('should return regular object when plainObjects is false', () => {
      const result = parseQueryParams('key=value', { plainObjects: false });
      expect(result).toEqual({ key: 'value' });
      expect(Object.getPrototypeOf(result)).not.toBeNull();
    });
  });

  describe('charsetSentinel', () => {
    it('should remove charset sentinel when charsetSentinel is true', () => {
      const result = parseQueryParams('utf8=%E2%9C%93&q=test', { charsetSentinel: true });
      expect(result).toEqual({ q: 'test' });
    });

    it('should keep charset sentinel when charsetSentinel is false', () => {
      const result = parseQueryParams('utf8=%E2%9C%93&q=test', { charsetSentinel: false });
      expect(result).toHaveProperty('utf8');
      expect(result).toHaveProperty('q');
    });
  });

  describe('interpretNumericEntities', () => {
    it('should decode numeric entities when interpretNumericEntities is true', () => {
      const customDecoder = (str: string) => {
        return str.replace(/%([0-9A-F]{2})/gi, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
      };
      const result = parseQueryParams('text=%48%65%6C%6C%6F', { 
        interpretNumericEntities: true,
        decoder: customDecoder
      });
      expect(result.text).toBe('Hello');
    });
  });

  describe('sortFn', () => {
    it('should sort keys when sortFn is provided', () => {
      const result = parseQueryParams('z=1&a=2&m=3', { 
        sortFn: (a, b) => a.localeCompare(b)
      });
      const keys = Object.keys(result);
      expect(keys).toEqual(['a', 'm', 'z']);
    });

    it('should maintain insertion order when sortFn is not provided', () => {
      const result = parseQueryParams('z=1&a=2&m=3');
      const keys = Object.keys(result);
      expect(keys).toEqual(['z', 'a', 'm']);
    });
  });

  describe('validate', () => {
    it('should filter values using validate function', () => {
      const result = parseQueryParams('a=1&b=2&c=3', {
        validate: (key, value) => key !== 'b'
      });
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should filter values based on value content', () => {
      const result = parseQueryParams('name=John&age=30&age=invalid', {
        validate: (key, value) => {
          if (key === 'age') {
            const num = Number(value);
            return !isNaN(num) && isFinite(num);
          }
          return true;
        },
        parseNumbers: true,
        duplicates: 'last'
      });
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
    });
  });

  describe('allowDots', () => {
    it('should create nested objects when allowDots is true', () => {
      const result = parseQueryParams('user.name=John&user.age=30', { allowDots: true });
      expect(result).toEqual({ user: { name: 'John', age: 30 } });
    });

    it('should not create nested objects when allowDots is false', () => {
      const result = parseQueryParams('user.name=John&user.age=30', { allowDots: false });
      expect(result).toEqual({ 'user.name': 'John', 'user.age': 30 });
    });

    it('should respect depth limit', () => {
      const result = parseQueryParams('a.b.c.d.e=value', { allowDots: true, depth: 3 });
      expect(result).toEqual({});
    });
  });

  describe('duplicates', () => {
    it('should combine duplicate keys by default', () => {
      const result = parseQueryParams('key=value1&key=value2');
      expect(result).toEqual({ key: ['value1', 'value2'] });
    });

    it('should keep first value when duplicates is "first"', () => {
      const result = parseQueryParams('key=value1&key=value2', { duplicates: 'first' });
      expect(result).toEqual({ key: 'value1' });
    });

    it('should keep last value when duplicates is "last"', () => {
      const result = parseQueryParams('key=value1&key=value2', { duplicates: 'last' });
      expect(result).toEqual({ key: 'value2' });
    });

    it('should combine into array when duplicates is "combine"', () => {
      const result = parseQueryParams('key=value1&key=value2&key=value3', { duplicates: 'combine' });
      expect(result).toEqual({ key: ['value1', 'value2', 'value3'] });
    });
  });

  describe('allowEmptyArrays', () => {
    it('should allow empty array values when allowEmptyArrays is true', () => {
      const result = parseQueryParams('tags[]=', { arrayFormat: 'brackets', allowEmptyArrays: true });
      expect(result).toEqual({ tags: [''] });
    });

    it('should skip empty array values when allowEmptyArrays is false', () => {
      const result = parseQueryParams('tags[]=', { arrayFormat: 'brackets', allowEmptyArrays: false });
      expect(result).toEqual({ tags: [] });
    });
  });

  describe('parameterLimit', () => {
    it('should limit number of parameters parsed', () => {
      const result = parseQueryParams('a=1&b=2&c=3&d=4&e=5', { parameterLimit: 3 });
      expect(Object.keys(result).length).toBeLessThanOrEqual(3);
    });
  });

  describe('delimiter', () => {
    it('should use custom delimiter', () => {
      const result = parseQueryParams('a=1;b=2;c=3', { delimiter: ';' });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should support regex delimiter', () => {
      const result = parseQueryParams('a=1|b=2|c=3', { delimiter: /[|;]/ });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('ignoreQueryPrefix', () => {
    it('should ignore leading question mark when ignoreQueryPrefix is true', () => {
      const result = parseQueryParams('?name=John&age=30', { ignoreQueryPrefix: true });
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should not ignore leading question mark when ignoreQueryPrefix is false', () => {
      const result = parseQueryParams('?name=John&age=30', { ignoreQueryPrefix: false });
      expect(result).toHaveProperty('?name');
    });
  });

  describe('decoder', () => {
    it('should use custom decoder function', () => {
      const customDecoder = (str: string) => str.toUpperCase();
      const result = parseQueryParams('name=john', { decoder: customDecoder });
      expect(result).toEqual({ NAME: 'JOHN' });
    });
  });

  describe('parseValues', () => {
    it('should parse values when parseValues is true', () => {
      const result = parseQueryParams('num=123&bool=true', { parseValues: true });
      expect(result).toEqual({ num: 123, bool: true });
    });

    it('should keep values as strings when parseValues is false', () => {
      const result = parseQueryParams('num=123&bool=true', { parseValues: false });
      expect(result).toEqual({ num: '123', bool: 'true' });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed array formats', () => {
      const result = parseQueryParams('tags[]=js&tags[]=ts&numbers=1,2,3', {
        arrayFormat: 'brackets',
        comma: true
      });
      expect(result.tags).toEqual(['js', 'ts']);
      expect(result.numbers).toEqual([1, 2, 3]);
    });

    it('should handle nested objects with arrays', () => {
      const result = parseQueryParams('user.name=John&user.tags[]=js&user.tags[]=ts', {
        allowDots: true,
        arrayFormat: 'brackets'
      });
      expect(result.user.name).toBe('John');
      expect(result['user.tags']).toEqual(['js', 'ts']);
    });

    it('should handle JSON values', () => {
      const result = parseQueryParams('data={"key":"value"}&arr=[1,2,3]');
      expect(result.data).toEqual({ key: 'value' });
      expect(result.arr).toEqual([1, 2, 3]);
    });

    it('should handle all options together', () => {
      const result = parseQueryParams('utf8=%E2%9C%93&user.name=John&user.tags[]=js&user.tags[]=ts&numbers=1,2,3&active=true', {
        charsetSentinel: true,
        allowDots: true,
        arrayFormat: 'brackets',
        comma: true,
        parseNumbers: true,
        parseBooleans: true,
        skipNulls: true,
        allowPrototypes: false,
        plainObjects: false
      });
      expect(result.user.name).toBe('John');
      expect(result['user.tags']).toEqual(['js', 'ts']);
      expect(result.numbers).toEqual([1, 2, 3]);
      expect(result.active).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query string', () => {
      const result = parseQueryParams('');
      expect(result).toEqual({});
    });

    it('should handle query string with only delimiter', () => {
      const result = parseQueryParams('&');
      expect(result).toEqual({});
    });

    it('should handle very long array indices', () => {
      const result = parseQueryParams('arr[999]=value', { arrayFormat: 'indices', arrayLimit: 1000 });
      expect(result.arr[999]).toBe('value');
    });

    it('should handle special characters in keys and values', () => {
      const result = parseQueryParams('key%20with%20spaces=value%20with%20spaces');
      expect(result).toEqual({ 'key with spaces': 'value with spaces' });
    });

    it('should handle equals sign in values', () => {
      const result = parseQueryParams('equation=a=b+c');
      expect(result).toEqual({ equation: 'a=b+c' });
    });

    it('should handle ampersand in URL-encoded values', () => {
      const result = parseQueryParams('query=hello%26world');
      expect(result).toEqual({ query: 'hello&world' });
    });
  });
});

