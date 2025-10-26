const express = require('express');
const { google } = require('googleapis');
const auth = require('../middleware/auth');
const User = require('../models/User');
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
      'https://www.googleapis.com/auth/userinfo.email'
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

// Connect Google account
router.post('/connect', auth, async (req, res) => {
  try {
    const { accessToken, refreshToken, email } = req.body;
    
    const user = await User.findById(req.userId);
    user.googleAccount = {
      accessToken,
      refreshToken,
      email,
      connected: true
    };
    await user.save();
    
    res.json({ message: 'Google account connected successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get connection status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ connected: user.googleAccount.connected });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save document to Google Sheets
router.post('/sheets/save', auth, async (req, res) => {
  try {
    const { data, spreadsheetId } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user.googleAccount.connected) {
      return res.status(400).json({ message: 'Google account not connected' });
    }
    
    oauth2Client.setCredentials({
      access_token: user.googleAccount.accessToken,
      refresh_token: user.googleAccount.refreshToken
    });
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    // Prepare data for sheets
    const values = [[
      new Date().toISOString(),
      data.documentType || '',
      JSON.stringify(data)
    ]];
    
    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Sheet1!A:C',
      valueInputOption: 'RAW',
      resource: { values }
    });
    
    res.json({ message: 'Data saved to Google Sheets' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
