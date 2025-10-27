/**
 * OCR Service using Tesseract.js
 * Handles document processing and data extraction
 */

import Tesseract from 'tesseract.js';

// Initialize Tesseract worker
let worker = null;

const getWorker = async () => {
  if (!worker) {
    worker = await Tesseract.createWorker('eng+hin', 1, {
      logger: m => {
        // Log progress if needed
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
  }
  return worker;
};

// Process document image
export const processDocument = async (imageFile) => {
  try {
    const worker = await getWorker();
    
    const { data } = await worker.recognize(imageFile);
    
    const rawText = data.text;
    const documentType = identifyDocumentType(rawText);
    const extractedData = extractDocumentData(rawText, documentType);
    
    return {
      documentType,
      rawText,
      extractedData,
      confidence: data.confidence
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process document: ' + error.message);
  }
};

// Identify document type based on text content
const identifyDocumentType = (text) => {
  const upperText = text.toUpperCase();
  
  if (upperText.includes('AADHAAR') || upperText.includes('आधार')) {
    return 'aadhaar';
  } else if (upperText.includes('PASSPORT') || upperText.includes('पासपोर्ट')) {
    return 'passport';
  } else if (upperText.includes('PERMANENT ACCOUNT NUMBER') || upperText.includes('पैन')) {
    return 'pan';
  } else if (upperText.includes('DRIVING LICENSE') || upperText.includes('ड्राइविंग लाइसेंस')) {
    return 'driving_license';
  } else if (upperText.includes('VOTER') || upperText.includes('मतदाता')) {
    return 'voter_id';
  }
  
  return 'other';
};

// Extract structured data based on document type
const extractDocumentData = (text, documentType) => {
  const data = {};
  
  switch (documentType) {
    case 'aadhaar':
      return extractAadhaarData(text);
    case 'passport':
      return extractPassportData(text);
    case 'pan':
      return extractPANData(text);
    case 'driving_license':
      return extractDrivingLicenseData(text);
    case 'voter_id':
      return extractVoterIDData(text);
    default:
      return data;
  }
};

// Extract Aadhaar card data
const extractAadhaarData = (text) => {
  const data = {};
  
  // Extract Aadhaar number (12 digits)
  const aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/;
  const aadhaarMatch = text.match(aadhaarRegex);
  if (aadhaarMatch) {
    data.aadhaarNumber = aadhaarMatch[0];
  }
  
  // Extract name
  const nameMatch = text.match(/Name[:\s]+([A-Z\s]+)/i) || 
                    text.match(/([A-Z]+\s+[A-Z]+)/);
  if (nameMatch) {
    data.name = nameMatch[1] || nameMatch[0];
  }
  
  // Extract DOB
  const dobMatch = text.match(/(?:DOB|Date of Birth)[:\s]+(\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (dobMatch) {
    data.dateOfBirth = dobMatch[1];
  }
  
  // Extract Gender
  const genderMatch = text.match(/(?:Gender|Male|Female)[:\s]+(\w+)/i);
  if (genderMatch) {
    data.gender = genderMatch[1];
  }
  
  // Extract Address
  const addressMatch = text.match(/(?:Address)[:\s]+([^\n]+(?:\n[^\n]+){0,3})/i);
  if (addressMatch) {
    data.address = addressMatch[1];
  }
  
  return data;
};

// Extract Passport data
const extractPassportData = (text) => {
  const data = {};
  
  const passportRegex = /\b[A-Z]\d{8}\b/;
  const passportMatch = text.match(passportRegex);
  if (passportMatch) {
    data.passportNumber = passportMatch[0];
  }
  
  const nameMatch = text.match(/Name[:\s]+([A-Z\s]+)/i) || 
                    text.match(/([A-Z]+\s+[A-Z]+)/);
  if (nameMatch) {
    data.name = nameMatch[1] || nameMatch[0];
  }
  
  const dobMatch = text.match(/(?:DOB|Date of Birth)[:\s]+(\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (dobMatch) {
    data.dateOfBirth = dobMatch[1];
  }
  
  const nationalityMatch = text.match(/(?:Nationality)[:\s]+([A-Z]+)/i);
  if (nationalityMatch) {
    data.nationality = nationalityMatch[1];
  }
  
  return data;
};

// Extract PAN card data
const extractPANData = (text) => {
  const data = {};
  
  const panRegex = /\b[A-Z]{5}\d{4}[A-Z]\b/;
  const panMatch = text.match(panRegex);
  if (panMatch) {
    data.panNumber = panMatch[0];
  }
  
  const nameMatch = text.match(/Name[:\s]+([A-Z\s]+)/i) || 
                    text.match(/([A-Z]+\s+[A-Z]+)/);
  if (nameMatch) {
    data.name = nameMatch[1] || nameMatch[0];
  }
  
  const fatherNameMatch = text.match(/(?:Father's Name)[:\s]+([A-Z\s]+)/i);
  if (fatherNameMatch) {
    data.fatherName = fatherNameMatch[1];
  }
  
  const dobMatch = text.match(/(?:DOB|Date of Birth)[:\s]+(\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (dobMatch) {
    data.dateOfBirth = dobMatch[1];
  }
  
  return data;
};

// Extract Driving License data
const extractDrivingLicenseData = (text) => {
  const data = {};
  
  const licenseRegex = /\b[A-Z]{2}\d{2}\d{4}\d{7}\b/;
  const licenseMatch = text.match(licenseRegex);
  if (licenseMatch) {
    data.idNumber = licenseMatch[0];
  }
  
  const nameMatch = text.match(/Name[:\s]+([A-Z\s]+)/i) || 
                    text.match(/([A-Z]+\s+[A-Z]+)/);
  if (nameMatch) {
    data.name = nameMatch[1] || nameMatch[0];
  }
  
  const dobMatch = text.match(/(?:DOB|Date of Birth)[:\s]+(\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (dobMatch) {
    data.dateOfBirth = dobMatch[1];
  }
  
  const addressMatch = text.match(/(?:Address)[:\s]+([^\n]+(?:\n[^\n]+){0,3})/i);
  if (addressMatch) {
    data.address = addressMatch[1];
  }
  
  return data;
};

// Extract Voter ID data
const extractVoterIDData = (text) => {
  const data = {};
  
  const voterIdRegex = /\b[A-Z]{3}\d{7}\b/;
  const voterIdMatch = text.match(voterIdRegex);
  if (voterIdMatch) {
    data.idNumber = voterIdMatch[0];
  }
  
  const nameMatch = text.match(/Name[:\s]+([A-Z\s]+)/i) || 
                    text.match(/([A-Z]+\s+[A-Z]+)/);
  if (nameMatch) {
    data.name = nameMatch[1] || nameMatch[0];
  }
  
  const fatherNameMatch = text.match(/(?:Father's|Husband's) Name[:\s]+([A-Z\s]+)/i);
  if (fatherNameMatch) {
    data.fatherName = fatherNameMatch[1];
  }
  
  const addressMatch = text.match(/(?:Address)[:\s]+([^\n]+(?:\n[^\n]+){0,3})/i);
  if (addressMatch) {
    data.address = addressMatch[1];
  }
  
  return data;
};

// Cleanup worker
export const cleanup = async () => {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
};

const ocrService = {
  processDocument,
  cleanup
};

export default ocrService;

