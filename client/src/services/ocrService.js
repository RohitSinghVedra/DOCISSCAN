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

// Clean and normalize text for better matching
const cleanText = (text) => {
  return text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/[<>]/g, ' ')  // Replace < > with spaces (common OCR error)
    .replace(/\$/g, '')     // Remove $ symbols (common OCR error)
    .trim();
};

// Identify document type based on text content (more flexible patterns)
const identifyDocumentType = (text) => {
  const upperText = cleanText(text).toUpperCase();
  
  // Check for Passport - multiple indicators including MRZ line
  if (upperText.includes('PASSPORT') || 
      upperText.includes('पासपोर्ट') ||
      /P<[A-Z]{3}/.test(text) ||  // MRZ line pattern: P<IND
      upperText.includes('REPUBLIC OF INDIA') ||
      upperText.includes('P<INDIAN') ||
      /\$\d{7,8}/.test(text) ||  // Passport number pattern: $1234567
      /[A-Z]\d{7,8}\b/.test(upperText)) {  // Format like A1234567
    return 'passport';
  }
  
  // Check for Aadhaar
  if (upperText.includes('AADHAAR') || 
      upperText.includes('आधार') ||
      upperText.includes('AADHAR') ||
      /\d{4}\s?\d{4}\s?\d{4}/.test(text)) {  // Aadhaar number pattern
    return 'aadhaar';
  }
  
  // Check for PAN
  if (upperText.includes('PERMANENT ACCOUNT NUMBER') || 
      upperText.includes('पैन') ||
      upperText.includes('PAN') ||
      upperText.includes('INCOME TAX') ||
      /[A-Z]{5}\d{4}[A-Z]/.test(upperText)) {  // PAN format: ABCDE1234F
    return 'pan';
  }
  
  // Check for Driving License
  if (upperText.includes('DRIVING LICENSE') || 
      upperText.includes('ड्राइविंग लाइसेंस') ||
      upperText.includes('DRIVING LICENCE') ||
      upperText.includes('DL NO') ||
      /[A-Z]{2}\d{2}\d{4}\d{7}/.test(upperText)) {  // DL format: XXYYNNNNNNNNNNN
    return 'driving_license';
  }
  
  // Check for Voter ID
  if (upperText.includes('VOTER') || 
      upperText.includes('मतदाता') ||
      upperText.includes('EPIC') ||
      upperText.includes('ELECTOR') ||
      /[A-Z]{3}\d{7}/.test(upperText)) {  // Voter ID format: XXX1234567
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
  
  // Extract Aadhaar number (12 digits in various formats)
  const aadhaarPatterns = [
    /\b\d{4}\s\d{4}\s\d{4}\b/,  // Space separated
    /\b\d{12}\b/,  // No spaces
    /(?:Aadhaar|आधार)[:\s]*(\d{4}\s?\d{4}\s?\d{4})/i,
    /\b(\d{4}[-]\d{4}[-]\d{4})\b/  // Hyphen separated
  ];
  
  for (const pattern of aadhaarPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.aadhaarNumber = (match[1] || match[0]).replace(/\s/g, ' ');
      break;
    }
  }
  
  // Extract Name - multiple patterns for Hindi/English
  const namePatterns = [
    /(?:Name|नाम)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:गया नाम|Given Name)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /\b([A-Z][A-Z]{2,}\s+[A-Z]+\s+[A-Z]+)\b/,  // Three word names
    /\b([A-Z][A-Z]{2,}\s+[A-Z]+)\b/  // Two word names
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      let name = (match[1] || match[0]).trim();
      // Skip false positives
      if (!name.match(/^(REPUBLIC|OF|INDIA|AADHAAR|आधार|GOVERNMENT|GOVT)$/i)) {
        data.name = name;
        break;
      }
    }
  }
  
  // Extract Date of Birth - multiple patterns
  const dobPatterns = [
    /(?:Date\s+of\s+Birth|DOB|जन्म\s+तिथि|Year\s+of\s+Birth)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(?:DOB)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Birth|जन्म|DOB)/i,
    /(?:Birth|जन्म)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i
  ];
  
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
        data.dateOfBirth = date;
        break;
      }
    }
  }
  
  // Extract Gender - multiple patterns including Hindi
  const genderPatterns = [
    /(?:Gender|Sex)[:\s]+([MF]|Male|Female|पुरुष|महिला)/i,
    /(?:Male|Female|पुरुष|महिला)[:\s]*([MF])/i,
    /\b([MF])\b(?:\s|.*?)(?:Gender|Sex)/i
  ];
  
  for (const pattern of genderPatterns) {
    const match = text.match(pattern);
    if (match) {
      const gender = (match[1] || match[0]).toUpperCase();
      if (gender === 'M' || gender === 'MALE' || gender.includes('पुरुष')) {
        data.gender = 'Male';
      } else if (gender === 'F' || gender === 'FEMALE' || gender.includes('महिला')) {
        data.gender = 'Female';
      }
      if (data.gender) break;
    }
  }
  
  // Extract Address - comprehensive pattern for multi-line addresses
  const addressPatterns = [
    /(?:Address|पता)[:\s]+([^\n]+(?:\n[^\n]+){0,4})/i,
    /(?:पता)[:\s]+([^\n]+(?:\n[^\n]+){0,4})/i,
    /Address[:\s]+(.+?)(?:\n\s*\n|Aadhaar|आधार|Male|Female|Gender|जन्म)/i
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) {
      let address = match[1].trim();
      // Clean up address (remove extra whitespace)
      address = address.replace(/\s+/g, ' ').replace(/\n\s*\n/g, ', ');
      if (address.length > 10) {  // Minimum address length
        data.address = address;
        break;
      }
    }
  }
  
  // Extract Pincode (6 digits)
  const pincodeMatch = text.match(/\b\d{6}\b/);
  if (pincodeMatch) {
    data.pincode = pincodeMatch[0];
  }
  
  // Extract State/District from address context
  const states = ['DELHI', 'MUMBAI', 'BANGALORE', 'CHENNAI', 'KOLKATA', 'HYDERABAD', 'PUNE', 'AHMEDABAD', 'JAIPUR', 'LUCKNOW', 'KANPUR', 'NAGPUR'];
  for (const state of states) {
    if (text.toUpperCase().includes(state)) {
      data.state = state;
      break;
    }
  }
  
  return data;
};

