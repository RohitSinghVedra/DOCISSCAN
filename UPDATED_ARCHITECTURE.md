# Updated Architecture - Google Sheets Only

## Changes Made Based on Requirements

### What Changed

**Before:**
- Documents stored in MongoDB/Firestore database
- Images stored in Firebase Storage
- Database records of all scans

**After:**
- No document storage in database
- No image storage
- All scanned document data saved directly to user's Google Sheet
- Each user gets their own spreadsheet upon Google account connection

## Current Flow

### 1. User Registration/Login
```
User → Firebase Auth → Dashboard
```

### 2. Connect Google Account
```
User clicks "Connect Google Account"
  ↓
OAuth flow → Google consent
  ↓
Create "ID Document Scans" spreadsheet in user's Google Drive
  ↓
Set up 17-column structure with headers:
  - Timestamp
  - Document Type
  - Name
  - ID Number
  - Date of Birth
  - Gender
  - Address
  - Father Name
  - Nationality
  - Issue Date
  - Expiry Date
  - District
  - State
  - Pincode
  - Other Info 1
  - Other Info 2
  - Raw Text
  ↓
Style headers (blue background, bold white text)
  ↓
Save spreadsheet ID and URL to user profile
```

### 3. Scan Document
```
User captures/uploads document image
  ↓
OCR processing with Tesseract.js (English + Hindi support)
  ↓
Document type detection (Aadhaar, Passport, PAN, etc.)
  ↓
Extract structured data using regex patterns
  ↓
Format data according to sheet structure (17 columns)
  ↓
Append to user's Google Sheet
  ↓
Return success with spreadsheet URL
```

## Data Flow

### Storage Strategy
- **User Profile**: Only stores Google credentials and spreadsheet ID
- **Google Sheet**: Stores all document scan data
- **No Database**: No document records in Firestore/MongoDB
- **No Storage**: No document images stored

### What's Stored Where

#### In User Profile (Firestore)
```javascript
users/{userId} {
  googleAccount: {
    accessToken: string,
    refreshToken: string,
    email: string,
    connected: boolean
  },
  spreadsheetId: string,
  spreadsheetUrl: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### In Google Sheet
```
Row 1: Headers (stylized)
Row 2+: Document scan data (one row per scan)
```

## Document Types Supported

### Aadhaar Card
Extracts: Aadhaar number, name, DOB, gender, address

### Passport
Extracts: Passport number, name, nationality, DOB, expiry

### PAN Card
Extracts: PAN number, name, DOB, father's name

### Driving License
Extracts: License number, name, address, validity

### Voter ID
Extracts: Voter ID, name, address, constituency

## API Changes

### New: Auto-Create Sheet on Connect
```
POST /api/google/connect
Response:
{
  spreadsheetId: "...",
  spreadsheetUrl: "...",
  message: "Google account connected and spreadsheet created"
}
```

### Updated: Save Document
```
POST /api/google/sheets/save
Body: { data: { documentType, extractedData, rawText } }
Response:
{
  message: "Data saved to Google Sheets",
  spreadsheetUrl: "..."
}
```

### Removed: Document Storage Endpoints
- No longer saving documents to database
- No longer storing images
- All data goes directly to Google Sheets

## Benefits

✅ **No Database Overhead** - No need to store documents  
✅ **User Ownership** - Data in their Google Drive  
✅ **Easy Access** - Users can access anytime  
✅ **Exportable** - Native Google Sheets export  
✅ **Shareable** - Users can share if needed  
✅ **Automatic Organization** - Structured columns  
✅ **Timestamped** - Automatic date/time tracking  
✅ **Reduced Costs** - No storage fees  

## Implementation Notes

### Key Files Modified

1. **server/routes-firebase/google.js**
   - Added spreadsheet creation on connect
   - 17-column header setup with styling
   - Improved data formatting for sheets

2. **server/routes-firebase/documents.js**
   - Removed Firestore storage
   - Removed Firebase Storage upload
   - Returns extracted data only

3. **Frontend Components** (to be updated)
   - Dashboard shows spreadsheet URL
   - Scan shows extracted data preview
   - Success message includes sheet link

### Environment Setup

No changes needed to .env files - same Google OAuth configuration.

### Google Cloud Permissions

Ensure these scopes are requested:
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/userinfo.email`

## User Experience

1. **Register/Login** → Dashboard
2. **Connect Google** → Sheet created automatically
3. **Scan Document** → Data saved to sheet
4. **View in Sheets** → Click link to open spreadsheet

## Next Steps

1. Update frontend to call `/api/google/sheets/save` after scanning
2. Show extracted data preview before saving
3. Display spreadsheet URL on dashboard
4. Add "Open Sheet" button for quick access
5. Remove document history view (not needed)

## Migration Path

If you want to update the current code:

1. Update `server/routes-firebase/documents.js` to return data only
2. Frontend calls `/api/google/sheets/save` after scan
3. Show success message with spreadsheet link
4. Remove document listing feature
5. Update dashboard to show sheet link

## Summary

The application now follows a **"scan-and-store-in-sheets"** model where:
- Users authenticate with Firebase
- Google Sheets created automatically per user
- All scans saved directly to user's sheet
- No backend storage of documents
- Clean, structured data in spreadsheets
