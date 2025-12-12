import { sanitizeText, sanitizeHtml } from '../../utils/sanitize';

describe('Sanitize Utils', () => {
  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const output = sanitizeText(input);
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('</script>');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const output = sanitizeText(input);
      expect(output).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert("xss")';
      const output = sanitizeText(input);
      expect(output).not.toContain('onclick=');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const output = sanitizeText(input);
      expect(output).toBe('Hello World');
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<div>Hello</div>';
      const output = sanitizeHtml(input);
      expect(output).toContain('&lt;');
      expect(output).toContain('&gt;');
    });

    it('should escape quotes', () => {
      const input = 'Hello "World"';
      const output = sanitizeHtml(input);
      expect(output).toContain('&quot;');
    });
  });
});






