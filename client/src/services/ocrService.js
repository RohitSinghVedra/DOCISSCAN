/**
 * OCR Service - Supports multiple OCR providers
 * 1. OCR.space API (free, no API key needed)
 * 2. Google Cloud Vision API (free tier, more accurate)
 * 3. Tesseract.js (fallback, client-side only)
 */

import { createWorker } from 'tesseract.js';

// OCR Provider configuration
const OCR_PROVIDER = process.env.REACT_APP_OCR_PROVIDER || 'ocrspace'; // 'ocrspace', 'google', or 'tesseract'

// OCR.space API (free, no API key needed for basic usage)
const useOCRSpace = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('language', 'eng'); // English
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 is more accurate

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.OCRExitCode === 1 && result.ParsedResults && result.ParsedResults.length > 0) {
      return {
        text: result.ParsedResults[0].ParsedText,
        confidence: 95, // OCR.space doesn't provide confidence, estimate high
        raw: result
      };
    } else {
      throw new Error('OCR.space API error: ' + (result.ErrorMessage || 'Unknown error'));
    }
  } catch (error) {
    console.error('OCR.space API error:', error);
    throw error;
  }
};

// Google Cloud Vision API (more accurate, requires API key)
const useGoogleVision = async (imageFile) => {
  try {
    const API_KEY = process.env.REACT_APP_GOOGLE_VISION_API_KEY || process.env.REACT_APP_GOOGLE_API_KEY;
    
    if (!API_KEY) {
      throw new Error('Google Vision API key not configured');
    }

    // Convert image to base64
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION', // Better for documents
                  maxResults: 1
                }
              ],
              imageContext: {
                languageHints: ['en', 'hi'] // English and Hindi
              }
            }
          ]
        })
      }
    );

    const result = await response.json();
    
    if (result.responses && result.responses[0] && result.responses[0].fullTextAnnotation) {
      const fullText = result.responses[0].fullTextAnnotation.text;
      return {
        text: fullText,
        confidence: 90, // Google Vision provides confidence in annotations
        raw: result
      };
    } else if (result.error) {
      throw new Error('Google Vision API error: ' + JSON.stringify(result.error));
    } else {
      throw new Error('Google Vision API: No text detected');
    }
  } catch (error) {
    console.error('Google Vision API error:', error);
    throw error;
  }
};

// Preprocess image for better OCR accuracy
const preprocessImage = async (imageFile) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        // Canvas not supported, return original
        resolve(imageFile);
        return;
      }
      
      img.onload = () => {
        try {
          if (!img.width || !img.height) {
            resolve(imageFile);
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image
          ctx.drawImage(img, 0, 0);
          
          // Get image data for processing
          let imageData;
          try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          } catch (e) {
            // CORS or other error, return original
            resolve(imageFile);
            return;
          }
          
          const data = imageData.data;
          
          // Apply image enhancement
          for (let i = 0; i < data.length; i += 4) {
            // Increase contrast
            const factor = 1.5;
            const contrast = 128;
            data[i] = Math.min(255, Math.max(0, (data[i] - contrast) * factor + contrast)); // R
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - contrast) * factor + contrast)); // G
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - contrast) * factor + contrast)); // B
            
            // Convert to grayscale for better OCR
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }
          
          // Put processed image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], imageFile.name, { type: 'image/png' }));
            } else {
              resolve(imageFile); // Fallback to original
            }
          }, 'image/png');
        } catch (e) {
          console.warn('Image preprocessing error:', e);
          resolve(imageFile); // Fallback to original on error
        }
      };
      
      img.onerror = () => {
        resolve(imageFile); // Fallback to original if preprocessing fails
      };
      
      img.src = URL.createObjectURL(imageFile);
    } catch (e) {
      console.warn('Preprocessing setup error:', e);
      resolve(imageFile); // Fallback to original on any error
    }
  });
};

