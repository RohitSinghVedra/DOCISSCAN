const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { verifyFirebaseToken } = require('../middleware-firebase/auth');
const { db, storage } = require('../firebase-config');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Helper function to identify document type
function identifyDocumentType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('aadhaar') || lowerText.includes('आधार')) {
    return 'aadhaar';
  }
  if (lowerText.includes('passport') || lowerText.includes('पासपोर्ट')) {
    return 'passport';
  }
  if (lowerText.includes('pan') || lowerText.includes('पैन')) {
    return 'pan';
  }
  if (lowerText.includes('driving') || lowerText.includes('ड्राइविंग')) {
    return 'driving_license';
  }
  if (lowerText.includes('voter') || lowerText.includes('मतदाता')) {
    return 'voter_id';
  }
  
  return 'other';
}

// Helper function to extract structured data
function extractDocumentData(text, documentType) {
  const data = { rawText: text };
  
  if (documentType === 'aadhaar') {
    const aadhaarRegex = /\b\d{4}\s\d{4}\s\d{4}\b/;
    const aadhaarMatch = text.match(aadhaarRegex);
    if (aadhaarMatch) data.aadhaarNumber = aadhaarMatch[0];
    
    const nameMatch = text.match(/name[:\s]+([A-Z\s]+)/i) || text.match(/नाम[:\s]+([A-Z\s]+)/i);
    if (nameMatch) data.name = nameMatch[1].trim();
    
    const dobMatch = text.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/);
    if (dobMatch) data.dateOfBirth = dobMatch[0];
    
    const genderMatch = text.match(/\b(MALE|FEMALE|M|F)\b/i);
    if (genderMatch) data.gender = genderMatch[0];
  }
  
  if (documentType === 'passport') {
    const passportRegex = /[A-Z]{1,2}\d{7,9}/;
    const passportMatch = text.match(passportRegex);
    if (passportMatch) data.passportNumber = passportMatch[0];
    
    const nameMatch = text.match(/name[:\s]+([A-Z\s]+)/i);
    if (nameMatch) data.name = nameMatch[1].trim();
    
    const nationalMatch = text.match(/nationality[:\s]+([A-Z\s]+)/i);
    if (nationalMatch) data.nationality = nationalMatch[1].trim();
  }
  
  if (documentType === 'pan') {
    const panRegex = /[A-Z]{5}\d{4}[A-Z]{1}/;
    const panMatch = text.match(panRegex);
    if (panMatch) data.panNumber = panMatch[0];
    
    const nameMatch = text.match(/name[:\s]+([A-Z\s]+)/i);
    if (nameMatch) data.name = nameMatch[1].trim();
    
    const fatherMatch = text.match(/father[:\s]+([A-Z\s]+)/i);
    if (fatherMatch) data.fatherName = fatherMatch[1].trim();
  }
  
  return data;
}

// Process document image
router.post('/process', verifyFirebaseToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }
    
    // Process image for better OCR
    const processedImage = await sharp(req.file.path)
      .greyscale()
      .normalize()
      .sharpen()
      .toBuffer();
    
    // Perform OCR with multi-language support
    const { data: { text, language, confidence } } = await Tesseract.recognize(
      processedImage,
      'eng+hin+deu',
      {
        logger: m => console.log(m)
      }
    );
    
    // Identify document type
    const documentType = identifyDocumentType(text);
    
    // Extract structured data
    const extractedData = extractDocumentData(text, documentType);
    
    // Upload image to Firebase Storage
    const bucket = storage.bucket();
    const fileName = `documents/${req.userId}/${uuidv4()}.jpg`;
    const file = bucket.file(fileName);
    
    await file.save(processedImage, {
      metadata: {
        contentType: 'image/jpeg'
      }
    });
    
    const imageUrl = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    });
    
    // Save to Firestore
    const documentData = {
      userId: req.userId,
      documentType,
      extractedData,
      imageUrl: imageUrl[0],
      timestamp: new Date(),
      language,
      confidence
    };
    
    const docRef = await db.collection('documents').add(documentData);
    
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    res.json({
      id: docRef.id,
      ...documentData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all documents
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await db.collection('documents')
      .where('userId', '==', req.userId)
      .orderBy('timestamp', 'desc')
      .get();
    
    const documents = [];
    snapshot.forEach(doc => {
      documents.push({ _id: doc.id, ...doc.data() });
    });
    
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific document
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const doc = await db.collection('documents').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const data = doc.data();
    if (data.userId !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ _id: doc.id, ...data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
