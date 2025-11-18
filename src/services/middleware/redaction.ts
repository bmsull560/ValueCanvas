const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'apiKey', 'email'];

function maskValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.includes('@')) {
      const [user, domain] = value.split('@');
      if (domain) {
        return `${user[0] || ''}***@${domain}`;
      }
    }
    if (value.length > 12) {
      return `${value.slice(0, 3)}***${value.slice(-3)}`;
    }
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
