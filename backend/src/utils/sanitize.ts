/**
 * Sanitize HTML content to prevent XSS attacks
 * Simple implementation - for production, consider using a library like DOMPurify
 */
export const sanitizeHtml = (html: string): string => {
  // Remove HTML tags and escape special characters
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize text content (remove potentially dangerous characters)
 */
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers like onclick=
};