// Extract Passport data
const extractPassportData = (text) => {
  const data = {};
  const cleanedText = cleanText(text);

  // Extract Passport Number - handle OCR errors like $, J=, etc.
  const passportRegexes = [
    /Passport\s*(?:No|Number|#)?[:\s]*([A-Z0-9-]+)/i,
    /[=:]\s*\$?\s*([A-Z0-9]{7,9})\b/,  // Handle "J = $3879331" or "= 3879331"
    /\$\s*([0-9]{7,9})\b/,  // Handle "$3879331"
    /\b([A-Z]\d{7,9})\b/,  // Format: A12345678
    /([A-Z]\s?\d{7,9})\b/,
    /Passport\s+[A-Za-z]+\s+([A-Z0-9-]+)/i
  ];
  
  for (const regex of passportRegexes) {
    const match = cleanedText.match(regex);
    if (match) {
      let passportNum = (match[1] || match[0]).replace(/Passport\s*/i, '').replace(/\$/g, '').trim();
      if (passportNum.length >= 7 && passportNum.length <= 9) {
        data.passportNumber = passportNum;
        break;
      }
    }
  }

  // Extract Name - handle various patterns including common Indian names
  const namePatterns = [
    /(?:Given\s+Name|Given\s+Name\(s\))[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:नाम|Name)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /\b([A-Z][A-Z]{3,})\s+(?:SINGH|KUMAR|SHARMA|PATEL|RAO|REDDY|MEHTA|GUPTA|VERMA|YADAV|GUPTA|MISHRA|JHA)\b/i,
    /\b(?:SINGH|KUMAR|SHARMA|PATEL)\s+([A-Z][A-Z]{2,})\b/i,  // "SINGH ROHIT"
    /\b([A-Z]{3,})\s+(?:SINGH|KUMAR|SHARMA|PATEL|RAO|REDDY|MEHTA|GUPTA)\b/i,  // "ROHIT SINGH"
    /\b([A-Z]{3,}\s+[A-Z]{3,})\b(?!\s+(?:OF|INDIA|REPUBLIC|BIRTH|DATE))/i,  // Two uppercase words, excluding false positives
    /SINGH\s+([A-Z][A-Z]{2,})\b/i,
    /\b([A-Z]{3,})\s+SINGH\b/i
  ];
  
  for (const pattern of namePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      let name = match[1] ? match[1].trim() : match[0].trim();
      // Skip common false positives
      if (name && 
          !name.match(/^(REPUBLIC|OF|INDIA|PASSPORT|REPUBLIC OF|DATE|BIRTH|P<IND|DEHRADUN|DUBAI|M\s*\d+|गा|सिर|Ee|gi)$/i) &&
          name.length >= 3) {
        // Try to get full name if we found surname or first name
        const fullNameMatch = cleanedText.match(new RegExp(`\\b(${name}\\s+(?:SINGH|KUMAR|SHARMA|PATEL|RAO|REDDY|MEHTA|GUPTA))\\b`, 'i'));
        if (fullNameMatch) {
          name = fullNameMatch[1];
        }
        data.name = name.toUpperCase();
        break;
      }
    }
  }

  // Extract Date of Birth - look for DD/MM/YYYY or DD-MM-YYYY patterns
  const dobPatterns = [
    /(?:Date\s+of\s+Birth|DOB|जन्म\s+तिथि|Birth)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Birth|जन्म|Date\s+of\s+Birth|DOB|M\s*\d{1,2}\/\d{2}\/\d{4})/i,
    /(?:Birth|जन्म)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i,
    /\b(\d{2}\/\d{2}\/\d{4})\b(?=\s|$)/  // Standalone date pattern DD/MM/YYYY
  ];
  
  // Find all dates and use context to identify DOB
  const allDates = cleanedText.match(/\b\d{2}[-/]\d{2}[-/]\d{4}\b/g);
  if (allDates && allDates.length > 0) {
    // First date in reasonable range (1900-2010) is likely DOB
    for (const date of allDates) {
      const year = parseInt(date.split(/[-/]/)[2]);
      if (year >= 1900 && year <= 2010) {
        data.dateOfBirth = date;
        break;
      }
    }
  }
  
  // Also try keyword-based extraction
  for (const pattern of dobPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
        data.dateOfBirth = date;
        break;
      }
    }
  }

  // Extract Issue Date - look for dates near Issue keywords or before 2020
  const issueDatePatterns = [
    /(?:Date\s+of\s+Issue|Issue\s+Date|जारी\s+तिथि|Issued)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Issue|जारी|Date\s+of\s+Issue)/i,
    /(?:Issue|जारी)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i
  ];
  
  // Find dates and identify issue date (usually between 2000-2020)
  if (allDates && allDates.length >= 2) {
    for (const date of allDates) {
      const year = parseInt(date.split(/[-/]/)[2]);
      if (year >= 2000 && year <= 2020 && date !== data.dateOfBirth) {
        data.issueDate = date;
        break;
      }
    }
  }
  
  // Also try keyword-based extraction
  for (const pattern of issueDatePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/) && date !== data.dateOfBirth) {
        data.issueDate = date;
        break;
      }
    }
  }

  // Extract Expiry Date - look for dates near Expiry/Valid keywords or after 2020
  const expiryDatePatterns = [
    /(?:Date\s+of\s+Expiry|Expiry\s+Date|Expires|Valid\s+until|Valid\s+upto)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Expiry|Expires|Valid)/i
  ];
  
  // Find dates and identify expiry date (usually after 2020 or issue date + 10 years)
  if (allDates && allDates.length >= 2) {
    for (const date of allDates) {
      const year = parseInt(date.split(/[-/]/)[2]);
      if ((year >= 2020 || year >= 2025) && date !== data.dateOfBirth && date !== data.issueDate) {
        data.expiryDate = date;
        break;
      }
    }
  }
  
  // Also try keyword-based extraction
  for (const pattern of expiryDatePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/) && date !== data.dateOfBirth && date !== data.issueDate) {
        data.expiryDate = date;
        break;
      }
    }
  }

  // Extract Place of Issue - handle common Indian cities and OCR errors
  const placePatterns = [
    /(?:Place\s+of\s+Issue|Place\s+of\s+Birth|जारी\s+करने\s+का\s+स्थान)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /\b(DEHRADUN|DELHI|MUMBAI|KOLKATA|CHENNAI|BANGALORE|HYDERABAD|PUNE|AHMEDABAD|JAIPUR|LUCKNOW|KANPUR|NAGPUR|INDORE|THANE|BHOPAL|VISAKHAPATNAM|PATNA|VADODARA|GHAZIABAD|LUDHIANA|AGRA|NASHIK|FARIDABAD|MEERUT|RAJKOT|VARANASI|SRINAGAR|AMRITSAR|NOIDA|RANCHI|CHANDIGARH|JABALPUR|GWALIOR|RAIPUR|KOTA|BAREILLY|MORADABAD|MYSORE|GURGAON|ALIGARH|JALANDHAR|TIRUCHIRAPALLI|BHUBANESWAR|SALEM|WARANGAL|MIRA-BHAYANDAR|THIRUVANANTHAPURAM|BIHAR|SHARIF|SAHARANPUR|JODHPUR|DUBAI|BANGALURU)\b/i
  ];
  
  for (const pattern of placePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      let place = (match[1] || match[0]).trim();
      // Skip if it's part of a date or number
      if (!place.match(/^\d/)) {
        data.placeOfIssue = place.toUpperCase();
        break;
      }
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

  // Extract PAN Number - format: ABCDE1234F
  const panPatterns = [
    /\b[A-Z]{5}\d{4}[A-Z]\b/,
    /(?:PAN|Permanent\s+Account\s+Number|पैन)[:\s]*([A-Z]{5}\d{4}[A-Z])/i,
    /([A-Z]{5}\d{4}[A-Z])\b/
  ];
  
  for (const pattern of panPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.panNumber = match[1] || match[0];
      break;
    }
  }

  // Extract Name
  const namePatterns = [
    /(?:Name|नाम)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:Income\s+Tax\s+Department)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /\b([A-Z][A-Z]{2,}\s+[A-Z]+\s+[A-Z]+)\b/,
    /\b([A-Z][A-Z]{2,}\s+[A-Z]+)\b/
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      let name = (match[1] || match[0]).trim();
      if (!name.match(/^(INCOME|TAX|DEPARTMENT|PAN|GOVERNMENT|GOVT)$/i)) {
        data.name = name;
        break;
      }
    }
  }

  // Extract Father's Name
  const fatherNamePatterns = [
    /(?:Father'?s?\s+Name|पिता\s+का\s+नाम)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:Father)[:\s]+([A-Z][A-Z\s]{2,})/i
  ];
  
  for (const pattern of fatherNamePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.fatherName = (match[1] || match[0]).trim();
      break;
    }
  }

  // Extract Date of Birth
  const dobPatterns = [
    /(?:Date\s+of\s+Birth|DOB|जन्म\s+तिथि)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(?:Birth)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Birth|DOB)/i
  ];
  
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
        data.dateOfBirth = date;
        break;
      }
    }
  }

  return data;
};

