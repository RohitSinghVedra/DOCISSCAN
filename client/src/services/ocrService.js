/**
 * OCR Service using Tesseract.js
 * Handles document processing and data extraction
 */

import { createWorker } from 'tesseract.js';

// Process document image with progress callback
// Create a new worker for each recognition to avoid closure/serialization issues
export const processDocument = async (imageFile, onProgress = null) => {
  let worker = null;
  let progressInterval = null;
  
  try {
    // Simulate progress updates if callback provided (since logger causes serialization issues)
    if (onProgress) {
      let simulatedProgress = 0;
      progressInterval = setInterval(() => {
        simulatedProgress = Math.min(simulatedProgress + 5, 95);
        onProgress(simulatedProgress / 100);
      }, 200);
    }
    
    // Create a fresh worker for each recognition to avoid serialization issues
    worker = await createWorker('eng+hin');
    
    // Removed logger option to avoid DataCloneError - functions cannot be serialized to Web Workers
    const { data } = await worker.recognize(imageFile);
    
    // Set progress to 100% when done
    if (onProgress) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      onProgress(1);
    }
    
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
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    throw new Error('Failed to process document: ' + errorMessage);
  } finally {
    // Clear progress interval if it exists
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    // Clean up worker after each recognition
    if (worker) {
      await worker.terminate();
    }
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

  // Extract Passport Number - various formats: A12345678, a-1234567, Passport No: A12345678, etc.
  const passportRegexes = [
    /\bPassport\s*(?:No|Number|#)?[:\s]*([A-Z0-9\-]+)/i,
    /\b[A-Z]\d{8}\b/,
    /\b[A-Z][-\s]?\d{7,9}\b/,
    /Passport\s+[A-Za-z]+\s+([A-Z0-9\-]+)/i
  ];
  
  for (const regex of passportRegexes) {
    const match = text.match(regex);
    if (match) {
      data.passportNumber = match[1] || match[0];
      data.passportNumber = data.passportNumber.replace(/Passport\s*/i, '').trim();
      break;
    }
  }

  // Extract Name - look for patterns like "Given Name(s)", "ROHIT", "Name:", etc.
  // Priority: Given Name > Name: > standalone uppercase words (2+ words)
  const namePatterns = [
    /(?:Given\s+Name|Given\s+Name\(s\))[:\s]+([A-Z\s]{3,})/i,
    /(?:नाम|Name)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /\b([A-Z][A-Z\s]{2,})\s+(?:SINGH|KUMAR|SHARMA|PATEL|RAO|REDDY|MEHTA|GUPTA)/i,
    /\b([A-Z][A-Z]{2,}\s+[A-Z]+)\b/,
    /SINGH\s+([A-Z][A-Z\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      let name = match[1].trim();
      // Skip common false positives
      if (!name.match(/^(REPUBLIC|OF|INDIA|PASSPORT|REPUBLIC OF|DATE|BIRTH)$/i)) {
        data.name = name;
        break;
      }
    }
  }

  // Extract Date of Birth - look for DD/MM/YYYY or DD-MM-YYYY patterns near Birth keywords
  const dobPatterns = [
    /(?:Date\s+of\s+Birth|DOB|जन्म\s+तिथि|Birth)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Birth|जन्म|Date\s+of\s+Birth)/i,
    /(?:Birth|जन्म)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i
  ];
  
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      // Validate date format
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
        data.dateOfBirth = date;
        break;
      }
    }
  }

  // Extract Issue Date - look for dates near Issue keywords
  const issueDatePatterns = [
    /(?:Date\s+of\s+Issue|Issue\s+Date|जारी\s+तिथि|Issued)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Issue|जारी|Date\s+of\s+Issue)/i,
    /(?:Issue|जारी)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i
  ];
  
  for (const pattern of issueDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
        data.issueDate = date;
        break;
      }
    }
  }

  // Extract Expiry Date - look for dates near Expiry/Valid keywords
  const expiryDatePatterns = [
    /(?:Date\s+of\s+Expiry|Expiry\s+Date|Expires|Valid\s+until|Valid\s+upto)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Expiry|Expires|Valid)/i
  ];
  
  for (const pattern of expiryDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
        data.expiryDate = date;
        break;
      }
    }
  }

  // Extract Place of Issue
  const placePatterns = [
    /(?:Place\s+of\s+Issue|Place\s+of\s+Birth|जारी\s+करने\s+का\s+स्थान)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:DEHRADUN|DELHI|MUMBAI|KOLKATA|CHENNAI|BANGALORE|HYDERABAD|PUNE|AHMEDABAD|JAIPUR|LUCKNOW|KANPUR|NAGPUR|INDORE|THANE|BHOPAL|VISAKHAPATNAM|PATNA|VADODARA|GHAZIABAD|LUDHIANA|AGRA|NASHIK|FARIDABAD|MEERUT|RAJKOT|VARANASI|SRINAGAR|AMRITSAR|NOIDA|RANCHI|CHANDIGARH|JABALPUR|GWALIOR|RAIPUR|KOTA|BAREILLY|MORADABAD|MYSORE|GURGAON|ALIGARH|JALANDHAR|TIRUCHIRAPALLI|BHUBANESWAR|SALEM|WARANGAL|MIRA-BHAYANDAR|THIRUVANANTHAPURAM|BIHAR|SHARIF|RAIPUR|SAHARANPUR|JODHPUR|NAGPUR|DUBAI)/i
  ];
  
  for (const pattern of placePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.placeOfIssue = match[1] || match[0];
      break;
    }
  }

  // Extract Nationality
  const nationalityPatterns = [
    /(?:Nationality)[:\s]+(?:भारतीय|Indian|INDIAN|INDIA)/i,
    /(?:भारतीय|Indian)\s*(?:\/|\|)\s*(?:Nationality|राष्ट्रीयता)?/i
  ];
  
  for (const pattern of nationalityPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (text.includes('भारतीय') || text.includes('Indian')) {
        data.nationality = 'Indian';
      }
      break;
    }
  }

  // Extract Gender/Sex
  const genderMatch = text.match(/(?:Sex|Gender)[:\s]+([MF|Male|Female|पुरुष|महिला])/i);
  if (genderMatch) {
    const gender = genderMatch[1].toUpperCase();
    if (gender.startsWith('M') || gender.includes('पुरुष')) {
      data.gender = 'Male';
    } else if (gender.startsWith('F') || gender.includes('महिला')) {
      data.gender = 'Female';
    }
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

// Cleanup (no longer needed since we create workers per recognition)
export const cleanup = async () => {
  // Workers are cleaned up after each recognition
  // This function is kept for API compatibility
};

const ocrService = {
  processDocument,
  cleanup
};

export default ocrService;

