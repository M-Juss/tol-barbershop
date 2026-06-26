/**
 * Input sanitization utilities to prevent XSS attacks
 * All user inputs should be sanitized before being sent to the backend
 */

/**
 * Sanitize a single-line string input
 * Removes HTML tags, control characters, and normalizes whitespace
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  
  // Remove HTML tags
  let sanitized = value.replace(/<[^>]*>/g, '');
  
  // Remove control characters (except newline, tab, carriage return)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  return sanitized.trim();
}

/**
 * Sanitize multi-line text input
 * Preserves newlines but removes HTML tags and control characters
 */
export function sanitizeText(value: string): string {
  if (typeof value !== 'string') return value;
  
  // Remove HTML tags
  let sanitized = value.replace(/<[^>]*>/g, '');
  
  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove control characters (except newline, tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize spaces and tabs within lines
  sanitized = sanitized.replace(/[ \t]+/g, ' ');
  
  return sanitized.trim();
}

/**
 * Normalize email address
 * Converts to lowercase and trims whitespace
 */
export function normalizeEmail(value: string): string {
  if (typeof value !== 'string') return value;
  return value.toLowerCase().trim();
}

/**
 * Normalize phone number
 * Removes all non-digit characters except +
 */
export function normalizePhone(value: string): string {
  if (typeof value !== 'string') return value;
  return value.replace(/\D/g, '').trim();
}

/**
 * Sanitize an object by applying sanitization to specific fields
 */
export function sanitizeObject<T extends Record<string, any>>(
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

/**
 * Escape HTML entities to prevent XSS when rendering user content
 */
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
