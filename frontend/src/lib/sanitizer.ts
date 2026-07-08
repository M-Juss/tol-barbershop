export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;

  let sanitized = value.replace(/<[^>]*>/g, '');

  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized.trim();
}

export function sanitizeText(value: string): string {
  if (typeof value !== 'string') return value;

  let sanitized = value.replace(/<[^>]*>/g, '');

  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  sanitized = sanitized.replace(/[ \t]+/g, ' ');

  return sanitized.trim();
}

export function normalizeEmail(value: string): string {
  if (typeof value !== 'string') return value;
  return value.toLowerCase().trim();
}

export function normalizePhone(value: string): string {
  if (typeof value !== 'string') return value;
  return value.replace(/\D/g, '').trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  stringFields: (keyof T)[],
  textFields: (keyof T)[],
  emailFields: (keyof T)[],
  phoneFields: (keyof T)[]
): T {
  const sanitized = { ...obj };
  
  stringFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = sanitizeString(String(sanitized[field])) as T[keyof T];
    }
  });
  
  textFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = sanitizeText(String(sanitized[field])) as T[keyof T];
    }
  });
  
  emailFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = normalizeEmail(String(sanitized[field])) as T[keyof T];
    }
  });
  
  phoneFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = normalizePhone(String(sanitized[field])) as T[keyof T];
    }
  });
  
  return sanitized;
}

export function escapeHtml(value: string): string {
  if (typeof value !== 'string') return value;

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return value.replace(/[&<>"'/]/g, char => map[char]);
}
