# Firebase Quick Setup Checklist

## ✅ Step-by-Step Setup for IDDocScan

### 1. Create Firebase Project (5 min)
- [ ] Go to https://console.firebase.google.com/
- [ ] Click "Add project"
- [ ] Name: `DOCISSCAN`
- [ ] Disable Analytics
- [ ] Create project

### 2. Enable Services (5 min)

#### Authentication
- [ ] Go to Authentication → Get started
- [ ] Enable "Email/Password"
- [ ] Save

#### Firestore
- [ ] Go to Firestore Database → Create database
- [ ] Production mode
- [ ] Location: `us-central`
- [ ] Enable

#### Storage
- [ ] Go to Storage → Get started
- [ ] Production mode
- [ ] Done

### 3. Get Firebase Config (2 min)

#### Web App Config
- [ ] Go to Project Settings (gear icon)
- [ ] Scroll to "Your apps"
- [ ] Click Web icon `</>`
- [ ] Register: "DOCISSCAN Web"
- [ ] **COPY THE CONFIG** ← Save for Netlify

#### Service Account
- [ ] Project Settings → Service accounts
- [ ] Generate new private key
- [ ] Download JSON file
- [ ] **SAVE THESE VALUES** ← For backend

### 4. Set Security Rules (3 min)

#### Firestore Rules
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

#### Storage Rules
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

### 5. Google Cloud OAuth (10 min)
- [ ] Go to https://console.cloud.google.com/
- [ ] Select your Firebase project
- [ ] APIs & Services → Credentials
- [ ] Create OAuth Client ID
- [ ] Type: Web application
- [ ] Name: "DOCISSCAN Web Client"
- [ ] **Authorized origins:** 
  ```
  https://your-app.netlify.app
  http://localhost:3000
  ```
- [ ] **Redirect URIs:**
  ```
  https://your-backend.netlify.app/api/google/oauth/callback
  http://localhost:5000/api/google/oauth/callback
  ```
- [ ] Create
- [ ] **COPY Client ID and Secret**

### 6. Enable APIs (2 min)
- [ ] Google Cloud Console → APIs & Services → Library
- [ ] Enable "Google Sheets API"
- [ ] Enable "Google Drive API"

### 7. Environment Variables Checklist

#### Frontend (for Netlify)
```
✅ REACT_APP_FIREBASE_API_KEY=
✅ REACT_APP_FIREBASE_AUTH_DOMAIN=
✅ REACT_APP_FIREBASE_PROJECT_ID=
✅ REACT_APP_FIREBASE_STORAGE_BUCKET=
✅ REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
✅ REACT_APP_FIREBASE_APP_ID=
```

#### Backend (for Netlify)
```
✅ FIREBASE_PROJECT_ID=
✅ FIREBASE_CLIENT_EMAIL=
✅ FIREBASE_PRIVATE_KEY=
✅ FIREBASE_STORAGE_BUCKET=
✅ GOOGLE_CLIENT_ID=
✅ GOOGLE_CLIENT_SECRET=
✅ GOOGLE_REDIRECT_URI=
```

### 8. Deploy to Netlify
- [ ] Install Netlify CLI: `npm install -g netlify-cli`
- [ ] Login: `netlify login`
- [ ] Or deploy via GitHub in Netlify dashboard
- [ ] Add all environment variables
- [ ] Deploy!

### 9. Update OAuth Redirect (after deployment)
- [ ] Get your Netlify URL
- [ ] Update Google OAuth redirect URI
- [ ] Update backend GOOGLE_REDIRECT_URI environment variable

### 10. Test!
- [ ] Open your Netlify URL
- [ ] Register account
- [ ] Connect Google
- [ ] Scan document
- [ ] Check Google Sheets

## 🎉 You're Done!

Total time: ~30 minutes

## Need Help?
Check `DEPLOYMENT_GUIDE.md` for detailed instructions.
