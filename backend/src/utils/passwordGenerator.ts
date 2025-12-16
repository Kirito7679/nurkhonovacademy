import crypto from 'crypto';

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 12)
 * @returns A secure random password containing letters and numbers
 */
export const generateSecurePassword = (length: number = 12): string => {
  // Use crypto.randomBytes for secure random generation
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  // Ensure password has at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasLetter || !hasNumber) {
    // If password doesn't meet requirements, regenerate
    return generateSecurePassword(length);
  }
  
  return password;
};
