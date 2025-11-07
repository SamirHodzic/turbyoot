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
    charsetSentinel = false,
    interpretNumericEntities = false,
    parseValues = true,
    sortFn,
    decoder = decodeURIComponent,
    validate,
    skipNulls = false,
    comma = false,
    allowEmptyArrays = false,
    duplicates = 'combine',
    allowSparse = false,
    arrayFormat = 'indices',
    arrayFormatSeparator = ',',
  } = options;

  if (!queryString) {
    return plainObjects ? Object.create(null) : {};
  }

  if (ignoreQueryPrefix && queryString.charAt(0) === '?') {
    queryString = queryString.slice(1);
  }

  if (charsetSentinel) {
    const sentinelIndex = queryString.indexOf('utf8=');
    if (sentinelIndex !== -1) {
      const nextAmp = queryString.indexOf('&', sentinelIndex);
      if (nextAmp === -1) {
        queryString = queryString.slice(0, sentinelIndex);
      } else {
        queryString = queryString.slice(0, sentinelIndex) + queryString.slice(nextAmp + 1);
      }
    }
  }

  const result: Record<string, any> = plainObjects ? Object.create(null) : {};

  if (!allowDots && !parseArrays && !parseNumbers && !parseBooleans && duplicates === 'last' && !comma) {
    return parseSimpleQuery(queryString, { plainObjects, decoder, skipNulls, strictNullHandling, allowPrototypes, validate });
  }

  const delimiterRegex = typeof delimiter === 'string' ? delimiter : new RegExp(delimiter);
  const pairs = queryString.split(delimiterRegex);

  for (let i = 0; i < pairs.length; i++) {
    if (i >= parameterLimit) {
      break;
    }

    const pair = pairs[i].trim();
    if (!pair) continue;

    const equalIndex = pair.indexOf('=');
    let key: string;
    let value: string;

    if (equalIndex === -1) {
      key = decodeValue(pair, decoder, interpretNumericEntities);
      value = '';
    } else {
      key = decodeValue(pair.slice(0, equalIndex), decoder, interpretNumericEntities);
      value = decodeValue(pair.slice(equalIndex + 1), decoder, interpretNumericEntities);
    }

    if (!allowPrototypes && isPrototypePollutionKey(key)) {
      continue;
    }

    if (validate && !validate(key, value)) {
      continue;
    }

    if (skipNulls && (value === '' || value === null || (strictNullHandling && value === 'null'))) {
      continue;
    }

    if (comma && value.includes(arrayFormatSeparator)) {
      const values = value.split(arrayFormatSeparator).map(v => parseValue(v.trim(), { parseNumbers, parseBooleans, parseValues, strictNullHandling }));
      if (skipNulls) {
        const filtered = values.filter(v => v !== null && v !== '');
        if (filtered.length > 0) {
          setValue(result, key, filtered, { arrayLimit, allowSparse, allowPrototypes, plainObjects });
        }
      } else {
        setValue(result, key, values, { arrayLimit, allowSparse, allowPrototypes, plainObjects });
      }
      continue;
    }

    const parsedValue = parseValue(value, { parseNumbers, parseBooleans, parseValues, strictNullHandling });

    if (parseArrays) {
      const arrayMatch = parseArrayKey(key, arrayFormat);
      if (arrayMatch) {
        const { baseKey, index } = arrayMatch;
        if (!allowPrototypes && isPrototypePollutionKey(baseKey)) {
          continue;
        }

        if (!result[baseKey]) {
          result[baseKey] = [];
        }

        if (index !== undefined) {
          if (index >= arrayLimit) {
            continue;
          }
          if (skipNulls && (parsedValue === null || parsedValue === '')) {
            continue;
          }
          if (allowSparse) {
            result[baseKey][index] = parsedValue;
          } else {
            if (result[baseKey].length <= index) {
              result[baseKey].length = index + 1;
            }
            result[baseKey][index] = parsedValue;
          }
        } else {
          if (result[baseKey].length >= arrayLimit) {
            continue;
          }
          if (skipNulls && (parsedValue === null || parsedValue === '')) {
            continue;
          }
          if (allowEmptyArrays || parsedValue !== '') {
            result[baseKey].push(parsedValue);
          }
        }
        continue;
      }
    }

    if (allowDots) {
      setNestedValue(result, key, parsedValue, { parseNumbers, parseBooleans, parseValues, depth, skipNulls, strictNullHandling, allowPrototypes, plainObjects });
    } else {
      if (result[key] !== undefined) {
        if (duplicates === 'combine' || (arrayFormat === 'repeat' && parseArrays)) {
          if (Array.isArray(result[key])) {
            if (result[key].length >= arrayLimit) {
              continue;
            }
            if (skipNulls && (parsedValue === null || parsedValue === '')) {
              continue;
            }
            if (allowEmptyArrays || parsedValue !== '') {
              result[key].push(parsedValue);
            }
          } else {
            if (skipNulls && (parsedValue === null || parsedValue === '')) {
              continue;
            }
            result[key] = [result[key], parsedValue];
          }
        } else if (duplicates === 'first') {
          // Keep first value, do nothing
        } else if (duplicates === 'last') {
          if (skipNulls && (parsedValue === null || parsedValue === '')) {
            continue;
          }
          result[key] = parsedValue;
        }
      } else {
        if (skipNulls && (parsedValue === null || parsedValue === '')) {
          continue;
        }
        result[key] = parsedValue;
      }
    }
  }

  if (sortFn) {
    const sorted: Record<string, any> = plainObjects ? Object.create(null) : {};
    const keys = Object.keys(result).sort(sortFn);
    for (const key of keys) {
      sorted[key] = result[key];
    }
    return sorted;
  }

  return result;
}

