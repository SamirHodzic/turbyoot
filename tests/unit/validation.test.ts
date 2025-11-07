import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { validate, validateQuery, validateField } from '../../src/framework/middleware/validation.js';
import { createMockContext } from '../utils/test-helpers.js';

describe('Validation Middleware', () => {
  let ctx: ReturnType<typeof createMockContext>;
  let next: jest.Mock<() => Promise<void>>;

  beforeEach(() => {
    ctx = createMockContext();
    next = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  });

  describe('Basic Validation', () => {
    it('should pass validation when all required fields are present', async () => {
      ctx.body = { name: 'John', email: 'john@example.com' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { required: true, type: 'string' },
            email: { required: true, type: 'string' }
          }
        }
      });

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should fail validation when required field is missing', async () => {
      ctx.body = { name: 'John' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { required: true, type: 'string' },
            email: { required: true, type: 'string' }
          }
        }
      });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required'),
          status: 400
        })
      );
    });

    it('should fail validation when required field is empty string', async () => {
      ctx.body = { name: '', email: 'john@example.com' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { required: true, type: 'string' },
            email: { required: true, type: 'string' }
          }
        }
      });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(400);
    });

    it('should fail validation when required field is null', async () => {
      ctx.body = { name: null, email: 'john@example.com' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { required: true, type: 'string' },
            email: { required: true, type: 'string' }
          }
        }
      });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(400);
    });
  });

  describe('Type Validation', () => {
    it('should validate string type', async () => {
      ctx.body = { name: 'John' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { type: 'string' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation for invalid string type', async () => {
      ctx.body = { name: 123 };
      
      const middleware = validate({
        schema: {
          body: {
            name: { type: 'string' }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('must be a string')
        })
      );
    });

    it('should validate number type', async () => {
      ctx.body = { age: 25 };
      
      const middleware = validate({
        schema: {
          body: {
            age: { type: 'number' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation for invalid number type', async () => {
      ctx.body = { age: 'not-a-number' };
      
      const middleware = validate({
        schema: {
          body: {
            age: { type: 'number' }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('must be a number')
        })
      );
    });

    it('should validate boolean type', async () => {
      ctx.body = { active: true };
      
      const middleware = validate({
        schema: {
          body: {
            active: { type: 'boolean' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should validate boolean type from string "true"', async () => {
      ctx.body = { active: 'true' };
      
      const middleware = validate({
        schema: {
          body: {
            active: { type: 'boolean' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should validate boolean type from string "false"', async () => {
      ctx.body = { active: 'false' };
      
      const middleware = validate({
        schema: {
          body: {
            active: { type: 'boolean' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation for invalid boolean type', async () => {
      ctx.body = { active: 'yes' };
      
      const middleware = validate({
        schema: {
          body: {
            active: { type: 'boolean' }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
    });

    it('should validate array type', async () => {
      ctx.body = { tags: ['tag1', 'tag2'] };
      
      const middleware = validate({
        schema: {
          body: {
            tags: { type: 'array' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation for invalid array type', async () => {
      ctx.body = { tags: 'not-an-array' };
      
      const middleware = validate({
        schema: {
          body: {
            tags: { type: 'array' }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
    });

    it('should validate object type', async () => {
      ctx.body = { address: { street: '123 Main St' } };
      
      const middleware = validate({
        schema: {
          body: {
            address: { type: 'object' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when object type is array', async () => {
      ctx.body = { address: [] };
      
      const middleware = validate({
        schema: {
          body: {
            address: { type: 'object' }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
    });
  });

  describe('String Validation', () => {
    it('should validate minLength', async () => {
      ctx.body = { name: 'John' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { type: 'string', minLength: 3 }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when string is too short', async () => {
      ctx.body = { name: 'Jo' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { type: 'string', minLength: 3 }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('at least 3 characters')
        })
      );
    });

    it('should validate maxLength', async () => {
      ctx.body = { name: 'John' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { type: 'string', maxLength: 10 }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when string is too long', async () => {
      ctx.body = { name: 'This is a very long name' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { type: 'string', maxLength: 10 }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('at most 10 characters')
        })
      );
    });

    it('should validate pattern', async () => {
      ctx.body = { email: 'john@example.com' };
      
      const middleware = validate({
        schema: {
          body: {
            email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when pattern does not match', async () => {
      ctx.body = { email: 'invalid-email' };
      
      const middleware = validate({
        schema: {
          body: {
            email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('format is invalid')
        })
      );
    });

    it('should validate enum', async () => {
      ctx.body = { status: 'active' };
      
      const middleware = validate({
        schema: {
          body: {
            status: { type: 'string', enum: ['active', 'inactive', 'pending'] }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when value is not in enum', async () => {
      ctx.body = { status: 'unknown' };
      
      const middleware = validate({
        schema: {
          body: {
            status: { type: 'string', enum: ['active', 'inactive', 'pending'] }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('must be one of')
        })
      );
    });
  });

  describe('Number Validation', () => {
    it('should validate min', async () => {
      ctx.body = { age: 25 };
      
      const middleware = validate({
        schema: {
          body: {
            age: { type: 'number', min: 18 }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when number is less than min', async () => {
      ctx.body = { age: 15 };
      
      const middleware = validate({
        schema: {
          body: {
            age: { type: 'number', min: 18 }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('must be at least 18')
        })
      );
    });

    it('should validate max', async () => {
      ctx.body = { age: 25 };
      
      const middleware = validate({
        schema: {
          body: {
            age: { type: 'number', max: 100 }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when number is greater than max', async () => {
      ctx.body = { age: 150 };
      
      const middleware = validate({
        schema: {
          body: {
            age: { type: 'number', max: 100 }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('must be at most 100')
        })
      );
    });
  });

  describe('Array Validation', () => {
    it('should validate minItems', async () => {
      ctx.body = { tags: ['tag1', 'tag2', 'tag3'] };
      
      const middleware = validate({
        schema: {
          body: {
            tags: { type: 'array', minItems: 2 }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when array has fewer items than minItems', async () => {
      ctx.body = { tags: ['tag1'] };
      
      const middleware = validate({
        schema: {
          body: {
            tags: { type: 'array', minItems: 2 }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('at least 2 items')
        })
      );
    });

    it('should validate maxItems', async () => {
      ctx.body = { tags: ['tag1', 'tag2'] };
      
      const middleware = validate({
        schema: {
          body: {
            tags: { type: 'array', maxItems: 5 }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when array has more items than maxItems', async () => {
      ctx.body = { tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'] };
      
      const middleware = validate({
        schema: {
          body: {
            tags: { type: 'array', maxItems: 5 }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('at most 5 items')
        })
      );
    });

    it('should validate array items', async () => {
      ctx.body = { tags: ['tag1', 'tag2'] };
      
      const middleware = validate({
        schema: {
          body: {
            tags: {
              type: 'array',
              items: { type: 'string', minLength: 3 }
            }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when array item is invalid', async () => {
      ctx.body = { tags: ['ta'] };
      
      const middleware = validate({
        schema: {
          body: {
            tags: {
              type: 'array',
              items: { type: 'string', minLength: 3 }
            }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
    });
  });

  describe('Object Validation', () => {
    it('should validate nested object properties', async () => {
      ctx.body = {
        address: {
          street: '123 Main St',
          city: 'New York'
        }
      };
      
      const middleware = validate({
        schema: {
          body: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string', required: true },
                city: { type: 'string', required: true }
              }
            }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when nested object property is invalid', async () => {
      ctx.body = {
        address: {
          street: '123 Main St',
          city: ''
        }
      };
      
      const middleware = validate({
        schema: {
          body: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string', required: true },
                city: { type: 'string', required: true }
              }
            }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
    });
  });

  describe('Custom Validation', () => {
    it('should validate with custom validate function', async () => {
      ctx.body = { password: 'secure123' };
      
      const middleware = validate({
        schema: {
          body: {
            password: {
              type: 'string',
              validate: (value: string) => {
                return value.length >= 8 ? true : 'Password must be at least 8 characters';
              }
            }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when custom validate function returns false', async () => {
      ctx.body = { password: 'short' };
      
      const middleware = validate({
        schema: {
          body: {
            password: {
              type: 'string',
              validate: (value: string) => {
                return value.length >= 8 ? true : 'Password must be at least 8 characters';
              }
            }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Password must be at least 8 characters')
        })
      );
    });
  });

  describe('allowUnknown Option', () => {
    it('should reject unknown fields by default', async () => {
      ctx.body = { name: 'John', unknown: 'field' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { type: 'string' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('is not allowed')
        })
      );
    });

    it('should allow unknown fields when allowUnknown is true', async () => {
      ctx.body = { name: 'John', unknown: 'field' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { type: 'string' }
          }
        },
        allowUnknown: true
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should reject unknown fields in nested objects', async () => {
      ctx.body = {
        address: {
          street: '123 Main St',
          unknown: 'field'
        }
      };
      
      const middleware = validate({
        schema: {
          body: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' }
              }
            }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('address.unknown is not allowed')
        })
      );
    });

    it('should reject unknown fields in array items', async () => {
      ctx.body = {
        items: [
          { name: 'Item 1', valid: true },
          { name: 'Item 2', unknown: 'field' }
        ]
      };
      
      const middleware = validate({
        schema: {
          body: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(400);
    });
  });

  describe('stripUnknown Option', () => {
    it('should strip unknown fields when stripUnknown is true', async () => {
      ctx.body = { name: 'John', unknown: 'field', another: 'unknown' };
      
      const middleware = validate({
        schema: {
          body: {
            name: { type: 'string' }
          }
        },
        allowUnknown: true,
        stripUnknown: true
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
      expect(ctx.body).toEqual({ name: 'John' });
    });

    it('should strip unknown fields from nested objects', async () => {
      ctx.body = {
        address: {
          street: '123 Main St',
          city: 'New York',
          unknown: 'field'
        }
      };
      
      const middleware = validate({
        schema: {
          body: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' }
              }
            }
          }
        },
        allowUnknown: true,
        stripUnknown: true
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
      expect(ctx.body.address).toEqual({
        street: '123 Main St',
        city: 'New York'
      });
    });

    it('should strip unknown fields from array items', async () => {
      ctx.body = {
        items: [
          { name: 'Item 1', unknown: 'field1' },
          { name: 'Item 2', unknown: 'field2' }
        ]
      };
      
      const middleware = validate({
        schema: {
          body: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' }
                }
              }
            }
          }
        },
        allowUnknown: true,
        stripUnknown: true
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
      expect(ctx.body.items).toEqual([
        { name: 'Item 1' },
        { name: 'Item 2' }
      ]);
    });
  });

  describe('Query Validation', () => {
    it('should validate query parameters', async () => {
      ctx.query = { page: '1', limit: '10' };
      
      const middleware = validate({
        schema: {
          query: {
            page: { type: 'number' },
            limit: { type: 'number' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when query parameter is invalid', async () => {
      ctx.query = { page: 'invalid' };
      
      const middleware = validate({
        schema: {
          query: {
            page: { type: 'number' }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
    });
  });

  describe('validateQuery Function', () => {
    it('should validate query parameters', async () => {
      ctx.query = { q: 'search', page: '1' };
      
      const middleware = validateQuery({
        q: { type: 'string', required: true },
        page: { type: 'number' }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when required query parameter is missing', async () => {
      ctx.query = { page: '1' };
      
      const middleware = validateQuery({
        q: { type: 'string', required: true },
        page: { type: 'number' }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required')
        })
      );
    });
  });

  describe('Params Validation', () => {
    it('should validate route parameters', async () => {
      ctx.params = { id: '123' };
      
      const middleware = validate({
        schema: {
          params: {
            id: { type: 'number', required: true }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail validation when required param is missing', async () => {
      ctx.params = {};
      
      const middleware = validate({
        schema: {
          params: {
            id: { type: 'number', required: true }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
    });
  });

  describe('Headers Validation', () => {
    it('should validate headers', async () => {
      ctx.req.headers = { 'content-type': 'application/json' };
      
      const middleware = validate({
        schema: {
          headers: {
            'content-type': { type: 'string' }
          }
        }
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('should strip unknown headers when stripUnknown is true', async () => {
      ctx.req.headers = {
        'content-type': 'application/json',
        'x-unknown': 'value',
        'x-another': 'value'
      };
      
      const middleware = validate({
        schema: {
          headers: {
            'content-type': { type: 'string' }
          }
        },
        allowUnknown: true,
        stripUnknown: true
      });

      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
      expect(ctx.req.headers['x-unknown']).toBeUndefined();
      expect(ctx.req.headers['x-another']).toBeUndefined();
      expect(ctx.req.headers['content-type']).toBe('application/json');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error exceptions', async () => {
      ctx.body = { name: 'John' };
      
      const middleware = validate({
        schema: {
          body: {
            name: {
              type: 'string',
              validate: () => {
                throw 'String error';
              }
            }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          status: 400
        })
      );
    });

    it('should set both statusCode and res.statusCode on error', async () => {
      ctx.body = {};
      
      const middleware = validate({
        schema: {
          body: {
            name: { required: true, type: 'string' }
          }
        }
      });

      await middleware(ctx, next);
      expect(ctx.statusCode).toBe(400);
      expect(ctx.res.statusCode).toBe(400);
    });
  });

  describe('validateField Function', () => {
    it('should validate fields directly', () => {
      const value = { name: 'John', age: 25 };
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true }
      };

      expect(() => {
        validateField(value, schema, 'test');
      }).not.toThrow();
    });

    it('should throw error for invalid field', () => {
      const value = { name: 123 };
      const schema = {
        name: { type: 'string', required: true }
      };

      expect(() => {
        validateField(value, schema, 'test');
      }).toThrow('test.name must be a string');
    });

    it('should handle optional fields', () => {
      const value = { name: 'John' };
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number' }
      };

      expect(() => {
        validateField(value, schema, 'test');
      }).not.toThrow();
    });
  });
});

