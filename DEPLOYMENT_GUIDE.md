# Complete Deployment Guide - IDDocScan to Netlify

## Overview
This guide will help you deploy IDDocScan to Netlify with Firebase and Google OAuth integration.

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Name it: `DOCISSCAN` or `IDDocScan`
4. Disable Google Analytics (optional)
5. Click "Create project"

### 1.2 Enable Firebase Services

#### Enable Authentication
1. In Firebase Console → Authentication
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. Save

#### Enable Firestore Database
1. Firebase Console → Firestore Database
2. Click "Create database"
3. Select "Start in production mode"
4. Choose location: `us-central` or nearest region
5. Click "Enable"

#### Enable Storage
1. Firebase Console → Storage
2. Click "Get started"
3. Start in production mode
4. Use default rules
5. Click "Done"

### 1.3 Get Firebase Configuration

#### Web App Config (for Frontend)
1. Firebase Console → Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click Web icon (`</>`)
4. Register app nickname: "DOCISSCAN Web"
5. **Copy the config** - you'll need this for Netlify environment variables

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

#### Service Account (for Backend)
1. Firebase Console → Project Settings
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file
5. **Save these values** for backend environment variables:
   - `project_id`
   - `private_key`
   - `client_email`
   - Storage bucket name

### 1.4 Configure Firestore Security Rules
Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /documents/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 1.5 Configure Storage Rules
Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 2: Google Cloud OAuth Setup

### 2.1 Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (or create new)
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Application type: **Web application**
6. Name: `DOCISSCAN Web Client`
7. **Authorized JavaScript origins:**
   ```
   https://your-app.netlify.app
   http://localhost:3000
   ```
8. **Authorized redirect URIs:**
   ```
   https://your-backend.netlify.app/api/google/oauth/callback
   http://localhost:5000/api/google/oauth/callback
   ```
9. Click "Create"
10. **Copy Client ID and Client Secret**

### 2.2 Enable Required APIs
1. Google Cloud Console → "APIs & Services" → "Library"
2. Enable these APIs:
   - ✅ Google Sheets API
   - ✅ Google Drive API

## Step 3: Prepare for Netlify Deployment

### 3.1 Backend Environment Variables (Netlify Functions)
Create `netlify.toml` in project root:

```toml
[build]
  publish = "client/build"
  command = "cd client && npm install && npm run build"

[[plugins]]
  package = "@netlify/plugin-labs"

[functions]
  directory = "server"
  node_bundler = "esbuild"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200
```

### 3.2 Update server/index.js for Netlify
The current `server/index-firebase.js` should work with Netlify Functions.

### 3.3 Environment Variables for Netlify
You'll set these in Netlify dashboard:

**Frontend Environment Variables:**
```
REACT_APP_FIREBASE_API_KEY=AIza...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
REACT_APP_API_URL=https://your-backend.netlify.app
```

**Backend Environment Variables:**
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-backend.netlify.app/api/google/oauth/callback
```

## Step 4: Deploy to Netlify

### Option A: Deploy via Netlify CLI
1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Deploy:
   ```bash
   netlify deploy --prod
   ```

### Option B: Deploy via GitHub (Recommended)
1. Go to [Netlify](https://netlify.com)
2. Sign up/Login
3. Click "Add new site" → "Import an existing project"
4. Choose "GitHub"
5. Authorize Netlify to access your GitHub
6. Select repository: `RohitSinghVedra/DOCISSCAN`
7. Configure build settings:
   - **Build command:** `cd client && npm install && npm run build`
   - **Publish directory:** `client/build`
8. Click "Show advanced"
9. Add environment variables (from Step 3.3)
10. Click "Deploy site"

## Step 5: Update Redirect URIs
After Netlify deployment, you'll get URLs like:
- Frontend: `https://your-app.netlify.app`
- Backend: `https://your-backend.netlify.app`

**Update Google OAuth redirect URIs:**
1. Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client
3. Add redirect URIs:
   ```
   https://your-backend.netlify.app/api/google/oauth/callback
   ```
4. Save

**Update backend `.env` redirect URI:**
```
GOOGLE_REDIRECT_URI=https://your-backend.netlify.app/api/google/oauth/callback
```

## Step 6: Test Deployment
1. Open your Netlify URL: `https://your-app.netlify.app`
2. Register an account
3. Connect Google account
4. Try scanning a document
5. Verify data appears in Google Sheets

## Troubleshooting

### Netlify Functions Not Working
- Check function logs in Netlify dashboard
- Verify `netlify.toml` configuration
- Ensure backend code is in `server/` directory

### Firebase Auth Not Working
- Verify Firebase config in Netlify environment variables
- Check authorized domains in Firebase Console
- Ensure API key is correct

### Google OAuth Failing
- Verify redirect URI matches Netlify URL
- Check Google Client ID and Secret
- Ensure APIs are enabled in Google Cloud

### CORS Issues
- Check `server/index-firebase.js` has CORS enabled
- Verify allowed origins in Netlify configuration

## Quick Reference

### Firebase Config Template
```env
# Frontend (.env in client or Netlify)
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
```

### Backend Config Template
```env
# Backend (Netlify environment variables)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

## Next Steps
1. Complete Firebase setup
2. Set up Google OAuth
3. Deploy to Netlify
4. Configure environment variables
5. Test the application
6. Share the URL!

## Important Notes
- ⚠️ Never commit `.env` files to GitHub
- ✅ All secrets go in Netlify environment variables
- ✅ Use HTTPS URLs for production
- ✅ Test locally before deploying

Need help? Check the logs in Netlify dashboard or Firebase Console.
