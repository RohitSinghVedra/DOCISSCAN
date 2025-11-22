/**
 * Document Service - Save and retrieve scanned documents from Firestore
 */

import { db } from '../firebase-config';
import { 
  collection, 
  doc, 
  addDoc,
  getDocs, 
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Save a scanned document to Firestore
 * @param {Object} documentData - Document data to save
 * @param {string} documentData.documentType - Type of document (aadhaar, passport, pan, etc.)
 * @param {string} documentData.rawText - Raw OCR text
 * @param {Object} documentData.extractedData - Extracted structured data
 * @param {string} clubId - Nightclub ID (for club users)
 * @param {string} userId - User ID (for regular users, optional)
 * @returns {Promise<Object>} Saved document with ID
 */
export const saveDocument = async (documentData, clubId = null, userId = null) => {
  try {
    const documentsRef = collection(db, 'documents');
    
    const docData = {
      documentType: documentData.documentType || 'other',
      rawText: documentData.rawText || '',
      extractedData: documentData.extractedData || {},
      clubId: clubId || null,
      userId: userId || null,
      scannedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(documentsRef, docData);
    
    return {
      id: docRef.id,
      ...docData,
      scannedAt: new Date(),
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error saving document:', error);
    throw new Error(`Failed to save document: ${error.message}`);
  }
};

/**
 * Get all documents for a club
 * @param {string} clubId - Nightclub ID
 * @param {number} maxResults - Maximum number of results (default: 100)
 * @returns {Promise<Array>} Array of documents
 */
export const getClubDocuments = async (clubId, maxResults = 100) => {
  try {
    if (!clubId) {
      throw new Error('Club ID is required');
    }

    const documentsRef = collection(db, 'documents');
    const q = query(
      documentsRef,
      where('clubId', '==', clubId),
      orderBy('scannedAt', 'desc'),
      limit(maxResults)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scannedAt: doc.data().scannedAt?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error getting club documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
};

/**
 * Get all documents for a user (regular users)
 * @param {string} userId - User ID
 * @param {number} maxResults - Maximum number of results (default: 100)
 * @returns {Promise<Array>} Array of documents
 */
export const getUserDocuments = async (userId, maxResults = 100) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const documentsRef = collection(db, 'documents');
    const q = query(
      documentsRef,
      where('userId', '==', userId),
      orderBy('scannedAt', 'desc'),
      limit(maxResults)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scannedAt: doc.data().scannedAt?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error getting user documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
};

/**
 * Get recent documents (for admin or general view)
 * @param {number} maxResults - Maximum number of results (default: 50)
 * @returns {Promise<Array>} Array of documents
 */
export const getRecentDocuments = async (maxResults = 50) => {
  try {
    const documentsRef = collection(db, 'documents');
    const q = query(
      documentsRef,
      orderBy('scannedAt', 'desc'),
      limit(maxResults)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scannedAt: doc.data().scannedAt?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error getting recent documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
};

const documentService = {
  saveDocument,
  getClubDocuments,
  getUserDocuments,
  getRecentDocuments
};

export default documentService;

