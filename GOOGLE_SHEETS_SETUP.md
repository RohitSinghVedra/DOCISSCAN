# Google Sheets Integration - How It Works

## Overview

IDDocScan automatically creates a Google Sheet for each user when they connect their Google account. All scanned documents are saved directly to this sheet with properly structured data.

## Architecture

```
User connects Google Account
        ↓
Create Google Sheet in user's account
        ↓
Extract structured headers (Timestamp, Name, ID Number, etc.)
        ↓
Style the sheet (blue headers, proper formatting)
        ↓
Store Spreadsheet ID & URL in user profile
        ↓
When user scans document:
        ↓
Extract data via OCR
        ↓
Format data according to sheet structure
        ↓
Append to user's Google Sheet
```

## What Happens When User Connects Google

1. **Authentication**: User authorizes app to access Google Sheets
2. **Sheet Creation**: New spreadsheet titled "ID Document Scans" is created
3. **Header Setup**: 17 columns with proper headers:
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

4. **Styling**: Blue headers with white text, bold font
5. **Storage**: Spreadsheet ID and URL saved to user profile

## Document Scanning Flow

1. **User scans document** (camera or upload)
2. **OCR processing** extracts text from image
3. **Document type detection** (Aadhaar, Passport, PAN, etc.)
4. **Data extraction** using regex patterns
5. **Structured formatting** for Google Sheets
6. **Automatic append** to user's sheet
7. **Confirmation** with link to view in Sheets

## Data Structure

### Columns in Google Sheet

| Column | Example Data |
|--------|-------------|
| Timestamp | 2024-01-15T10:30:00Z |
| Document Type | aadhaar |
| Name | JOHN DOE |
| ID Number | 1234 5678 9012 |
| Date of Birth | 01/01/1990 |
| Gender | MALE |
| Address | 123 Main St, City |
| Father Name | JANE DOE |
| Nationality | INDIAN |
| Issue Date | 01/01/2020 |
| Expiry Date | 01/01/2030 |
| District | BANGALORE |
| State | KARNATAKA |
| Pincode | 560001 |
| Other Info 1 | - |
| Other Info 2 | - |
| Raw Text | Complete OCR text |

## Supported Documents

### Aadhaar Card
- Extracts: Name, Aadhaar Number, DOB, Gender, Address

### Passport
- Extracts: Name, Passport Number, Nationality, DOB, Issue/Expiry

### PAN Card
- Extracts: Name, PAN Number, DOB, Father Name

### Driving License
- Extracts: Name, License Number, DOB, Address, Validity

### Voter ID
- Extracts: Name, Voter ID, Address, Constituency

## User Experience

1. **Connect Google**: Click "Connect Google Account" on dashboard
2. **Authorize**: Grant permissions in Google popup
3. **Sheet Created**: Automatic creation of "ID Document Scans" spreadsheet
4. **Scan Documents**: Use camera or upload images
5. **View in Sheets**: Get link to view all scans in structured format
6. **No Storage**: No need for database storage, everything in Sheets

## Benefits

✅ **No Database** - All data in user's Google Sheet  
✅ **Direct Access** - Users can view/edit their data anytime  
✅ **Structured** - Proper columns and formatting  
✅ **Timestamp** - Automatic tracking of scan time  
✅ **Organized** - All scans in one place  
✅ **Exportable** - Users can export to Excel/CSV  
✅ **Shareable** - Users can share with others if needed  

## Privacy & Security

- Each user has their own spreadsheet
- Data is stored in user's Google Drive
- No backend database storage of document data
- Only spreadsheet ID stored in user profile
- User has full control over their data

## Configuration

### Required Permissions
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/userinfo.email`

### Environment Variables
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/oauth/callback
```

## Troubleshooting

**Sheet not created?**
- Check Google OAuth permissions
- Verify redirect URI in Google Cloud Console
- Check server logs for errors

**Data not saving?**
- Verify user has connected Google account
- Check spreadsheet ID in user profile
- Verify Google Sheets API is enabled

**Wrong data extracted?**
- Check document image quality
- Verify OCR is working correctly
- Adjust regex patterns in extraction function

## API Endpoints

### Connect Google Account
```
POST /api/google/connect
```
Creates spreadsheet and saves credentials

### Get Status
```
GET /api/google/status
```
Returns connection status and spreadsheet URL

### Save to Sheets
```
POST /api/google/sheets/save
```
Appends extracted data to user's sheet

## Example Response

```json
{
  "message": "Google account connected and spreadsheet created successfully",
  "spreadsheetId": "1abc...xyz",
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/1abc...xyz"
}
```
