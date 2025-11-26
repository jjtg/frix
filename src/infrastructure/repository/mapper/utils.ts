/**
 * Utility functions for key conversion between snake_case and camelCase.
 */

/**
 * Convert snake_case string to camelCase.
 *
 * @param str - String in snake_case format
 * @returns String in camelCase format
 *
 * @example
 * toCamelCase('user_id') => 'userId'
 * toCamelCase('created_at') => 'createdAt'
 * toCamelCase('kyc_status') => 'kycStatus'
 * toCamelCase('api_v2_key') => 'apiV2Key'
 */
export function toCamelCase(str: string): string {
  if (!str) return str;

  return str
    .split('_')
    .map((part, index) => {
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

/**
 * Convert camelCase string to snake_case.
 * Handles consecutive uppercase letters including at start of string.
 *
 * @param str - String in camelCase format
 * @returns String in snake_case format
 *
 * @example
 * toSnakeCase('userId') => 'user_id'
 * toSnakeCase('createdAt') => 'created_at'
 * toSnakeCase('userID') => 'user_id'
 * toSnakeCase('XMLHttpRequest') => 'xml_http_request'
 */
export function toSnakeCase(str: string): string {
  if (!str) return str;

  return (
    str
      // 1. Handle leading uppercase sequences (XMLHttp → XML_Http)
      .replace(/^([A-Z]+)([A-Z][a-z])/, '$1_$2')
      // 2. Handle uppercase sequences in the middle (myXMLParser → myXML_Parser)
      .replace(/([a-z\d])([A-Z]+)([A-Z][a-z])/g, '$1_$2_$3')
      // 3. Handle single uppercase (userId → user_Id)
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')
      .toLowerCase()
  );
}

/**
 * Recursively convert all keys in an object using the provided converter function.
 * Handles nested objects, arrays, and preserves special types (Date, null, undefined).
 *
 * @param obj - Object or value to convert
 * @param converter - Function to convert each key
 * @returns New object with converted keys
 *
 * @example
 * convertObjectKeys({ user_id: 1 }, toCamelCase) => { userId: 1 }
 * convertObjectKeys({ userId: 1 }, toSnakeCase) => { user_id: 1 }
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic conversion requires any as default type parameter
export function convertObjectKeys<T = any>(obj: T, converter: (key: string) => string): T {
  // Handle null, undefined, and primitives
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types (string, number, boolean)
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects - preserve them
  if (obj instanceof Date) {
    return obj;
  }

  // Handle arrays - recursively convert array elements
  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectKeys(item, converter)) as T;
  }

  // Handle plain objects
  // biome-ignore lint/suspicious/noExplicitAny: Generic object transformation requires any for flexible value types
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = converter(key);
    result[newKey] = convertObjectKeys(value, converter);
  }

  return result as T;
}
