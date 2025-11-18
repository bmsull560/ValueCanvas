const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'apiKey', 'email'];

function maskValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.includes('@')) {
      const [user, domain] = value.split('@');
      if (domain) {
        return `${user[0] || ''}***@***`;
      }
    }
    // Mask all strings except emails, regardless of length
    return value.length > 6 ? `${value.slice(0, 1)}***` : '***';
  }
  if (typeof value === 'number') {
    return '***';
  }
  return '[REDACTED]';
}

export function scrubSensitiveData(input: any): any {
  if (input === null || input === undefined) return input;

  if (Array.isArray(input)) {
    return input.map((item) => scrubSensitiveData(item));
  }

  if (typeof input === 'object') {
    return Object.entries(input).reduce<Record<string, any>>((acc, [key, value]) => {
      if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        acc[key] = maskValue(value);
      } else {
        acc[key] = scrubSensitiveData(value);
      }
      return acc;
    }, {});
  }

  return input;
}
