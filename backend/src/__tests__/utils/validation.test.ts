import { commentSchema, registerSchema } from '../../utils/validation';

describe('Validation Schemas', () => {
  describe('commentSchema', () => {
    it('should validate valid comment', () => {
      const validComment = { content: 'This is a valid comment' };
      expect(() => commentSchema.parse(validComment)).not.toThrow();
    });

    it('should reject empty comment', () => {
      const invalidComment = { content: '' };
      expect(() => commentSchema.parse(invalidComment)).toThrow();
    });

    it('should reject comment that is too long', () => {
      const invalidComment = { content: 'a'.repeat(1001) };
      expect(() => commentSchema.parse(invalidComment)).toThrow();
    });

    it('should accept comment with parentId', () => {
      const validComment = { content: 'Reply', parentId: 'some-uuid' };
      expect(() => commentSchema.parse(validComment)).not.toThrow();
    });
  });

  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        password: 'password123',
      };
      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('should reject short password', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        password: '12345',
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });
  });
});












