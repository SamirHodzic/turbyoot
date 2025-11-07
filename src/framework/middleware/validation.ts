import { Context, ValidationOptions } from '../types.js';

export function validate(options: ValidationOptions) {
  const { schema, allowUnknown = false, stripUnknown = false } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      if (schema.body) {
        if (!allowUnknown) {
          checkUnknownFields(ctx.body, schema.body, 'body');
        }
        validateField(ctx.body, schema.body, 'body', { allowUnknown, stripUnknown });
        if (stripUnknown) {
          ctx.body = stripUnknownFields(ctx.body, schema.body);
        }
      }

      if (schema.query) {
        if (!allowUnknown) {
          checkUnknownFields(ctx.query, schema.query, 'query');
        }
        validateField(ctx.query, schema.query, 'query', { allowUnknown, stripUnknown });
        if (stripUnknown) {
          ctx.query = stripUnknownFields(ctx.query, schema.query);
        }
      }

      if (schema.params) {
        if (!allowUnknown) {
          checkUnknownFields(ctx.params, schema.params, 'params');
        }
        validateField(ctx.params, schema.params, 'params', { allowUnknown, stripUnknown });
        if (stripUnknown) {
          ctx.params = stripUnknownFields(ctx.params, schema.params);
        }
      }

      if (schema.headers) {
        if (!allowUnknown) {
          checkUnknownFields(ctx.req.headers, schema.headers, 'headers');
        }
        validateField(ctx.req.headers, schema.headers, 'headers', { allowUnknown, stripUnknown });
        if (stripUnknown) {
          const stripped = stripUnknownFields(ctx.req.headers, schema.headers);
          Object.keys(ctx.req.headers).forEach(key => {
            if (!(key in stripped)) {
              delete ctx.req.headers[key];
            }
          });
          Object.assign(ctx.req.headers, stripped);
        }
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

function checkUnknownFields(value: any, schema: Record<string, any>, field: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  const schemaKeys = new Set(Object.keys(schema));
  for (const key of Object.keys(value)) {
    if (!schemaKeys.has(key)) {
      throw new Error(`${field}.${key} is not allowed`);
    }

    const rules = schema[key];
    if (rules && rules.properties && typeof value[key] === 'object' && !Array.isArray(value[key])) {
      checkUnknownFields(value[key], rules.properties, `${field}.${key}`);
    } else if (rules && rules.items && Array.isArray(value[key])) {
      value[key].forEach((item: any, index: number) => {
        if (typeof item === 'object' && !Array.isArray(item) && rules.items.properties) {
          checkUnknownFields(item, rules.items.properties, `${field}.${key}[${index}]`);
        }
      });
    }
  }
}

function stripUnknownFields(value: any, schema: Record<string, any>): any {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const result: Record<string, any> = {};
  const schemaKeys = new Set(Object.keys(schema));

  for (const [key, val] of Object.entries(value)) {
    if (schemaKeys.has(key)) {
      const rules = schema[key];
      if (rules && rules.properties && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = stripUnknownFields(val, rules.properties);
      } else if (rules && rules.items && Array.isArray(val)) {
        result[key] = val.map((item: any) => {
          if (typeof item === 'object' && !Array.isArray(item) && rules.items.properties) {
            return stripUnknownFields(item, rules.items.properties);
          }
          return item;
        });
      } else {
        result[key] = val;
      }
    }
  }

  return result;
}

export function validateField(
  value: any,
  schema: Record<string, any>,
  field: string,
  options: { allowUnknown: boolean; stripUnknown: boolean } = { allowUnknown: false, stripUnknown: false },
): void {
  for (const [key, rules] of Object.entries(schema)) {
    const fieldValue = value[key];

    if (rules.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
      throw new Error(`${field}.${key} is required`);
    }

    if (fieldValue !== undefined && fieldValue !== null) {
      if (rules.type) {
        const expectedType = rules.type;

        if (expectedType === 'number' && isNaN(Number(fieldValue))) {
          throw new Error(`${field}.${key} must be a number`);
        }

        if (
          expectedType === 'boolean' &&
          typeof fieldValue !== 'boolean' &&
          fieldValue !== 'true' &&
          fieldValue !== 'false'
        ) {
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
              validateField({ item }, { item: rules.items }, `${field}.${key}[${index}]`, options);
            } catch (error) {
              throw new Error(
                `${field}.${key}[${index}] validation failed: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              );
            }
          });
        }
      }

      if (rules.type === 'object' || (typeof fieldValue === 'object' && !Array.isArray(fieldValue))) {
        if (rules.properties) {
          if (!options.allowUnknown) {
            checkUnknownFields(fieldValue, rules.properties, `${field}.${key}`);
          }
          validateField(fieldValue, rules.properties, `${field}.${key}`, options);
          if (options.stripUnknown && value[key]) {
            value[key] = stripUnknownFields(fieldValue, rules.properties);
          }
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
