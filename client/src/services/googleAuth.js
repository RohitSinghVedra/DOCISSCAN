/**
 * Google OAuth and Sheets API Service
 * Handles Google authentication and Sheets operations directly from frontend
 * Uses Google Identity Services (GIS) for authentication and gapi.client for Sheets API
 */

import { gapi } from 'gapi-script';

let accessToken = null;
let gapiInitialized = false;
let clubAccessToken = null; // For club accounts using pre-configured Gmail
let clubRefreshToken = null; // For club accounts - refresh token
let CLIENT_ID = null;
let CLIENT_SECRET = null;

// Initialize Google API Client for Sheets API (no auth2)
export const initGoogleAPI = () => {
  return new Promise((resolve, reject) => {
    const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
    
    if (gapiInitialized) {
      resolve(gapi);
      return;
    }

    // Initialize gapi.client without auth2 (we'll use OAuth 2.0 tokens)
    gapi.load('client', () => {
      gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
      }).then(() => {
        console.log('Google Sheets API initialized successfully');
        gapiInitialized = true;
        resolve(gapi);
      }).catch((error) => {
        console.error('Google API initialization error:', error);
        reject(error);
      });
    });
  });
};

// Sign in using OAuth 2.0 (Google Identity Services compatible)
export const signInGoogle = async () => {
  return new Promise((resolve, reject) => {
    const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error));
          return;
        }
        
        accessToken = tokenResponse.access_token;
        
        // Set token for gapi.client
        gapi.client.setToken({ access_token: accessToken });
        
        // Initialize Sheets API
        await initGoogleAPI();
        
        resolve({
          accessToken,
          expiresIn: tokenResponse.expires_in
        });
      }
    });

    tokenClient.requestAccessToken();
  });
};

// Sign out user
export const signOutGoogle = async () => {
  try {
    if (accessToken) {
      // Revoke the token
      window.google.accounts.oauth2.revoke(accessToken, () => {
        console.log('Token revoked');
      });
    }
    accessToken = null;
    gapi.client.setToken(null);
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

// Set club's pre-configured Gmail access token and refresh token
export const setClubAccessToken = async (token, refreshToken = null) => {
  try {
    clubAccessToken = token;
    clubRefreshToken = refreshToken;
    
    // Store client credentials for token refresh
    CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    CLIENT_SECRET = process.env.REACT_APP_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    
    // Initialize Google API if not already done
    await initGoogleAPI();
    
    // Set the club's token
    gapi.client.setToken({ access_token: clubAccessToken });
    
    return true;
  } catch (error) {
    console.error('Error setting club token:', error);
    throw error;
  }
};

// Refresh access token using refresh token
// SECURITY NOTE: This requires CLIENT_SECRET in frontend, which is not ideal for production.
// For production, consider using a backend service to handle token refresh.
const refreshAccessToken = async () => {
  if (!clubRefreshToken) {
    throw new Error('Refresh token not available. Please regenerate tokens using OAuth Playground.');
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('OAuth credentials not configured. Please add REACT_APP_GOOGLE_CLIENT_ID and REACT_APP_GOOGLE_CLIENT_SECRET to environment variables.');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: clubRefreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error_description || errorData.error || response.statusText;
      
      // If refresh token is invalid/expired, user needs to regenerate
      if (errorData.error === 'invalid_grant') {
        throw new Error('Refresh token expired or invalid. Please contact admin to regenerate tokens using OAuth Playground.');
      }
      
      throw new Error(`Token refresh failed: ${errorMsg}`);
    }

    const data = await response.json();
    clubAccessToken = data.access_token;
    
    // Update gapi client with new token
    gapi.client.setToken({ access_token: clubAccessToken });
    
    console.log('Access token refreshed successfully');
    return clubAccessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

// Make API call with automatic token refresh on 401
const makeAuthenticatedRequest = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    // Check if it's a 401 Unauthorized error
    // gapi.client errors can have different structures
    const is401 = 
      error.status === 401 || 
      error.code === 401 || 
      (error.result && error.result.error && error.result.error.code === 401) ||
      (error.result && error.result.error && error.result.error.status === 'UNAUTHENTICATED') ||
      (error.message && error.message.includes('401')) ||
      (error.message && error.message.includes('UNAUTHENTICATED'));
    
    if (is401) {
      console.log('Token expired (401 error), attempting to refresh...');
      
      // Only try refresh if we have a refresh token
      if (!clubRefreshToken) {
        throw new Error('Access token expired and no refresh token available. Please contact admin to regenerate tokens using OAuth Playground.');
      }
      
      // Try to refresh the token
      try {
        await refreshAccessToken();
        console.log('Retrying API call with refreshed token...');
        // Retry the API call with new token
        return await apiCall();
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        const refreshErrorMsg = refreshError?.message || 'Unknown error';
        throw new Error(`Authentication failed: ${refreshErrorMsg}`);
      }
    }
    throw error;
  }
};

// Check if user is signed in
export const isSignedIn = () => {
  return (accessToken !== null || clubAccessToken !== null) && gapi.client.getToken() !== null;
};

// Get current user
export const getCurrentUser = async () => {
  try {
    if (!isSignedIn()) {
      return null;
    }
    
    const userInfo = await gapi.client.request({
      path: 'https://www.googleapis.com/oauth2/v2/userinfo',
      method: 'GET'
    });
    
    return userInfo.result;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Create a new spreadsheet for the user
export const createSpreadsheet = async (title = 'ID Document Scans') => {
  try {
    const apiCall = () => gapi.client.sheets.spreadsheets.create({
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

    const response = await makeAuthenticatedRequest(apiCall);

    const spreadsheetId = response.result.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    // Set up headers
    await setupSpreadsheetHeaders(spreadsheetId);

    return { spreadsheetId, spreadsheetUrl };
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    const errorMessage = error?.message || error?.result?.error?.message || 'Unknown error';
    throw new Error(`Failed to create spreadsheet: ${errorMessage}`);
  }
};

// Set up headers for the spreadsheet
const setupSpreadsheetHeaders = async (spreadsheetId) => {
  try {
    const apiCall = () => gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Documents!A1:R1',
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
          'Place of Issue',
          'District',
          'State',
          'Pincode',
          'Other Info 1',
          'Other Info 2',
          'Raw Text'
        ]]
      }
    });
    
    await makeAuthenticatedRequest(apiCall);
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
      extractedData.placeOfIssue || '',
      extractedData.district || '',
      extractedData.state || '',
      extractedData.pincode || '',
      extractedData.otherInfo1 || '',
      extractedData.otherInfo2 || '',
      data.rawText || ''
    ]];

    const apiCall = () => gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Documents!A2',
      valueInputOption: 'RAW',
      resource: { values }
    });

    const response = await makeAuthenticatedRequest(apiCall);
    return response;
  } catch (error) {
    console.error('Error appending to spreadsheet:', error);
    const errorMessage = error?.message || error?.result?.error?.message || 'Unknown error';
    throw new Error(`Failed to save to spreadsheet: ${errorMessage}`);
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

