# Debugging Guide - Loading Issues

## What Failed?
Please tell me:

1. **Build Error?**
   - Check Netlify Deploys tab
   - What error message do you see?

2. **Runtime Error?**
   - Open browser console (F12)
   - What errors do you see?
   - Screenshot would help!

## Common Issues:

### Issue 1: Tesseract.js Loading
Tesseract.js downloads ~2MB of language data on first use, which might take time.

### Issue 2: gapi-script Not Loading
Check browser console for errors about `gapi` being undefined.

### Issue 3: Missing Environment Variables
Check if `REACT_APP_GOOGLE_API_KEY` is set in Netlify.

## Quick Fixes:

### Fix 1: Remove Tesseract.js Temporarily
If Tesseract.js is causing issues, we can make it optional:

1. Comment out Tesseract processing
2. Just save raw images to Sheets
3. Fix OCR later

### Fix 2: Check Browser Console
1. Open your site
2. Press F12
3. Go to Console tab
4. Screenshot the errors

### Fix 3: Check Netlify Build Logs
1. Go to Netlify → Deploys
2. Click on the failed deploy
3. Check the build log
4. Look for error messages

**Please share:**
- Screenshot of console errors
- Screenshot of build logs
- What page shows "Loading" (Dashboard? Scanning page?)

