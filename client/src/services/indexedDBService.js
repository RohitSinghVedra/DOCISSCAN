/**
 * IndexedDB Service - Local storage for documents (privacy-compliant)
 * All data stays on user's device
 */

const DB_NAME = 'IDDocScanDB';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

let db = null;

/**
 * Initialize IndexedDB
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: false
        });
        
        // Create indexes for efficient queries
        objectStore.createIndex('clubId', 'clubId', { unique: false });
        objectStore.createIndex('userId', 'userId', { unique: false });
        objectStore.createIndex('documentType', 'documentType', { unique: false });
        objectStore.createIndex('scannedAt', 'scannedAt', { unique: false });
      }
    };
  });
};

/**
 * Save document to IndexedDB
 * @param {Object} documentData - Document data
 * @returns {Promise<string>} Document ID
 */
export const saveDocument = async (documentData) => {
  try {
    const database = await initDB();
    
    const document = {
      id: documentData.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentType: documentData.documentType || 'other',
      rawText: documentData.rawText || '',
      extractedData: documentData.extractedData || {},
      clubId: documentData.clubId || null,
      userId: documentData.userId || null,
      scannedAt: documentData.scannedAt || new Date().toISOString(),
      createdAt: documentData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(document);

      request.onsuccess = () => {
        resolve(document.id);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error saving document to IndexedDB:', error);
    throw new Error(`Failed to save document: ${error.message}`);
  }
};

/**
 * Get all documents for a club
 * @param {string} clubId - Club ID
 * @returns {Promise<Array>} Array of documents
 */
export const getClubDocuments = async (clubId) => {
  try {
    if (!clubId) {
      throw new Error('Club ID is required');
    }

    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('clubId');
      const request = index.getAll(clubId);

      request.onsuccess = () => {
        const documents = request.result || [];
        // Sort by scannedAt descending
        documents.sort((a, b) => {
          const dateA = new Date(a.scannedAt || a.createdAt);
          const dateB = new Date(b.scannedAt || b.createdAt);
          return dateB - dateA;
        });
        resolve(documents);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error getting club documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
};

/**
 * Get all documents for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of documents
 */
export const getUserDocuments = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const documents = request.result || [];
        // Sort by scannedAt descending
        documents.sort((a, b) => {
          const dateA = new Date(a.scannedAt || a.createdAt);
          const dateB = new Date(b.scannedAt || b.createdAt);
          return dateB - dateA;
        });
        resolve(documents);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error getting user documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
};

/**
 * Get all documents (for admin or general view)
 * @returns {Promise<Array>} Array of all documents
 */
export const getAllDocuments = async () => {
  try {
    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const documents = request.result || [];
        // Sort by scannedAt descending
        documents.sort((a, b) => {
          const dateA = new Date(a.scannedAt || a.createdAt);
          const dateB = new Date(b.scannedAt || b.createdAt);
          return dateB - dateA;
        });
        resolve(documents);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error getting all documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
};

/**
 * Get document count for a club
 * @param {string} clubId - Club ID
 * @returns {Promise<number>} Document count
 */
export const getClubDocumentCount = async (clubId) => {
  try {
    const documents = await getClubDocuments(clubId);
    return documents.length;
  } catch (error) {
    console.error('Error getting document count:', error);
    return 0;
  }
};

/**
 * Get document count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Document count
 */
export const getUserDocumentCount = async (userId) => {
  try {
    const documents = await getUserDocuments(userId);
    return documents.length;
  } catch (error) {
    console.error('Error getting document count:', error);
    return 0;
  }
};

/**
 * Delete a document
 * @param {string} documentId - Document ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteDocument = async (documentId) => {
  try {
    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(documentId);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};

/**
 * Export all documents as JSON (for backup)
 * @param {string} clubId - Optional club ID filter
 * @param {string} userId - Optional user ID filter
 * @returns {Promise<string>} JSON string
 */
export const exportDocumentsAsJSON = async (clubId = null, userId = null) => {
  try {
    let documents;
    
    if (clubId) {
      documents = await getClubDocuments(clubId);
    } else if (userId) {
      documents = await getUserDocuments(userId);
    } else {
      documents = await getAllDocuments();
    }
    
    return JSON.stringify(documents, null, 2);
  } catch (error) {
    console.error('Error exporting documents:', error);
    throw new Error(`Failed to export documents: ${error.message}`);
  }
};

/**
 * Import documents from JSON (for restore)
 * @param {string} jsonString - JSON string of documents
 * @returns {Promise<number>} Number of documents imported
 */
export const importDocumentsFromJSON = async (jsonString) => {
  try {
    const documents = JSON.parse(jsonString);
    let imported = 0;
    
    for (const doc of documents) {
      try {
        await saveDocument(doc);
        imported++;
      } catch (error) {
        console.error('Error importing document:', error);
      }
    }
    
    return imported;
  } catch (error) {
    console.error('Error importing documents:', error);
    throw new Error(`Failed to import documents: ${error.message}`);
  }
};

const indexedDBService = {
  initDB,
  saveDocument,
  getClubDocuments,
  getUserDocuments,
  getAllDocuments,
  getClubDocumentCount,
  getUserDocumentCount,
  deleteDocument,
  exportDocumentsAsJSON,
  importDocumentsFromJSON
};

export default indexedDBService;