// Extract Driving License data
const extractDrivingLicenseData = (text) => {
  const data = {};

  // Extract License Number - various formats
  const licensePatterns = [
    /\b[A-Z]{2}\d{2}\d{4}\d{7}\b/,  // Standard format: XXYYNNNNNNNNNNN
    /\b[A-Z]{2}\s?\d{2}\s?\d{4}\s?\d{7}\b/,  // With spaces
    /(?:License\s+No|DL\s+No|Driving\s+License)[:\s]*([A-Z]{2}[\s-]?\d{13})/i,
    /(?:DL\s+No)[:\s]*([A-Z]{2}\d{2}\d{4}\d{7})/i
  ];
  
  for (const pattern of licensePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.idNumber = (match[1] || match[0]).replace(/\s/g, '');
      break;
    }
  }

  // Extract Name
  const namePatterns = [
    /(?:Name|नाम)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:Licensee'?s?\s+Name)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /\b([A-Z][A-Z]{2,}\s+[A-Z]+\s+[A-Z]+)\b/,
    /\b([A-Z][A-Z]{2,}\s+[A-Z]+)\b/
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      let name = (match[1] || match[0]).trim();
      if (!name.match(/^(DRIVING|LICENSE|MOTOR|VEHICLES|TRANSPORT)$/i)) {
        data.name = name;
        break;
      }
    }
  }

  // Extract Date of Birth
  const dobPatterns = [
    /(?:Date\s+of\s+Birth|DOB|जन्म\s+तिथि)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(?:Birth)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Birth|DOB)/i
  ];
  
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
        data.dateOfBirth = date;
        break;
      }
    }
  }

  // Extract Issue Date
  const issueDatePatterns = [
    /(?:Date\s+of\s+Issue|Issued|Issue\s+Date)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(?:Issue)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i
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

  // Extract Expiry Date
  const expiryDatePatterns = [
    /(?:Valid\s+Till|Valid\s+Until|Expiry\s+Date)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(?:Valid)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i
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

  // Extract Address
  const addressPatterns = [
    /(?:Address|पता)[:\s]+([^\n]+(?:\n[^\n]+){0,3})/i,
    /(?:Residence|पता)[:\s]+([^\n]+(?:\n[^\n]+){0,3})/i
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) {
      let address = match[1].trim();
      address = address.replace(/\s+/g, ' ').replace(/\n\s*\n/g, ', ');
      if (address.length > 10) {
        data.address = address;
        break;
      }
    }
  }

  // Extract Pincode
  const pincodeMatch = text.match(/\b\d{6}\b/);
  if (pincodeMatch) {
    data.pincode = pincodeMatch[0];
  }

  return data;
};

