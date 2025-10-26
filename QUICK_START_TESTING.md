# Quick Start Testing Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Dependencies
```bash
npm run install-all
```

### Step 2: Configure Firebase & Google

#### Backend (.env)
Create `server/.env`:
```env
PORT=5000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/oauth/callback
```

#### Frontend (.env)
Create `client/.env`:
```env
REACT_APP_FIREBASE_API_KEY=your-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### Step 3: Start App
```bash
npm run dev
```

Opens at: http://localhost:3000

### Step 4: Test Flow

1. **Register** → Email + Password
2. **Connect Google** → Grant permissions
3. **Sheet Created** → Auto-created "ID Document Scans"
4. **Scan Document**:
   - 📷 Camera: Start → Capture → Process
   - 📁 Upload: Select → Review → Process
5. **View Sheet** → Click "Open Google Sheet"

### What to Test

✅ **Upload Mode**
- Click Upload button
- Select image file
- Preview appears
- Click "Scan Document"
- Saves to Google Sheets

✅ **Camera Mode**
- Click Camera button
- Click "Start Camera"
- Capture photo
- Preview appears
- Click "Scan Document"
- Saves to Google Sheets

✅ **Google Sheets**
- Sheet auto-created
- Data appears in columns
- Headers are blue
- Timestamp included

### Troubleshooting

**Camera not working?**
- Allow browser permissions
- Try HTTPS or localhost
- Use Chrome browser

**OCR failing?**
- Use clear, well-lit images
- Wait 10-30 seconds for processing
- Check console for errors

**Sheet not created?**
- Verify Google OAuth setup
- Check redirect URI matches
- Enable Google Sheets API

### Expected Results

After scanning, you should see:
- ✅ Success notification
- ✅ Data in Google Sheet
- ✅ Proper column headers
- ✅ All fields populated

### Test Different Documents

1. **Aadhaar** → Extracts: Name, Number, DOB
2. **Passport** → Extracts: Name, Number, Nationality
3. **PAN** → Extracts: Name, PAN, Father Name

### Next Steps

Once testing is successful:
- Test on mobile device
- Try different document types
- Share with team for feedback

**Need help?** See `TESTING_INSTRUCTIONS.md` for detailed guide.
