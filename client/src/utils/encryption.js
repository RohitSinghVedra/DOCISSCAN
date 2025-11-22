/**
 * Encryption Utility - For optional cloud backup
 * Uses Web Crypto API for AES-GCM encryption
 */

/**
 * Generate encryption key from password
 * @param {string} password - User password
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} Encryption key
 */
export const deriveKeyFromPassword = async (password, salt) => {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Generate random salt
 * @returns {Uint8Array} Random salt
 */
export const generateSalt = () => {
  return crypto.getRandomValues(new Uint8Array(16));
};

/**
 * Encrypt data
 * @param {string} data - Data to encrypt (JSON string)
 * @param {string} password - Encryption password
 * @returns {Promise<string>} Encrypted data (base64 encoded)
 */
export const encryptData = async (data, password) => {
  try {
    const salt = generateSalt();
    const key = await deriveKeyFromPassword(password, salt);
    
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Convert to base64 for storage
    const base64 = btoa(String.fromCharCode(...combined));
    
    return base64;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
};

/**
 * Decrypt data
 * @param {string} encryptedData - Encrypted data (base64 encoded)
 * @param {string} password - Decryption password
 * @returns {Promise<string>} Decrypted data (JSON string)
 */
export const decryptData = async (encryptedData, password) => {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    const key = await deriveKeyFromPassword(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
};

/**
 * Generate a secure random password for encryption
 * @returns {string} Random password
 */
export const generateEncryptionPassword = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

