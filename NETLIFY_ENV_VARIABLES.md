# Netlify Environment Variables - IDDocScan

## Copy these to Netlify Environment Variables

Go to: Netlify Dashboard → Your Site → Site settings → Environment variables

### Frontend Variables (REACT_APP_*)

```
REACT_APP_FIREBASE_API_KEY=AIzaSyBEROHDreTZb7B1xaod8bJBDj4o85ieASI
```

```
REACT_APP_FIREBASE_AUTH_DOMAIN=iddocscan.firebaseapp.com
```

```
REACT_APP_FIREBASE_PROJECT_ID=iddocscan
```

```
REACT_APP_FIREBASE_STORAGE_BUCKET=iddocscan.firebasestorage.app
```

```
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=523972049807
```

```
REACT_APP_FIREBASE_APP_ID=1:523972049807:web:d0877ec150eca66eaa29fa
```

---

### Backend Variables

```
FIREBASE_PROJECT_ID=iddocscan
```

```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@iddocscan.iam.gserviceaccount.com
```

```
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDYRBkVhvYJjsmQ\na1GtRq9XoXfK2k6bM9qJ9FbC3Q9K8p5V2D1R6T8K3L9M9P5Q1R4T7K2N8M5Q9P3R\n1T6K4N7M2Q8P5R9T1K3N6M4Q7P2R8T5K9N1M3Q6P4R7T2K8N5M1Q9P3R6T4K7\nN2M8Q5P1R9T3K6N4M7Q2P8R5T1K9N3M6Q4P7R2T8K5N1M9Q3P6R4T2K7N8M1\nQ5P9R3T7K4N2M6Q8P1R5T9K3N7M4Q2P6R8T3K5N9M1Q7P4R2T6K8N3M5Q9P1\nR7T4K6N8M2Q5P3R9T8K4N1M7Q6P2R4T5K9N2M8Q1P7R3T6K4N5M9Q8P2R7T\n1K3N9M4Q6P8R2T5K7N1M3Q9P4R6T8K2N4M7Q5P1R3T9K6N8M2Q4P7R1T5K4\nN3M9Q6P2R8T7K5N1M4Q3P9R6T2K8N7M1Q5P4R3T6K9N2M8Q1P7R4T5K3N6\nM9Q2P8R7T1K4N5M3Q9P6R2T8K7N4M1Q5P3R9T6K8N2M7Q4P1R5T3K9N6M8\nQ2P7R1T4K5N3M9Q8P6R2T9K7N1M4Q3P5R8T6K4N2M7Q9P1R5T3K8N6M2Q\n4P8R7T2K5N3M9Q1P6R4T8K7N5M2Q3P9R1T6K4N8M1Q7P5R2T3K9N6M4Q8\nP2R7T5K1N3M9Q4P6R8T2K7N4M1Q5P3R9T6K8N2M7Q1P4R5T3K6N9M8Q2\nP7R1T4K5N3M9Q8P6R2T9K7N1M4Q3P5R8T6K4N2M7Q9P1R5T3K8N6M2Q4P\n8R7T2K5N3M9Q1P6R4T8K7N5M2Q3P9R1T6K4N8M1Q7P5R2T3K9N6M4Q8P\n2R7T5K1N3M9Q4P6R8T2K7N4M1Q5P3R9T6K8N2M7Q1P4R5T3K6N9M8Q2P\n-----END PRIVATE KEY-----\n
```

⚠️ **IMPORTANT:** Copy the COMPLETE private key from the JSON file. Keep it in quotes with `\n` for line breaks.

```
FIREBASE_STORAGE_BUCKET=iddocscan.firebasestorage.app
```

```
GOOGLE_CLIENT_ID=29205515218-569db55486d5apli4uqn2uvm3dqg0gbg.apps.googleusercontent.com
```

```
GOOGLE_CLIENT_SECRET=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
```

```
GOOGLE_REDIRECT_URI=https://your-app.netlify.app/api/google/oauth/callback
```

⚠️ **IMPORTANT:** Update `GOOGLE_REDIRECT_URI` after you deploy to Netlify with your actual Netlify URL.

---

## How to Add to Netlify

1. Go to https://app.netlify.com
2. Create site from GitHub
3. Select repository: `RohitSinghVedra/DOCISSCAN`
4. Before clicking "Deploy site":
   - Click "Show advanced"
   - Click "New variable" for each variable above
   - Add variable key and value
5. After deployment:
   - Get your Netlify URL (e.g., `your-app-12345.netlify.app`)
   - Update `GOOGLE_REDIRECT_URI` environment variable
   - Update redirect URI in Google Cloud Console

---

## Post-Deployment Steps

### 1. Update Google OAuth Redirect URIs
Go to: https://console.cloud.google.com/apis/credentials

1. Click on your OAuth client "DOCIDSCAN"
2. Under "Authorized redirect URIs"
3. Add: `https://your-app-12345.netlify.app/api/google/oauth/callback`
4. Save

Rationale:
Deploy to Netlify, then update the OAuth redirect URI with the actual URL.

### 2. Update Netlify Environment Variable
In Netlify dashboard:
1. Site settings → Environment variables
2. Edit `GOOGLE_REDIRECT_URI`
3. Set to your actual Netlify URL
4. Redeploy if needed

---

## Quick Deploy Steps

1. **Go to Netlify:** https://app.netlify.com
2. **Sign in with GitHub**
3. **Click:** "Add new site" → "Import an existing project"
4. **Select:** GitHub → Select repository `DOCISSCAN`
5. **Build settings:**
   - Build command: `cd client && npm install && npm run build`
   - Publish directory: `client/build`
6. **Add environment variables** (all from above)
7. **Deploy site**
8. **Wait for build to complete** (~2-3 minutes)
9. **Get your Netlify URL**
10. **Update redirect URIs** (Google Cloud + Netlify)

---

## Build Settings Summary

```
Build command: cd client && npm install && npm run build
Publish directory: client/build
Branch: main
```

---

## Troubleshooting

### Build Fails?
- Check build logs in Netlify
- Ensure all environment variables are added
- Check for typos in variable names

### OAuth Not Working?
- Verify redirect URI matches Netlify URL
- Check Google Cloud Console credentials
- Ensure Google Sheets API is enabled

### Firebase Errors?
- Verify all REACT_APP_FIREBASE_* variables are set
- Check Firebase project ID matches
- Verify service account credentials

Need help? Check the build logs in Netlify dashboard!

