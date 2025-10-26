const express = require('express');
const router = express.Router();

// Firebase authentication is handled on the frontend
// This endpoint just verifies the token
router.post('/verify', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: 'ID token required' });
    }
    
    const { auth } = require('../firebase-config');
    const decodedToken = await auth.verifyIdToken(idToken);
    
    res.json({
      uid: decodedToken.uid,
      email: decodedToken.email
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
