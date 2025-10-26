# Firebase Setup Guide for IDDocScan

This guide will help you set up your Firebase project and configure IDDocScan to use Firebase.

## 🚀 Quick Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `IDDocScan`
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firebase Services

#### Enable Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get Started"
3. Enable "Email/Password" sign-in method
4. Save

#### Enable Firestore Database
1. Go to "Firestore Database"
2. Click "Create database"
3. Select "Start in production mode"
4. Choose location (e.g., `us-central`)
5. Enable

#### Enable Storage
1. Go to "Storage"
2. Click "Get started"
3. Start in production mode
4. Use default rules
5. Choose location (same as Firestore)

### 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click on Web icon (</>)
4. Register app with nickname: "IDDocScan Web"
5. Copy the Firebase configuration object

### 4. Get Service Account (for Backend)

1. In Project Settings, go to "Service accounts"
2. Click "Generate new private key"
3. Save the JSON file securely
4. You'll need values from this file

### 5. Configure Environment Variables

#### Backend (.env)
Create `server/.env`:

```env
# Server
PORT=5000

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Google OAuth (for Google Sheets)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/oauth/callback
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
```

#### Frontend (.env)
Create `client/.env`:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 6. Configure Firestore Security Rules

Go to Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Documents collection
    match /documents/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Allow read for own documents
    match /documents/{documentId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 7. Configure Storage Security Rules

Go to Storage > Rules:

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

### 8. Install Firebase Dependencies

```bash
# Install frontend dependencies
cd client
npm install firebase

# Install backend dependencies
cd ../server
npm install firebase-admin
```

### 9. Rename Files (Firebase Version)

```bash
# Backend
cd server
mv package.json package-mongodb.json
mv package-firebase.json package.json
mv index.js index-mongodb.js
mv index-firebase.js index.js

# Create routes directory if not exists
mkdir -p routes-firebase
mkdir -p middleware-firebase
```

### 10. Start the Application

```bash
# From root directory
npm run dev
```

## 🔧 Troubleshooting

### "Firebase not initialized"
- Check if `.env` files are created
- Verify all Firebase config values are correct
- Ensure no quotes around values in `.env`

### "Permission denied" errors
- Check Firestore and Storage security rules
- Verify user authentication
- Check Firebase console for errors

### Private Key Issues
- Remove `\n` from private key in `.env` (keep escaped versions: `\\n`)
- Ensure key is wrapped in double quotes
- Verify key from service account JSON

### Authentication Not Working
- Enable Email/Password in Firebase Console
- Check browser console for errors
- Verify Firebase config in client `.env`

## 📋 Checklist

- [ ] Firebase project created
- [ ] Authentication enabled (Email/Password)
- [ ] Firestore database created
- [ ] Storage enabled
- [ ] Service account key downloaded
- [ ] Backend `.env` configured
- [ ] Frontend `.env` configured
- [ ] Security rules updated
- [ ] Dependencies installed
- [ ] Application tested

## 🎯 Benefits of Using Firebase

✅ **No MongoDB needed** - Use Firestore  
✅ **Built-in Authentication** - No JWT management  
✅ **Cloud Storage** - Automatic file hosting  
✅ **Real-time updates** - Live data sync  
✅ **Scalable** - Automatic scaling  
✅ **Secure** - Google-grade security  
✅ **Free tier** - Generous free quota  

## 📚 Next Steps

1. Test authentication flow
2. Connect Google account for Sheets
3. Scan a test document
4. Verify data in Firestore
5. Check Storage for images

For detailed project setup, see **SETUP_GUIDE.md**
