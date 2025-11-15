import { describe, it, expect } from '@jest/globals';
import { sanitize } from '../../src/utils/sanitize.js';

describe('Sanitization', () => {
  describe('sanitize()', () => {
    describe('String sanitization', () => {
      it('should remove script tags', () => {
        const input = '<script>alert("XSS")</script>';
        const result = sanitize(input);
        expect(result).toBe('');
      });

      it('should remove iframe tags', () => {
        const input = '<iframe src="evil.com"></iframe>';
        const result = sanitize(input);
        expect(result).toBe('');
      });

      it('should remove object tags', () => {
        const input = '<object data="evil.swf"></object>';
        const result = sanitize(input);
        expect(result).toBe('');
      });

      it('should remove embed tags', () => {
        const input = '<embed src="evil.swf"></embed>';
        const result = sanitize(input);
        expect(result).toBe('');
      });

      it('should remove link tags', () => {
        const input = '<link rel="stylesheet" href="evil.css"></link>';
        const result = sanitize(input);
        expect(result).toBe('');
      });

      it('should remove style tags', () => {
        const input = '<style>body { background: red; }</style>';
        const result = sanitize(input);
        expect(result).toBe('');
      });

      it('should remove event handlers', () => {
        const input = '<div onclick="alert(\'XSS\')">Click me</div>';
        const result = sanitize(input);
        expect(result).not.toContain('onclick');
      });

      it('should remove javascript: protocol', () => {
        const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
        const result = sanitize(input);
        expect(result).not.toContain('javascript:');
      });

      it('should remove data:text/html protocol', () => {
        const input = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
        const result = sanitize(input);
        expect(result).not.toContain('data:text/html');
      });

      it('should preserve safe HTML content', () => {
        const input = 'Hello <strong>World</strong>';
        const result = sanitize(input);
        expect(result).toBe('Hello <strong>World</strong>');
      });

      it('should handle empty strings', () => {
        const result = sanitize('');
        expect(result).toBe('');
      });

      it('should handle strings with no HTML', () => {
        const input = 'Plain text content';
        const result = sanitize(input);
        expect(result).toBe('Plain text content');
      });
    });

    describe('Object sanitization', () => {
      it('should sanitize nested objects', () => {
        const input = {
          name: '<script>alert("XSS")</script>',
          email: 'user@example.com',
          bio: '<iframe src="evil.com"></iframe>'
        };
        const result = sanitize(input);
        expect(result.name).toBe('');
        expect(result.email).toBe('user@example.com');
        expect(result.bio).toBe('');
      });

      it('should sanitize nested object properties', () => {
        const input = {
          user: {
            name: '<script>alert("XSS")</script>',
            profile: {
              bio: '<iframe src="evil.com"></iframe>'
            }
          }
        };
        const result = sanitize(input);
        expect(result.user.name).toBe('');
        expect(result.user.profile.bio).toBe('');
      });

      it('should sanitize object keys', () => {
        const input = {
          '<script>key</script>': 'value',
          normalKey: 'normal value'
        };
        const result = sanitize(input);
        expect(result['']).toBe('value');
        expect(result.normalKey).toBe('normal value');
      });

      it('should preserve non-string values in objects', () => {
        const input = {
          name: 'John',
          age: 30,
          active: true,
          score: null
        };
        const result = sanitize(input);
        expect(result.name).toBe('John');
        expect(result.age).toBe(30);
        expect(result.active).toBe(true);
        expect(result.score).toBe(null);
      });
    });

    describe('Array sanitization', () => {
      it('should sanitize array of strings', () => {
        const input = ['<script>alert("XSS")</script>', 'safe text', '<iframe></iframe>'];
        const result = sanitize(input);
        expect(result[0]).toBe('');
        expect(result[1]).toBe('safe text');
        expect(result[2]).toBe('');
      });

      it('should sanitize nested arrays', () => {
        const input = [
          ['<script>alert("XSS")</script>', 'safe'],
          ['<iframe></iframe>', 'text']
        ];
        const result = sanitize(input);
        expect(result[0][0]).toBe('');
        expect(result[0][1]).toBe('safe');
        expect(result[1][0]).toBe('');
        expect(result[1][1]).toBe('text');
      });

      it('should sanitize array of objects', () => {
        const input = [
          { name: '<script>alert("XSS")</script>', age: 25 },
          { name: 'Jane', bio: '<iframe></iframe>' }
        ];
        const result = sanitize(input);
        expect(result[0].name).toBe('');
        expect(result[0].age).toBe(25);
        expect(result[1].name).toBe('Jane');
        expect(result[1].bio).toBe('');
      });

      it('should preserve non-string values in arrays', () => {
        const input = [1, true, null, 'text'];
        const result = sanitize(input);
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(true);
        expect(result[2]).toBe(null);
        expect(result[3]).toBe('text');
      });
    });

    describe('Complex nested structures', () => {
      it('should sanitize deeply nested structures', () => {
        const input = {
          users: [
            {
              name: '<script>alert("XSS")</script>',
              profile: {
                bio: '<iframe src="evil.com"></iframe>',
                tags: ['<script>tag</script>', 'safe']
              }
            }
          ]
        };
        const result = sanitize(input);
        expect(result.users[0].name).toBe('');
        expect(result.users[0].profile.bio).toBe('');
        expect(result.users[0].profile.tags[0]).toBe('');
        expect(result.users[0].profile.tags[1]).toBe('safe');
      });

      it('should handle null and undefined values', () => {
        const input = {
          name: 'John',
          value: null,
          missing: undefined
        };
        const result = sanitize(input);
        expect(result.name).toBe('John');
        expect(result.value).toBe(null);
        expect(result.missing).toBe(undefined);
      });

      it('should respect maxDepth option', () => {
        const input = {
          level1: {
            level2: {
              level3: {
                level4: '<script>alert("XSS")</script>'
              }
            }
          }
        };
        const result = sanitize(input, { maxDepth: 2 });
        expect(result.level1.level2.level3.level4).toBe('<script>alert("XSS")</script>');
      });
    });

    describe('Options', () => {
      it('should disable HTML removal when removeHtml is false', () => {
        const input = '<script>alert("XSS")</script>';
        const result = sanitize(input, { removeHtml: false });
        expect(result).toBe('<script>alert("XSS")</script>');
      });

      it('should handle custom maxDepth', () => {
        const input = {
          a: {
            b: {
              c: {
                d: 'value'
              }
            }
          }
        };
        const result = sanitize(input, { maxDepth: 2 });
        expect(result.a.b.c.d).toBe('value');
      });
    });

    describe('Edge cases', () => {
      it('should handle null input', () => {
        const result = sanitize(null);
        expect(result).toBe(null);
      });

      it('should handle undefined input', () => {
        const result = sanitize(undefined);
        expect(result).toBe(undefined);
      });

      it('should handle numbers', () => {
        const result = sanitize(42);
        expect(result).toBe(42);
      });

      it('should handle booleans', () => {
        const result = sanitize(true);
        expect(result).toBe(true);
      });

      it('should handle empty objects', () => {
        const result = sanitize({});
        expect(result).toEqual({});
      });

      it('should handle empty arrays', () => {
        const result = sanitize([]);
        expect(result).toEqual([]);
      });
    });

    describe('Prototype pollution protection', () => {
      it('should filter out __proto__ keys', () => {
        const input: any = {
          name: 'John',
          __proto__: { isAdmin: true }
        };
        const result = sanitize(input);
        expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
        expect(result.name).toBe('John');
      });

      it('should filter out constructor keys', () => {
        const input: any = {
          name: 'John',
          constructor: { prototype: { isAdmin: true } }
        };
        const result = sanitize(input);
        expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
        expect(result.name).toBe('John');
      });

      it('should filter out prototype keys', () => {
        const input = {
          name: 'John',
          prototype: { isAdmin: true }
        };
        const result = sanitize(input);
        expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
        expect(result.name).toBe('John');
      });

      it('should protect against nested prototype pollution', () => {
        const input: any = {
          user: {
            name: 'John',
            __proto__: { isAdmin: true }
          }
        };
        const result = sanitize(input);
        expect(Object.prototype.hasOwnProperty.call(result.user, '__proto__')).toBe(false);
        expect(result.user.name).toBe('John');
      });

      it('should protect against prototype pollution in arrays', () => {
        const input: any = [
          { name: 'John', __proto__: { isAdmin: true } },
          { name: 'Jane' }
        ];
        const result = sanitize(input);
        expect(Object.prototype.hasOwnProperty.call(result[0], '__proto__')).toBe(false);
        expect(result[0].name).toBe('John');
        expect(result[1].name).toBe('Jane');
      });
    });
  });
});

