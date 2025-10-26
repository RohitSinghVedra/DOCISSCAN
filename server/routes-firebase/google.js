const express = require('express');
const { google } = require('googleapis');
const { verifyFirebaseToken } = require('../middleware-firebase/auth');
const { db } = require('../firebase-config');
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Get Google OAuth URL
router.get('/oauth/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.file'
    ]
  });
  res.json({ url });
});

// OAuth callback
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    
    oauth2Client.setCredentials(tokens);
    
    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    res.json({
      tokens,
      email: userInfo.data.email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Connect Google account and create spreadsheet
router.post('/connect', verifyFirebaseToken, async (req, res) => {
  try {
    const { accessToken, refreshToken, email } = req.body;
    const { userId } = req;
    
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    
    // Create a new spreadsheet for the user
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: 'ID Document Scans',
          locale: 'en_US',
          timeZone: 'America/Los_Angeles',
          autoRecalc: 'ON_CHANGE',
          defaultFormat: {
            numberFormat: {
              type: 'NUMBER',
              pattern: '#,##0.00'
            }
          }
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
    
    const spreadsheetId = spreadsheet.data.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    // Set up headers for the spreadsheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Documents!A1:Q1',
      valueInputOption: 'RAW',
      requestBody: {
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
    
    // Style the header row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateCells: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 17
              },
              rows: [{
                values: Array(17).fill({
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      bold: true,
                      fontSize: 11
                    }
                  }
                })
              }],
              fields: 'userEnteredFormat'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 17
              },
              properties: {
                pixelSize: 120
              },
              fields: 'pixelSize'
            }
          }
        ]
      }
    });
    
    // Save user data with spreadsheet ID
    await db.collection('users').doc(userId).set({
      googleAccount: {
        accessToken,
        refreshToken,
        email,
        connected: true
      },
      spreadsheetId,
      spreadsheetUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    
    res.json({ 
      message: 'Google account connected and spreadsheet created successfully',
      spreadsheetId,
      spreadsheetUrl
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get connection status
router.get('/status', verifyFirebaseToken, async (req, res) => {
  try {
    const { userId } = req;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.json({ connected: false });
    }
    
    const userData = userDoc.data();
    res.json({ 
      connected: userData?.googleAccount?.connected || false,
      spreadsheetId: userData?.spreadsheetId,
      spreadsheetUrl: userData?.spreadsheetUrl
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save document to Google Sheets
router.post('/sheets/save', verifyFirebaseToken, async (req, res) => {
  try {
    const { data } = req.body;
    const { userId } = req;
    
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.googleAccount?.connected) {
      return res.status(400).json({ message: 'Google account not connected' });
    }
    
    const spreadsheetId = userData.spreadsheetId;
    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet not found' });
    }
    
    oauth2Client.setCredentials({
      access_token: userData.googleAccount.accessToken,
      refresh_token: userData.googleAccount.refreshToken
    });
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    // Extract and structure data for sheets
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
    
    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Documents!A2',
      valueInputOption: 'RAW',
      resource: { values }
    });
    
    res.json({ 
      message: 'Data saved to Google Sheets successfully',
      spreadsheetUrl: userData.spreadsheetUrl
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