// Extract Voter ID data
const extractVoterIDData = (text) => {
  const data = {};

  // Extract Voter ID Number - format: XXX1234567
  const voterIdPatterns = [
    /\b[A-Z]{3}\d{7}\b/,
    /(?:Voter\s+ID|EPIC\s+No|Electors\s+Photo\s+Identity\s+Card)[:\s]*([A-Z]{3}\d{7})/i,
    /(?:EPIC)[:\s]*([A-Z]{3}\d{7})/i
  ];
  
  for (const pattern of voterIdPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.idNumber = match[1] || match[0];
      break;
    }
  }

  // Extract Name
  const namePatterns = [
    /(?:Name|नाम)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:Elector'?s?\s+Name)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /\b([A-Z][A-Z]{2,}\s+[A-Z]+\s+[A-Z]+)\b/,
    /\b([A-Z][A-Z]{2,}\s+[A-Z]+)\b/
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      let name = (match[1] || match[0]).trim();
      if (!name.match(/^(ELECTION|COMMISSION|VOTER|EPIC|GOVERNMENT)$/i)) {
        data.name = name;
        break;
      }
    }
  }

  // Extract Father's/Husband's Name
  const fatherNamePatterns = [
    /(?:Father'?s?\s+Name|पिता\s+का\s+नाम)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:Husband'?s?\s+Name|पति\s+का\s+नाम)[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:Father|Husband)[:\s]+([A-Z][A-Z\s]{2,})/i
  ];
  
  for (const pattern of fatherNamePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.fatherName = (match[1] || match[0]).trim();
      break;
    }
  }

  // Extract Date of Birth
  const dobPatterns = [
    /(?:Date\s+of\s+Birth|DOB|जन्म\s+तिथि|Age)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(?:Birth)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\b/i,
    /(\d{2}[-/]\d{2}[-/]\d{4})\b(?:\s|.*?)(?:Birth|DOB|Age)/i
  ];
  
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = match[1] || match[0];
      if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
        data.dateOfBirth = date;
        break;
      }
    }
  }

  // Extract Address
  const addressPatterns = [
    /(?:Address|पता)[:\s]+([^\n]+(?:\n[^\n]+){0,4})/i,
    /(?:Electoral\s+Roll|Address)[:\s]+([^\n]+(?:\n[^\n]+){0,3})/i
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) {
      let address = match[1].trim();
      address = address.replace(/\s+/g, ' ').replace(/\n\s*\n/g, ', ');
      if (address.length > 10) {
        data.address = address;
        break;
      }
    }
  }

  // Extract Gender
  const genderMatch = text.match(/(?:Sex|Gender)[:\s]+([MF]|Male|Female|पुरुष|महिला)/i);
  if (genderMatch) {
    const gender = genderMatch[1].toUpperCase();
    if (gender === 'M' || gender === 'MALE' || gender.includes('पुरुष')) {
      data.gender = 'Male';
    } else if (gender === 'F' || gender === 'FEMALE' || gender.includes('महिला')) {
      data.gender = 'Female';
    }
  }

  // Extract Assembly/Constituency
  const assemblyMatch = text.match(/(?:Assembly|Constituency)[:\s]+([A-Z][A-Z\s]{2,})/i);
  if (assemblyMatch) {
    data.otherInfo1 = (assemblyMatch[1] || assemblyMatch[0]).trim();
  }

  // Extract Pincode
  const pincodeMatch = text.match(/\b\d{6}\b/);
  if (pincodeMatch) {
    data.pincode = pincodeMatch[0];
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

