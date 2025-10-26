const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const auth = require('../middleware/auth');
const Document = require('../models/Document');
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
  
  // Extract Aadhaar details
  if (documentType === 'aadhaar') {
    const aadhaarRegex = /\b\d{4}\s\d{4}\s\d{4}\b/;
    const aadhaarMatch = text.match(aadhaarRegex);
    if (aadhaarMatch) data.aadhaarNumber = aadhaarMatch[0];
    
    // Extract name (usually after "Name" or "नाम")
    const nameMatch = text.match(/name[:\s]+([A-Z\s]+)/i) || text.match(/नाम[:\s]+([A-Z\s]+)/i);
    if (nameMatch) data.name = nameMatch[1].trim();
    
    // Extract DOB
    const dobMatch = text.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/);
    if (dobMatch) data.dateOfBirth = dobMatch[0];
    
    // Extract gender
    const genderMatch = text.match(/\b(MALE|FEMALE|M|F)\b/i);
    if (genderMatch) data.gender = genderMatch[0];
  }
  
  // Extract Passport details
  if (documentType === 'passport') {
    const passportRegex = /[A-Z]{1,2}\d{7,9}/;
    const passportMatch = text.match(passportRegex);
    if (passportMatch) data.passportNumber = passportMatch[0];
    
    const nameMatch = text.match(/name[:\s]+([A-Z\s]+)/i);
    if (nameMatch) data.name = nameMatch[1].trim();
    
    const nationalMatch = text.match(/nationality[:\s]+([A-Z\s]+)/i);
    if (nationalMatch) data.nationality = nationalMatch[1].trim();
  }
  
  // Extract PAN details
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
router.post('/process', auth, upload.single('image'), async (req, res) => {
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
      'eng+hin+deu', // English, Hindi, German
      {
        logger: m => console.log(m)
      }
    );
    
    // Identify document type
    const documentType = identifyDocumentType(text);
    
    // Extract structured data
    const extractedData = extractDocumentData(text, documentType);
    
    // Save to database
    const document = new Document({
      userId: req.userId,
      documentType,
      extractedData,
      timestamp: new Date(),
      language,
      confidence
    });
    await document.save();
    
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    res.json({
      documentType,
      extractedData,
      language,
      confidence,
      rawText: text
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all documents
router.get('/', auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.userId }).sort({ timestamp: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific document
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
