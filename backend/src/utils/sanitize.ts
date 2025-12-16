import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks using DOMPurify
 * This is a production-ready implementation that removes all potentially dangerous content
 */
export const sanitizeHtml = (html: string): string => {
  // Use DOMPurify to sanitize HTML - removes all dangerous content
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [], // No HTML tags allowed by default
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content but remove tags
  });
};

/**
 * Sanitize text content (remove potentially dangerous characters)
 * For comments, we allow basic formatting but strip all dangerous content
 */
export const sanitizeText = (text: string): string => {
  // First trim the text
  const trimmed = text.trim();
  
  // Use DOMPurify to sanitize - this will escape HTML and remove dangerous content
  // We allow basic text but no HTML tags or attributes
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [], // No HTML tags allowed in comments
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep the text content
  });
};









