/**
 * Storage utilities for encryption password
 * Stores encryption password securely in sessionStorage
 */

const ENCRYPTION_PASSWORD_KEY = 'encryption_password';

/**
 * Store encryption password in sessionStorage
 * @param {string} password - Encryption password
 * @param {string} userId - User/Club ID
 */
export const storeEncryptionPassword = (password, userId) => {
  try {
    // Store in sessionStorage (cleared when browser closes)
    // Key is user-specific
    const key = `${ENCRYPTION_PASSWORD_KEY}_${userId}`;
    sessionStorage.setItem(key, password);
  } catch (error) {
    console.error('Error storing encryption password:', error);
  }
};

/**
 * Get encryption password from sessionStorage
 * @param {string} userId - User/Club ID
 * @returns {string|null} Encryption password or null
 */
export const getEncryptionPassword = (userId) => {
  try {
    const key = `${ENCRYPTION_PASSWORD_KEY}_${userId}`;
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error('Error getting encryption password:', error);
    return null;
  }
};

/**
 * Clear encryption password from sessionStorage
 * @param {string} userId - User/Club ID
 */
export const clearEncryptionPassword = (userId) => {
  try {
    const key = `${ENCRYPTION_PASSWORD_KEY}_${userId}`;
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing encryption password:', error);
  }
};

