# Testing Instructions - IDDocScan

## Quick Start Testing Guide

### Prerequisites
- Node.js installed
- Firebase project set up
- Google Cloud Console configured

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment

#### Backend Configuration (server/.env)
```env
PORT=5000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/oauth/callback
```

#### Frontend Configuration (client/.env)
```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 3. Start the Application

From the root directory:
```bash
npm run dev
```

This will start:
- Backend on: http://localhost:5000
- Frontend on: http://localhost:3000

### 4. Testing Flow

#### Step 1: Register/Login
1. Open http://localhost:3000
2. Click "Register here" if new user
3. Enter email and password (min 6 characters)
4. Submit registration

#### Step 2: Connect Google Account
1. On dashboard, click "Connect Google Account"
2. You'll be redirected to Google
3. Select your Google account
4. Grant permissions:
   - View your email address
   - Create, edit, organize, and delete all your Google Sheets spreadsheets
5. You'll be redirected back with tokens
6. A Google Sheet "ID Document Scans" will be automatically created
7. You should see "✓ Connected" status

#### Step 3: Scan Document

**Option A: Upload from Gallery**
1. Click "Scan Document" on dashboard
2. Click "📁 Upload" button
3. Click "Select Image"
4. Choose a document image from your device
5. Review preview
6. Click "Scan Document"
7. Wait for processing (OCR may take 10-30 seconds)
8. Document will be saved to Google Sheets
9. Click success notification to open your sheet

**Option B: Use Camera**
1. Click "Scan Document" on dashboard
2. Click "📷 Camera" button (should be selected)
3. Click "Start Camera"
4. Allow camera permissions if prompted
5. Position document in camera view
6. Click "Capture Photo"
7. Review preview
8. Click "Scan Document"
9. Wait for processing
10. Document saved to Google Sheets

#### Step 4: View in Google Sheets
1. From dashboard, click "Open Google Sheet"
2. Sheet opens in new tab
3. Verify your document data is there
4. Check all columns are populated correctly

### 5. Testing Checklist

#### Authentication
- [ ] Can register new account
- [ ] Can login with credentials
- [ ] Dashboard shows user email
- [ ] Logout works properly

#### Google Integration
- [ ] Can initiate Google OAuth
- [ ] Google Sheet is created automatically
- [ ] "Open Google Sheet" button appears
- [ ] Button opens correct sheet

#### Document Scanning - Upload
- [ ] Can switch to upload mode
- [ ] File picker opens
- [ ] Can select image file
- [ ] Preview shows correctly
- [ ] Can retake/reselect
- [ ] Processing completes successfully
- [ ] Data saved to Google Sheets

#### Document Scanning - Camera
- [ ] Can switch to camera mode
- [ ] Camera starts on "Start Camera"
- [ ] Video feed displays properly
- [ ] Can capture photo
- [ ] Preview shows captured image
- [ ] Can retake photo
- [ ] Processing completes successfully
- [ ] Data saved to Google Sheets

#### OCR Processing
- [ ] Document type detected (Aadhaar/Passport/etc.)
- [ ] Name extracted
- [ ] ID number extracted
- [ ] Other fields extracted correctly
- [ ] Raw text available

#### Google Sheets Integration
- [ ] Headers are formatted (blue background)
- [ ] Data appears in correct columns
- [ ] Timestamp is included
- [ ] Document type is correct
- [ ] All fields populate properly
- [ ] Can scan multiple documents

### 6. Testing Different Document Types

#### Aadhaar Card
- Test with Aadhaar card image
- Verify: Name, Aadhaar Number, DOB extracted

#### Passport
- Test with passport image
- Verify: Name, Passport Number, Nationality extracted

#### PAN Card
- Test with PAN card image
- Verify: Name, PAN Number, Father's Name extracted

### 7. Common Issues & Solutions

#### Camera Not Working
- Ensure browser has camera permissions
- Try HTTPS (localhost should work fine)
- Check browser console for errors
- Try different browser (Chrome recommended)

#### OCR Failing
- Check image quality (should be clear)
- Ensure good lighting in image
- Try adjusting image angle
- Check server logs for errors

#### Google Sheet Not Created
- Verify Google OAuth permissions
- Check redirect URI matches
- Ensure Google Sheets API is enabled
- Check server logs for errors

#### Data Not Saving
- Verify Google account is connected
- Check spreadsheet ID exists in user profile
- Ensure Google Sheets API permissions
- Check network tab in browser

### 8. Expected Results

After scanning a document, your Google Sheet should have:
- Row 1: Blue headers
- Row 2+: Document data with:
  - Timestamp
  - Document Type
  - Name
  - ID Number
  - Other relevant fields
  - Raw OCR text

### 9. Performance Notes

- First scan may be slow (Tesseract downloading models)
- Subsequent scans should be faster
- Large images may take longer
- Camera capture is near-instant
- OCR processing: 10-30 seconds typically

### 10. Browser Compatibility

Recommended browsers:
- ✅ Chrome (Best support)
- ✅ Edge (Good support)
- ✅ Firefox (Good support)
- ⚠️ Safari (May have issues)

Mobile testing:
- Works on Chrome Mobile
- Camera works on mobile
- Touch-friendly interface

## Quick Command Reference

```bash
# Start everything
npm run dev

# Start backend only
cd server && npm run dev

# Start frontend only
cd client && npm start

# Check logs
# Backend logs in terminal running server
# Frontend logs in browser console (F12)
```

## Next Steps After Testing

1. Verify all features work
2. Test on mobile device
3. Try different document types
4. Check data accuracy in Google Sheets
5. Test with multiple scans
6. Share feedback or report issues