function parseSimpleQuery(
  queryString: string,
  options: {
    plainObjects: boolean;
    decoder: (str: string, defaultDecoder: (str: string) => string) => string;
    skipNulls: boolean;
    strictNullHandling: boolean;
    allowPrototypes: boolean;
    validate?: (key: string, value: any) => boolean;
  },
): Record<string, any> {
  const result: Record<string, any> = options.plainObjects ? Object.create(null) : {};
  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    let key: string;
    let value: string;
    if (eqIndex === -1) {
      key = options.decoder(pair, decodeURIComponent);
      value = '';
    } else {
      key = options.decoder(pair.slice(0, eqIndex), decodeURIComponent);
      value = options.decoder(pair.slice(eqIndex + 1), decodeURIComponent);
    }

    if (!options.allowPrototypes && isPrototypePollutionKey(key)) {
      continue;
    }

    if (options.validate && !options.validate(key, value)) {
      continue;
    }

    if (options.skipNulls && (value === '' || (options.strictNullHandling && value === 'null'))) {
      continue;
    }

    result[key] = value;
  }
  return result;
}

function parseValue(
  value: string,
  options: { parseNumbers: boolean; parseBooleans: boolean; parseValues: boolean; strictNullHandling: boolean },
): any {
  if (!options.parseValues) {
    return value;
  }

  if (options.strictNullHandling) {
    if (value === 'null') {
      return null;
    }
    if (value === 'undefined') {
      return undefined;
    }
  } else {
    if (value === 'null') {
      return null;
    }
    if (value === 'undefined') {
      return undefined;
    }
  }

  if (options.parseBooleans) {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  if (options.parseNumbers) {
    if (value === '') return '';
    const num = Number(value);
    if (!isNaN(num) && !isNaN(parseFloat(value)) && isFinite(num)) {
      return num;
    }
  }

  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      // If JSON parsing fails, return as string
    }
  }

  return value;
}

function decodeValue(str: string, decoder: (str: string, defaultDecoder: (str: string) => string) => string, interpretNumericEntities: boolean): string {
  let decoded = decoder(str, decodeURIComponent);
  if (interpretNumericEntities) {
    decoded = decoded.replace(/%([0-9A-F]{2})/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  }
  return decoded;
}

function isPrototypePollutionKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function parseArrayKey(key: string, arrayFormat: string): { baseKey: string; index?: number } | null {
  if (arrayFormat === 'brackets') {
    if (key.endsWith('[]')) {
      return { baseKey: key.slice(0, -2) };
    }
    const match = key.match(/^(.+)\[(\d+)\]$/);
    if (match) {
      return { baseKey: match[1], index: parseInt(match[2], 10) };
    }
  } else if (arrayFormat === 'indices') {
    const match = key.match(/^(.+)\[(\d+)\]$/);
    if (match) {
      return { baseKey: match[1], index: parseInt(match[2], 10) };
    }
  }
  return null;
}

function setValue(
  result: Record<string, any>,
  key: string,
  value: any,
  options: { arrayLimit: number; allowSparse: boolean; allowPrototypes: boolean; plainObjects: boolean },
): void {
  if (!options.allowPrototypes && isPrototypePollutionKey(key)) {
    return;
  }

  if (Array.isArray(value) && value.length > options.arrayLimit) {
    value = value.slice(0, options.arrayLimit);
  }

  result[key] = value;
}

function setNestedValue(
  obj: any,
  path: string,
  value: any,
  options: {
    parseNumbers: boolean;
    parseBooleans: boolean;
    parseValues: boolean;
    depth: number;
    skipNulls: boolean;
    strictNullHandling: boolean;
    allowPrototypes: boolean;
    plainObjects: boolean;
  },
): void {
  if (options.skipNulls && (value === null || value === '')) {
    return;
  }

  const keys = path.split('.');
  if (keys.length > options.depth) {
    return;
  }

  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!options.allowPrototypes && isPrototypePollutionKey(key)) {
      return;
    }
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null || Array.isArray(current[key])) {
      current[key] = options.plainObjects ? Object.create(null) : {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (!options.allowPrototypes && isPrototypePollutionKey(lastKey)) {
    return;
  }
  current[lastKey] = value;
}
