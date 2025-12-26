import { Context, ValidationOptions } from '../types.js';
import { ValidationError, ErrorCode, ErrorDetail } from '../errors.js';

export function validate(options: ValidationOptions) {
  const { schema, allowUnknown = false, stripUnknown = false } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    const errors: ErrorDetail[] = [];

    if (schema.body) {
      if (!allowUnknown) {
        collectUnknownFieldErrors(ctx.body, schema.body, 'body', errors);
      }
      collectValidationErrors(ctx.body, schema.body, 'body', { allowUnknown, stripUnknown }, errors);
      if (stripUnknown) {
        ctx.body = stripUnknownFields(ctx.body, schema.body);
      }
    }

    if (schema.query) {
      if (!allowUnknown) {
        collectUnknownFieldErrors(ctx.query, schema.query, 'query', errors);
      }
      collectValidationErrors(ctx.query, schema.query, 'query', { allowUnknown, stripUnknown }, errors);
      if (stripUnknown) {
        ctx.query = stripUnknownFields(ctx.query, schema.query);
      }
    }

    if (schema.params) {
      if (!allowUnknown) {
        collectUnknownFieldErrors(ctx.params, schema.params, 'params', errors);
      }
      collectValidationErrors(ctx.params, schema.params, 'params', { allowUnknown, stripUnknown }, errors);
      if (stripUnknown) {
        ctx.params = stripUnknownFields(ctx.params, schema.params);
      }
    }

    if (schema.headers) {
      if (!allowUnknown) {
        collectUnknownFieldErrors(ctx.req.headers, schema.headers, 'headers', errors);
      }
      collectValidationErrors(ctx.req.headers, schema.headers, 'headers', { allowUnknown, stripUnknown }, errors);
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

    if (errors.length > 0) {
      throw ValidationError.fields(errors);
    }

    await next();
  };
}

export function validateQuery(schema: Record<string, any>) {
  return async (ctx: Context, next: () => Promise<void>) => {
    const errors: ErrorDetail[] = [];
    collectValidationErrors(ctx.query, schema, 'query', { allowUnknown: false, stripUnknown: false }, errors);

    if (errors.length > 0) {
      throw ValidationError.fields(errors);
    }

    await next();
  };
}

