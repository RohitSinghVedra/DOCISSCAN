/**
 * Document Service - Privacy-compliant storage
 * Primary: IndexedDB (local, private)
 * Optional: Encrypted Firestore backup (if user enables)
 */

import * as indexedDBService from './indexedDBService';
import { encryptData, decryptData } from '../utils/encryption';
import { db } from '../firebase-config';
import { 
  collection, 
  doc, 
  setDoc,
  getDoc,
  getDocs, 
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Save a scanned document
 * Primary: IndexedDB (local, private)
 * Optional: Encrypted Firestore backup (if cloud backup enabled)
 * @param {Object} documentData - Document data to save
 * @param {string} documentData.documentType - Type of document
 * @param {string} documentData.rawText - Raw OCR text
 * @param {Object} documentData.extractedData - Extracted structured data
 * @param {string} clubId - Nightclub ID (for club users)
 * @param {string} userId - User ID (for regular users)
 * @param {boolean} cloudBackupEnabled - Whether to backup to Firestore (encrypted)
 * @param {string} encryptionPassword - Password for encryption (if cloud backup)
 * @returns {Promise<Object>} Saved document with ID
 */
export const saveDocument = async (documentData, clubId = null, userId = null, cloudBackupEnabled = false, encryptionPassword = null) => {
  try {
    const docData = {
      documentType: documentData.documentType || 'other',
      rawText: documentData.rawText || '',
      extractedData: documentData.extractedData || {},
      clubId: clubId || null,
      userId: userId || null,
      scannedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // PRIMARY: Save to IndexedDB (local, private)
    const documentId = await indexedDBService.saveDocument(docData);
    docData.id = documentId;

    // OPTIONAL: Encrypted backup to Firestore (if enabled)
    if (cloudBackupEnabled && encryptionPassword) {
      try {
        await saveEncryptedBackup(docData, clubId, userId, encryptionPassword);
      } catch (backupError) {
        console.warn('Cloud backup failed (document still saved locally):', backupError);
        // Don't throw - local save succeeded
      }
    }

    return docData;
  } catch (error) {
    console.error('Error saving document:', error);
    throw new Error(`Failed to save document: ${error.message}`);
  }
};

/**
 * Save encrypted backup to Firestore
 * @private
 */
const saveEncryptedBackup = async (documentData, clubId, userId, encryptionPassword) => {
  try {
    // Encrypt the document data
    const jsonData = JSON.stringify(documentData);
    const encrypted = await encryptData(jsonData, encryptionPassword);

    // Store encrypted blob in Firestore
    const backupRef = doc(db, 'document_backups', documentData.id);
    await setDoc(backupRef, {
      encryptedData: encrypted,
      clubId: clubId || null,
      userId: userId || null,
      documentType: documentData.documentType, // Non-sensitive metadata only
      scannedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving encrypted backup:', error);
    throw error;
  }
};

/**
 * Get all documents for a club
 * Reads from IndexedDB (local storage)
 * @param {string} clubId - Nightclub ID
 * @returns {Promise<Array>} Array of documents
 */
export const getClubDocuments = async (clubId) => {
  try {
    if (!clubId) {
      throw new Error('Club ID is required');
    }

    // Read from IndexedDB (local, private)
    return await indexedDBService.getClubDocuments(clubId);
  } catch (error) {
    console.error('Error getting club documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
};

/**
 * Get all documents for a user (regular users)
 * Reads from IndexedDB (local storage)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of documents
 */
export const getUserDocuments = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Read from IndexedDB (local, private)
    return await indexedDBService.getUserDocuments(userId);
  } catch (error) {
    console.error('Error getting user documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
};

/**
 * Get document count for a club (for admin dashboard)
 * Returns count only - no personal data
 * @param {string} clubId - Club ID
 * @returns {Promise<number>} Document count
 */
export const getClubDocumentCount = async (clubId) => {
  try {
    return await indexedDBService.getClubDocumentCount(clubId);
  } catch (error) {
    console.error('Error getting document count:', error);
    return 0;
  }
};

/**
 * Get document count for a user (for admin dashboard)
 * Returns count only - no personal data
 * @param {string} userId - User ID
 * @returns {Promise<number>} Document count
 */
export const getUserDocumentCount = async (userId) => {
  try {
    return await indexedDBService.getUserDocumentCount(userId);
  } catch (error) {
    console.error('Error getting document count:', error);
    return 0;
  }
};

/**
 * Check if cloud backup is enabled for a user/club
 * @param {string} clubId - Club ID (optional)
 * @param {string} userId - User ID (optional)
 * @returns {Promise<boolean>} Whether cloud backup is enabled
 */
export const isCloudBackupEnabled = async (clubId = null, userId = null) => {
  try {
    // Check in Firestore for backup settings
    if (clubId) {
      const clubRef = doc(db, 'clubs', clubId);
      const clubDoc = await getDoc(clubRef);
      if (clubDoc.exists()) {
        return clubDoc.data().cloudBackupEnabled === true;
      }
    } else if (userId) {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        return userDoc.data().cloudBackupEnabled === true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking cloud backup status:', error);
    return false;
  }
};

/**
 * Enable/disable cloud backup
 * @param {string} clubId - Club ID (optional)
 * @param {string} userId - User ID (optional)
 * @param {boolean} enabled - Enable or disable
 * @param {string} encryptionPassword - Password for encryption
 * @returns {Promise<boolean>} Success status
 */
export const setCloudBackupEnabled = async (clubId = null, userId = null, enabled = false, encryptionPassword = null) => {
  try {
    if (clubId) {
      const clubRef = doc(db, 'clubs', clubId);
      await setDoc(clubRef, {
        cloudBackupEnabled: enabled,
        encryptionPasswordHash: encryptionPassword ? await hashPassword(encryptionPassword) : null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else if (userId) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        cloudBackupEnabled: enabled,
        encryptionPasswordHash: encryptionPassword ? await hashPassword(encryptionPassword) : null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    return true;
  } catch (error) {
    console.error('Error setting cloud backup:', error);
    throw new Error(`Failed to update cloud backup settings: ${error.message}`);
  }
};

/**
 * Simple password hashing for encryption password storage
 * @private
 */
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const documentService = {
  saveDocument,
  getClubDocuments,
  getUserDocuments,
  getClubDocumentCount,
  getUserDocumentCount,
  isCloudBackupEnabled,
  setCloudBackupEnabled
};

export default documentService;

