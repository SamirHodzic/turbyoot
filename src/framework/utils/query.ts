import { QueryParseOptions } from '../types.js';

export function parseQueryParams(queryString: string, options: QueryParseOptions = {}): Record<string, any> {
  const {
    parseNumbers = true,
    parseBooleans = true,
    parseArrays = true,
    arrayLimit = 1000,
    allowPrototypes = false,
    plainObjects = false,
    allowDots = false,
    depth = 5,
    parameterLimit = 1000,
    strictNullHandling = false,
    ignoreQueryPrefix = false,
    delimiter = '&',
    charset = 'utf-8',
    charsetSentinel = false,
    interpretNumericEntities = false,
    parseValues = true,
    sortFn,
    decoder = decodeURIComponent,
    encodeValuesOnly = false,
    format = 'default',
    formatter,
    validate,
    skipNulls = false,
    comma = false,
    allowEmptyArrays = false,
    duplicates = 'combine',
    allowSparse = false,
    arrayFormat = 'indices',
    arrayFormatSeparator = ',',
    serializeDate,
    serialize,
    serializeParams,
    serializeQueryKey,
    serializeQueryValue,
    serializeQuery,
    serializeFragment,
    serializeHash,
    serializeHost,
    serializePassword,
    serializePathname,
    serializePort,
    serializeProtocol,
    serializeSearch,
    serializeUsername,
    serializeUserinfo
  } = options;

  if (!queryString) {
    return {};
  }

  if (ignoreQueryPrefix && queryString.charAt(0) === '?') {
    queryString = queryString.slice(1);
  }

  if (!allowDots && !parseArrays && !parseNumbers && !parseBooleans && duplicates === 'last') {
    return parseSimpleQuery(queryString);
  }

  const pairs = queryString.split(delimiter);
  const result: Record<string, any> = {};

  for (let i = 0; i < pairs.length; i++) {
    if (i >= parameterLimit) {
      break;
    }

    const pair = pairs[i];
    const equalIndex = pair.indexOf('=');
    let key: string;
    let value: string;

    if (equalIndex === -1) {
      key = decoder(pair, decodeURIComponent);
      value = '';
    } else {
      key = decoder(pair.slice(0, equalIndex), decodeURIComponent);
      value = decoder(pair.slice(equalIndex + 1), decodeURIComponent);
    }

    if (parseArrays && (key.endsWith('[]') || key.endsWith(']'))) {
      const arrayKey = key.replace(/\[\]$/, '');
      if (!result[arrayKey]) {
        result[arrayKey] = [];
      }
      
      if (value !== '') {
        const parsedValue = parseValue(value, { parseNumbers, parseBooleans, parseValues });
        if (allowEmptyArrays || parsedValue !== '') {
          result[arrayKey].push(parsedValue);
        }
      }
    } else {
      if (allowDots) {
        setNestedValue(result, key, value, { parseNumbers, parseBooleans, parseValues, depth });
      } else {
        if (result[key] !== undefined) {
          if (duplicates === 'combine') {
            if (Array.isArray(result[key])) {
              result[key].push(parseValue(value, { parseNumbers, parseBooleans, parseValues }));
            } else {
              result[key] = [result[key], parseValue(value, { parseNumbers, parseBooleans, parseValues })];
            }
          } else if (duplicates === 'first') {
            // Keep first value
          } else if (duplicates === 'last') {
            result[key] = parseValue(value, { parseNumbers, parseBooleans, parseValues });
          }
        } else {
          result[key] = parseValue(value, { parseNumbers, parseBooleans, parseValues });
        }
      }
    }
  }

  return result;
}

function parseSimpleQuery(queryString: string): Record<string, any> {
  const result: Record<string, any> = {};
  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) {
      result[decodeURIComponent(pair)] = '';
    } else {
      result[decodeURIComponent(pair.slice(0, eqIndex))] = decodeURIComponent(pair.slice(eqIndex + 1));
    }
  }
  return result;
}

function parseValue(value: string, options: { parseNumbers: boolean; parseBooleans: boolean; parseValues: boolean }): any {
  if (!options.parseValues) {
    return value;
  }

  if (value === 'null') {
    return null;
  }

  if (value === 'undefined') {
    return undefined;
  }

  if (options.parseBooleans) {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  if (options.parseNumbers) {
    if (value === '') return '';
    if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) {
      return Number(value);
    }
  }

  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch (e) {
      // If JSON parsing fails, return as string
    }
  }

  return value;
}

function setNestedValue(obj: any, path: string, value: any, options: { parseNumbers: boolean; parseBooleans: boolean; parseValues: boolean; depth: number }): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = parseValue(value, options);
}
