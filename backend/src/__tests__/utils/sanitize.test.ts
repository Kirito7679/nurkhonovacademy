import { sanitizeText, sanitizeHtml } from '../../utils/sanitize';

describe('sanitizeText', () => {
  it('should remove HTML tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    const result = sanitizeText(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
  });

  it('should remove javascript: protocol', () => {
    const input = 'javascript:alert("xss")';
    const result = sanitizeText(input);
    expect(result).not.toContain('javascript:');
  });

  it('should remove event handlers', () => {
    const input = 'onclick=alert("xss")';
    const result = sanitizeText(input);
    expect(result).not.toContain('onclick=');
  });

  it('should preserve normal text', () => {
    const input = 'Hello World';
    const result = sanitizeText(input);
    expect(result).toBe('Hello World');
  });

  it('should trim whitespace', () => {
    const input = '  Hello World  ';
    const result = sanitizeText(input);
    expect(result).toBe('Hello World');
  });
});

describe('sanitizeHtml', () => {
  it('should remove all HTML tags', () => {
    const input = '<div>Hello</div><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<div>');
    expect(result).not.toContain('</div>');
    expect(result).not.toContain('<script>');
  });

  it('should escape special characters', () => {
    const input = '<>&"\'/';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});
