import { z } from 'zod';

const SAGE_POND_ERROR_PREFIX = 'SAGE POND ERROR withh a reason of the error:';

const describePath = (path: PropertyKey[]): string => {
  if (path.length === 0) {
    return 'input';
  }

  return path.map(String).join('.');
};

const buildReason = (issue: { code?: string; path?: PropertyKey[] } & Record<string, unknown>): string => {
  const field = describePath(issue.path ?? []);

  switch (issue.code) {
    case 'invalid_type': {
      const expected = typeof issue.expected === 'string' ? issue.expected : 'a valid value';
      return `${field} must be ${expected}.`;
    }
    case 'invalid_format': {
      const format = typeof issue.format === 'string' ? issue.format : 'the required format';
      return `${field} has an invalid format and must match ${format}.`;
    }
    case 'too_small': {
      if (typeof issue.minimum === 'number' || typeof issue.minimum === 'bigint') {
        return `${field} is too small and must be at least ${String(issue.minimum)}.`;
      }
      return `${field} is too small.`;
    }
    case 'too_big': {
      if (typeof issue.maximum === 'number' || typeof issue.maximum === 'bigint') {
        return `${field} is too large and must be at most ${String(issue.maximum)}.`;
      }
      return `${field} is too large.`;
    }
    case 'invalid_value':
      return `${field} contains a value that is not allowed.`;
    case 'unrecognized_keys': {
      const keys = Array.isArray(issue.keys) ? issue.keys.join(', ') : 'unknown keys';
      return `${field} contains unrecognized keys: ${keys}.`;
    }
    case 'invalid_union':
      return `${field} does not match any allowed input shape.`;
    case 'invalid_key':
      return `${field} contains an invalid key.`;
    case 'invalid_element':
      return `${field} contains an invalid element.`;
    case 'not_multiple_of': {
      if (typeof issue.divisor === 'number') {
        return `${field} must be a multiple of ${issue.divisor}.`;
      }
      return `${field} is not a valid multiple of the required value.`;
    }
    case 'custom':
      return `${field} failed custom validation.`;
    default:
      return `${field} is invalid.`;
  }
};

z.setErrorMap((issue) => ({
  message: `${SAGE_POND_ERROR_PREFIX} ${buildReason(issue)}`,
}));

export { SAGE_POND_ERROR_PREFIX };