function collectUnknownFieldErrors(
  value: any,
  schema: Record<string, any>,
  field: string,
  errors: ErrorDetail[]
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  const schemaKeys = new Set(Object.keys(schema));
  for (const key of Object.keys(value)) {
    if (!schemaKeys.has(key)) {
      errors.push({
        field: `${field}.${key}`,
        message: `${field}.${key} is not allowed`,
        code: ErrorCode.VALIDATION_FAILED,
      });
      continue;
    }

    const rules = schema[key];
    if (rules && rules.properties && typeof value[key] === 'object' && !Array.isArray(value[key])) {
      collectUnknownFieldErrors(value[key], rules.properties, `${field}.${key}`, errors);
    } else if (rules && rules.items && Array.isArray(value[key])) {
      value[key].forEach((item: any, index: number) => {
        if (typeof item === 'object' && !Array.isArray(item) && rules.items.properties) {
          collectUnknownFieldErrors(item, rules.items.properties, `${field}.${key}[${index}]`, errors);
        }
      });
    }
  }
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

function collectValidationErrors(
  value: any,
  schema: Record<string, any>,
  field: string,
  options: { allowUnknown: boolean; stripUnknown: boolean },
  errors: ErrorDetail[]
): void {
  for (const [key, rules] of Object.entries(schema)) {
    const fieldValue = value?.[key];
    const fieldPath = `${field}.${key}`;

    if (rules.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
      errors.push({
        field: fieldPath,
        message: `${fieldPath} is required`,
        code: ErrorCode.MISSING_REQUIRED_FIELD,
      });
      continue;
    }

    if (fieldValue !== undefined && fieldValue !== null) {
      if (rules.type) {
        const expectedType = rules.type;

        if (expectedType === 'number' && isNaN(Number(fieldValue))) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be a number`,
            code: ErrorCode.INVALID_FIELD_TYPE,
            expected: 'number',
            received: typeof fieldValue,
          });
          continue;
        }

        if (
          expectedType === 'boolean' &&
          typeof fieldValue !== 'boolean' &&
          fieldValue !== 'true' &&
          fieldValue !== 'false'
        ) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be a boolean`,
            code: ErrorCode.INVALID_FIELD_TYPE,
            expected: 'boolean',
            received: typeof fieldValue,
          });
          continue;
        }

        if (expectedType === 'array' && !Array.isArray(fieldValue)) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be an array`,
            code: ErrorCode.INVALID_FIELD_TYPE,
            expected: 'array',
            received: typeof fieldValue,
          });
          continue;
        }

        if (expectedType === 'object' && (typeof fieldValue !== 'object' || Array.isArray(fieldValue))) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be an object`,
            code: ErrorCode.INVALID_FIELD_TYPE,
            expected: 'object',
            received: Array.isArray(fieldValue) ? 'array' : typeof fieldValue,
          });
          continue;
        }

        if (expectedType === 'string' && typeof fieldValue !== 'string') {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be a string`,
            code: ErrorCode.INVALID_FIELD_TYPE,
            expected: 'string',
            received: typeof fieldValue,
          });
          continue;
        }
      }

      if (rules.type === 'string' || typeof fieldValue === 'string') {
        if (rules.minLength && fieldValue.length < rules.minLength) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be at least ${rules.minLength} characters long`,
            code: ErrorCode.VALIDATION_FAILED,
            meta: { minLength: rules.minLength, actualLength: fieldValue.length },
          });
        }

        if (rules.maxLength && fieldValue.length > rules.maxLength) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be at most ${rules.maxLength} characters long`,
            code: ErrorCode.VALIDATION_FAILED,
            meta: { maxLength: rules.maxLength, actualLength: fieldValue.length },
          });
        }

        if (rules.pattern && !new RegExp(rules.pattern).test(fieldValue)) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} format is invalid`,
            code: ErrorCode.INVALID_FIELD_FORMAT,
            meta: { pattern: rules.pattern },
          });
        }

        if (rules.enum && !rules.enum.includes(fieldValue)) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be one of: ${rules.enum.join(', ')}`,
            code: ErrorCode.VALIDATION_FAILED,
            expected: rules.enum,
            received: fieldValue,
          });
        }
      }

      if (rules.type === 'number' || typeof fieldValue === 'number') {
        const numValue = Number(fieldValue);

        if (rules.min !== undefined && numValue < rules.min) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be at least ${rules.min}`,
            code: ErrorCode.VALIDATION_FAILED,
            meta: { min: rules.min, actual: numValue },
          });
        }

        if (rules.max !== undefined && numValue > rules.max) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be at most ${rules.max}`,
            code: ErrorCode.VALIDATION_FAILED,
            meta: { max: rules.max, actual: numValue },
          });
        }
      }

      if (rules.type === 'array' || Array.isArray(fieldValue)) {
        if (rules.minItems && fieldValue.length < rules.minItems) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must have at least ${rules.minItems} items`,
            code: ErrorCode.VALIDATION_FAILED,
            meta: { minItems: rules.minItems, actualItems: fieldValue.length },
          });
        }

        if (rules.maxItems && fieldValue.length > rules.maxItems) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must have at most ${rules.maxItems} items`,
            code: ErrorCode.VALIDATION_FAILED,
            meta: { maxItems: rules.maxItems, actualItems: fieldValue.length },
          });
        }

        if (rules.items && fieldValue.length > 0) {
          fieldValue.forEach((item: any, index: number) => {
            collectValidationErrors(
              { item },
              { item: rules.items },
              `${fieldPath}[${index}]`,
              options,
              errors
            );
          });
        }
      }

      if (rules.type === 'object' || (typeof fieldValue === 'object' && !Array.isArray(fieldValue))) {
        if (rules.properties) {
          if (!options.allowUnknown) {
            collectUnknownFieldErrors(fieldValue, rules.properties, fieldPath, errors);
          }
          collectValidationErrors(fieldValue, rules.properties, fieldPath, options, errors);
        }
      }

      if (rules.validate && typeof rules.validate === 'function') {
        const isValid = rules.validate(fieldValue);
        if (isValid !== true) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} validation failed: ${isValid || 'Invalid value'}`,
            code: ErrorCode.VALIDATION_FAILED,
          });
        }
      }
    }
  }
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
