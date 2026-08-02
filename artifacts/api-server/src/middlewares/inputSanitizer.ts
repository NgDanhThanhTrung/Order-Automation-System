// =============================================================================
// Input Sanitization Middleware
// 
// Sanitize user inputs to prevent XSS attacks and other malicious content
// Handles: HTML tags, SQL injection patterns, excessive whitespace
// =============================================================================

import type { Request, Response, NextFunction } from "express";

// ─────────────────────────────────────────────
// Sanitization Functions
// ─────────────────────────────────────────────

/**
 * Remove potentially dangerous HTML/JS patterns
 */
function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return input;
  
  return input
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove other dangerous HTML tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (except for allowed images)
    .replace(/data:(?!image\/(png|jpeg|gif|webp))/gi, '')
    // Basic HTML entity encoding for remaining special chars
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Remove SQL injection patterns
 */
function sanitizeSql(input: string): string {
  if (!input || typeof input !== 'string') return input;
  
  return input
    // Remove common SQL injection patterns
    .replace(/(\b(OR|AND)\b\s*\d+\s*=\s*\d+)/gi, '')
    .replace(/(\b(OR|AND)\b\s*['"][^'']*['"]\s*=\s*['"][^'']*['"])/gi, '')
    .replace(/(--|\#|;|\/\*|\*\/)/g, '')
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|EXEC|UNION|SELECT)\b/gi, '');
}

/**
 * Remove excessive whitespace
 */
function sanitizeWhitespace(input: string): string {
  if (!input || typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Comprehensive sanitization
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return input;
  
  let sanitized = input;
  sanitized = sanitizeHtml(sanitized);
  sanitized = sanitizeSql(sanitized);
  sanitized = sanitizeWhitespace(sanitized);
  
  return sanitized;
}

/**
 * Sanitize all string values in an object recursively
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Don't sanitize system fields
      if (key.startsWith('_') || key === 'id' || key === 'created_at' || key === 'updated_at') {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// ─────────────────────────────────────────────
// Middleware Functions
// ─────────────────────────────────────────────

/**
 * Sanitize request body
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = sanitizeObject(req.body) as Record<string, unknown>;
  }
  next();
}

/**
 * Sanitize request query parameters
 */
export function sanitizeQuery(req: Request, _res: Response, next: NextFunction): void {
  if (req.query) {
    req.query = sanitizeObject(req.query) as Record<string, unknown>;
  }
  next();
}

/**
 * Sanitize request parameters
 */
export function sanitizeParams(req: Request, _res: Response, next: NextFunction): void {
  if (req.params) {
    req.params = sanitizeObject(req.params) as Record<string, unknown>;
  }
  next();
}

/**
 * Sanitize all inputs (body, query, params)
 */
export function sanitizeAll(req: Request, _res: Response, next: NextFunction): void {
  sanitizeBody(req, _res, () => {});
  sanitizeQuery(req, _res, () => {});
  sanitizeParams(req, _res, () => {});
  next();
}

// ─────────────────────────────────────────────
// Field-specific sanitizers
// ─────────────────────────────────────────────

/**
 * Sanitize customer name (allow basic characters only)
 */
export function sanitizeCustomerName(input: string): string {
  if (!input || typeof input !== 'string') return input;
  
  // Allow letters, numbers, spaces, and basic punctuation
  return input
    .replace(/[^a-zA-Z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/g, '')
    .trim();
}

/**
 * Sanitize email (basic validation)
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return input;
  
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, '');
}

/**
 * Sanitize phone number (Vietnam format)
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') return input;
  
  // Keep only digits and + for country code
  return input
    .replace(/[^\d+]/g, '')
    .replace(/^\+84/, '0'); // Convert +84 to 0 for Vietnam
}

/**
 * Sanitize order notes (allow more characters but still safe)
 */
export function sanitizeNote(input: string): string {
  if (!input || typeof input !== 'string') return input;
  
  return sanitizeInput(input)
    .substring(0, 500); // Limit length
}