// Process document image with progress callback
// Uses OCR.space API (free) or Google Vision API (more accurate) or Tesseract.js (fallback)
export const processDocument = async (imageFile, onProgress = null) => {
  let worker = null;
  let progressInterval = null;
  
  try {
    if (onProgress) onProgress(0.1);
    
    let rawText = '';
    let confidence = 0;
    
    // Try OCR.space API first (free, no API key needed)
    if (OCR_PROVIDER === 'ocrspace' || !OCR_PROVIDER || OCR_PROVIDER === '') {
      try {
        if (onProgress) onProgress(0.3);
        console.log('Using OCR.space API...');
        const result = await useOCRSpace(imageFile);
        rawText = result.text;
        confidence = result.confidence;
        if (onProgress) onProgress(1);
      } catch (error) {
        console.warn('OCR.space failed, falling back to Tesseract:', error);
        // Fall through to Tesseract
      }
    }
    
    // Try Google Vision API if configured and OCR.space didn't work
    if ((!rawText || OCR_PROVIDER === 'google') && process.env.REACT_APP_GOOGLE_VISION_API_KEY) {
      try {
        if (onProgress) onProgress(0.3);
        console.log('Using Google Vision API...');
        const result = await useGoogleVision(imageFile);
        rawText = result.text;
        confidence = result.confidence;
        if (onProgress) onProgress(1);
      } catch (error) {
        console.warn('Google Vision failed, falling back to Tesseract:', error);
        // Fall through to Tesseract
      }
    }
    
    // Fallback to Tesseract.js if API methods failed or not configured
    if (!rawText || OCR_PROVIDER === 'tesseract') {
      if (onProgress) {
        let simulatedProgress = 20;
        progressInterval = setInterval(() => {
          simulatedProgress = Math.min(simulatedProgress + 5, 90);
          onProgress(simulatedProgress / 100);
        }, 200);
      }
      
      console.log('Using Tesseract.js (fallback)...');
      
      // Preprocess image for better OCR accuracy
      const processedImage = await preprocessImage(imageFile);
      if (onProgress) onProgress(0.4);
      
      // Create a fresh worker with multiple languages for Indian documents
      // eng+hin = English + Hindi (Devanagari)
      worker = await createWorker('eng+hin');
      
      // Set OCR parameters for better accuracy
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: '6', // Uniform block of text
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /:,-.()आअइईउऊएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहळक्षज्ञ'
        });
      } catch (e) {
        console.warn('Failed to set OCR parameters, using defaults:', e);
      }
      
      // Perform OCR with optimized settings
      const { data } = await worker.recognize(processedImage);
      rawText = data.text;
      confidence = data.confidence;
      
      if (onProgress) {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        onProgress(1);
      }
    }
    
    if (!rawText) {
      throw new Error('All OCR methods failed');
    }
    
    const documentType = identifyDocumentType(rawText);
    const extractedData = extractDocumentData(rawText, documentType);
    
    return {
      documentType,
      rawText,
      extractedData,
      confidence
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

  // Extract Passport Number - handle OCR errors like $, J=, T, etc.
  const passportRegexes = [
    /Passport\s*(?:No|Number|#)?[:\s]*([A-Z0-9-]+)/i,
    /[=:]\s*[A-Z]?\s*\$?\s*([0-9]{7,9})\b/,  // Handle "J = $3879331", "T 3879331", "= 3879331"
    /\$\s*([0-9]{7,9})\b/,  // Handle "$3879331"
    /\b([A-Z]\d{7,9})\b/,  // Format: A12345678 (single letter + 7-9 digits)
    /\b([A-Z]\s?\d{7,9})\b/,  // Format: "T 3879331" or "A12345678"
    /Passport\s+[A-Za-z]+\s+([A-Z0-9-]+)/i,
    // Look for passport number patterns in MRZ (Machine Readable Zone)
    /P<[A-Z]{3}[A-Z0-9]+([0-9]{7,9})/i  // MRZ format: P<INDIANNAME12345678
  ];
  
  for (const regex of passportRegexes) {
    const match = cleanedText.match(regex);
    if (match) {
      let passportNum = (match[1] || match[0]).replace(/Passport\s*/i, '').replace(/\$/g, '').replace(/^[A-Z]\s+/, '').trim(); // Remove leading letter+space
      // Extract only digits if it starts with a letter
      const digitMatch = passportNum.match(/(\d{7,9})/);
      if (digitMatch) {
        passportNum = digitMatch[1];
      }
      if (passportNum.length >= 7 && passportNum.length <= 9 && /^\d+$/.test(passportNum)) {
        data.passportNumber = passportNum;
        break;
      }
    }
  }

  // Extract Name - handle various patterns including common Indian names
  // Priority: Look for actual name patterns, not OCR artifacts
  const namePatterns = [
    /(?:Given\s+Name|Given\s+Name\(s\))[:\s]+([A-Z][A-Z\s]{2,})/i,
    /(?:नाम|Name)[:\s]+([A-Z][A-Z\s]{2,})/i,
    // Look for common Indian surname patterns followed by first name
    /\b(?:SINGH|KUMAR|SHARMA|PATEL|RAO|REDDY|MEHTA|GUPTA|VERMA|YADAV|MISHRA|JHA|SAXENA|TIWARI|JOSHI|CHAUDHARY|AGRAWAL|GUPTA|JAIN|MEHTA)\s+([A-Z][A-Z]{2,})\b/i,  // "SINGH ROHIT"
    // Look for first name followed by common surnames
    /\b([A-Z][A-Z]{3,})\s+(?:SINGH|KUMAR|SHARMA|PATEL|RAO|REDDY|MEHTA|GUPTA|VERMA|YADAV|MISHRA|JHA)\b/i,  // "ROHIT SINGH"
    // Look for full name pattern (2-3 words, all uppercase, minimum length)
    /\b([A-Z][A-Z]{3,}\s+[A-Z][A-Z]{3,}(?:\s+[A-Z][A-Z]{3,})?)\b(?=\s|$|\d|REPUBLIC|INDIA|OF|PASSPORT)/i,  // Full name, exclude if followed by false positives
    // Direct "SINGH ROHIT" or "ROHIT SINGH" pattern
    /\b(SINGH\s+[A-Z][A-Z]{2,}|[A-Z][A-Z]{2,}\s+SINGH)\b/i,
    /\b(KUMAR\s+[A-Z][A-Z]{2,}|[A-Z][A-Z]{2,}\s+KUMAR)\b/i,
    /\b(SHARMA\s+[A-Z][A-Z]{2,}|[A-Z][A-Z]{2,}\s+SHARMA)\b/i
  ];
  
  // Common false positives to exclude
  const falsePositives = /^(REPUBLIC|OF|INDIA|PASSPORT|REPUBLIC OF|DATE|BIRTH|P<IND|DEHRADUN|DUBAI|CODE|GOWNLRY|COUNTRY|COUNTRY CODE|M\s*\d+|गा|सिर|Ee|gi|SHAT|COUNTRY)$/i;
  
  for (const pattern of namePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      let name = match[1] ? match[1].trim() : match[0].trim();
      
      // Skip common false positives and validate name
      if (name && 
          !falsePositives.test(name) &&
          name.length >= 5 &&  // Minimum length for a name
          name.split(/\s+/).length >= 2 &&  // At least 2 words
          !name.match(/^\d/) &&  // Doesn't start with number
          !name.match(/[<>$]/)) {  // Doesn't contain OCR artifacts
        
        // Try to get full name if we found surname or first name
        const nameWords = name.split(/\s+/);
        if (nameWords.length === 1 || (nameWords.length === 2 && nameWords[0].length >= 3 && nameWords[1].length >= 3)) {
          // Check if we can find the reverse pattern
          const reversePattern = nameWords.length === 2 ? 
            new RegExp(`\\b(${nameWords[1]}\\s+${nameWords[0]})\\b`, 'i') :
            new RegExp(`\\b(${nameWords[0]}\\s+(?:SINGH|KUMAR|SHARMA|PATEL|RAO|REDDY|MEHTA|GUPTA))\\b`, 'i');
          
          const reverseMatch = cleanedText.match(reversePattern);
          if (reverseMatch && reverseMatch[1].length > name.length) {
            name = reverseMatch[1];
          }
        }
        
        data.name = name.toUpperCase();
        break;
      }
    }
  }
  
  // Fallback: Look for "ROHIT SINGH" style patterns if nothing found
  if (!data.name) {
    const fallbackPattern = /\b([A-Z][A-Z]{4,}\s+(?:SINGH|KUMAR|SHARMA|PATEL|RAO|REDDY|MEHTA|GUPTA|VERMA|YADAV|MISHRA|JHA))\b/i;
    const fallbackMatch = cleanedText.match(fallbackPattern);
    if (fallbackMatch) {
      let name = fallbackMatch[1].trim();
      if (!falsePositives.test(name) && name.length >= 6) {
        data.name = name.toUpperCase();
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

