import { Context, ValidationOptions, ValidationSchema } from '../types.js';

export function validate(options: ValidationOptions) {
  const { schema, allowUnknown = false, stripUnknown = false } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      if (schema.body) {
        validateField(ctx.body, schema.body, 'body');
      }

      if (schema.query) {
        validateField(ctx.query, schema.query, 'query');
      }

      if (schema.params) {
        validateField(ctx.params, schema.params, 'params');
      }

      if (schema.headers) {
        validateField(ctx.req.headers, schema.headers, 'headers');
      }

      await next();
    } catch (error) {
      ctx.statusCode = 400;
      ctx.res.statusCode = 400;
      ctx.json({ error: error instanceof Error ? error.message : 'Validation failed', status: 400 });
    }
  };
}

export function validateQuery(schema: Record<string, any>) {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      validateField(ctx.query, schema, 'query');
      await next();
    } catch (error) {
      ctx.statusCode = 400;
      ctx.res.statusCode = 400;
      ctx.json({ error: error instanceof Error ? error.message : 'Query validation failed', status: 400 });
    }
  };
}

export function validateField(value: any, schema: Record<string, any>, field: string): void {
  for (const [key, rules] of Object.entries(schema)) {
    const fieldValue = value[key];
    
    if (rules.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
      throw new Error(`${field}.${key} is required`);
    }

    if (fieldValue !== undefined && fieldValue !== null) {
      if (rules.type) {
        const expectedType = rules.type;
        const actualType = Array.isArray(fieldValue) ? 'array' : typeof fieldValue;
        
        if (expectedType === 'number' && isNaN(Number(fieldValue))) {
          throw new Error(`${field}.${key} must be a number`);
        }
        
        if (expectedType === 'boolean' && typeof fieldValue !== 'boolean' && fieldValue !== 'true' && fieldValue !== 'false') {
          throw new Error(`${field}.${key} must be a boolean`);
        }
        
        if (expectedType === 'array' && !Array.isArray(fieldValue)) {
          throw new Error(`${field}.${key} must be an array`);
        }
        
        if (expectedType === 'object' && (typeof fieldValue !== 'object' || Array.isArray(fieldValue))) {
          throw new Error(`${field}.${key} must be an object`);
        }
        
        if (expectedType === 'string' && typeof fieldValue !== 'string') {
          throw new Error(`${field}.${key} must be a string`);
        }
      }

      if (rules.type === 'string' || typeof fieldValue === 'string') {
        if (rules.minLength && fieldValue.length < rules.minLength) {
          throw new Error(`${field}.${key} must be at least ${rules.minLength} characters long`);
        }
        
        if (rules.maxLength && fieldValue.length > rules.maxLength) {
          throw new Error(`${field}.${key} must be at most ${rules.maxLength} characters long`);
        }
        
        if (rules.pattern && !new RegExp(rules.pattern).test(fieldValue)) {
          throw new Error(`${field}.${key} format is invalid`);
        }
        
        if (rules.enum && !rules.enum.includes(fieldValue)) {
          throw new Error(`${field}.${key} must be one of: ${rules.enum.join(', ')}`);
        }
      }

      if (rules.type === 'number' || typeof fieldValue === 'number') {
        const numValue = Number(fieldValue);
        
        if (rules.min !== undefined && numValue < rules.min) {
          throw new Error(`${field}.${key} must be at least ${rules.min}`);
        }
        
        if (rules.max !== undefined && numValue > rules.max) {
          throw new Error(`${field}.${key} must be at most ${rules.max}`);
        }
      }

      if (rules.type === 'array' || Array.isArray(fieldValue)) {
        if (rules.minItems && fieldValue.length < rules.minItems) {
          throw new Error(`${field}.${key} must have at least ${rules.minItems} items`);
        }
        
        if (rules.maxItems && fieldValue.length > rules.maxItems) {
          throw new Error(`${field}.${key} must have at most ${rules.maxItems} items`);
        }
        
        if (rules.items && fieldValue.length > 0) {
          fieldValue.forEach((item: any, index: number) => {
            try {
              validateField({ item }, { item: rules.items }, `${field}.${key}[${index}]`);
            } catch (error) {
              throw new Error(`${field}.${key}[${index}] validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          });
        }
      }

      if (rules.type === 'object' || (typeof fieldValue === 'object' && !Array.isArray(fieldValue))) {
        if (rules.properties) {
          validateField(fieldValue, rules.properties, `${field}.${key}`);
        }
      }

      if (rules.validate && typeof rules.validate === 'function') {
        const isValid = rules.validate(fieldValue);
        if (isValid !== true) {
          throw new Error(`${field}.${key} validation failed: ${isValid || 'Invalid value'}`);
        }
      }
    }
  }
}
