/**
 * Google OAuth and Sheets API Service
 * Handles Google authentication and Sheets operations directly from frontend
 */

import { gapi } from 'gapi-script';

// Initialize Google API Client
export const initGoogleAPI = () => {
  return new Promise((resolve, reject) => {
    const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
    const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    
    if (!CLIENT_ID) {
      reject(new Error('Google Client ID not configured'));
      return;
    }

    // Log for debugging
    console.log('Initializing Google API with Client ID:', CLIENT_ID.substring(0, 30) + '...');
    console.log('Current origin:', window.location.origin);

    gapi.load('client:auth2', () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email'
      }).then(() => {
        console.log('Google API initialized successfully');
        resolve(gapi);
      }).catch((error) => {
        console.error('Google API initialization error:', error);
        console.error('Error details:', {
          error: error.error,
          details: error.details,
          message: error.message
        });
        reject(error);
      });
    });
  });
};

// Sign in user with Google
export const signInGoogle = async () => {
  try {
    await initGoogleAPI();
    const authInstance = gapi.auth2.getAuthInstance();
    const response = await authInstance.signIn();
    return response;
  } catch (error) {
    throw error;
  }
};

// Sign out user
export const signOutGoogle = async () => {
  try {
    const authInstance = gapi.auth2.getAuthInstance();
    await authInstance.signOut();
  } catch (error) {
    throw error;
  }
};

// Check if user is signed in
export const isSignedIn = () => {
  try {
    const authInstance = gapi.auth2.getAuthInstance();
    return authInstance.isSignedIn.get();
  } catch (error) {
    return false;
  }
};

// Get current user
export const getCurrentUser = () => {
  try {
    const authInstance = gapi.auth2.getAuthInstance();
    const user = authInstance.currentUser.get();
    return user;
  } catch (error) {
    return null;
  }
};

// Create a new spreadsheet for the user
export const createSpreadsheet = async (title = 'ID Document Scans') => {
  try {
    const response = await gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: title,
          locale: 'en_US',
          timeZone: 'America/Los_Angeles'
        },
        sheets: [{
          properties: {
            title: 'Documents',
            gridProperties: {
              rowCount: 1000,
              columnCount: 20,
              frozenRowCount: 1
            }
          }
        }]
      }
    });

    const spreadsheetId = response.result.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    // Set up headers
    await setupSpreadsheetHeaders(spreadsheetId);

    return { spreadsheetId, spreadsheetUrl };
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
};

// Set up headers for the spreadsheet
const setupSpreadsheetHeaders = async (spreadsheetId) => {
  try {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Documents!A1:Q1',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          'Timestamp',
          'Document Type',
          'Name',
          'ID Number',
          'Date of Birth',
          'Gender',
          'Address',
          'Father Name',
          'Nationality',
          'Issue Date',
          'Expiry Date',
          'District',
          'State',
          'Pincode',
          'Other Info 1',
          'Other Info 2',
          'Raw Text'
        ]]
      }
    });
  } catch (error) {
    console.error('Error setting up headers:', error);
  }
};

// Append data to spreadsheet
export const appendToSpreadsheet = async (spreadsheetId, data) => {
  try {
    const extractedData = data.extractedData || {};
    const values = [[
      new Date().toISOString(),
      data.documentType || '',
      extractedData.name || '',
      extractedData.idNumber || extractedData.aadhaarNumber || extractedData.passportNumber || extractedData.panNumber || '',
      extractedData.dateOfBirth || '',
      extractedData.gender || '',
      extractedData.address || '',
      extractedData.fatherName || '',
      extractedData.nationality || '',
      extractedData.issueDate || '',
      extractedData.expiryDate || '',
      extractedData.district || '',
      extractedData.state || '',
      extractedData.pincode || '',
      extractedData.otherInfo1 || '',
      extractedData.otherInfo2 || '',
      data.rawText || ''
    ]];

    const response = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Documents!A2',
      valueInputOption: 'RAW',
      resource: { values }
    });

    return response;
  } catch (error) {
    console.error('Error appending to spreadsheet:', error);
    throw error;
  }
};

const googleAuthService = {
  initGoogleAPI,
  signInGoogle,
  signOutGoogle,
  isSignedIn,
  getCurrentUser,
  createSpreadsheet,
  appendToSpreadsheet
};

export default googleAuthService;

