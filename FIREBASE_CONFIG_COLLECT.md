# Collect Your Firebase & Google Config Values

## Step 1: Create Web App in Firebase (GET THESE VALUES)

### Go to Firebase Console:
https://console.firebase.google.com/project/iddocscan/settings/general

1. Scroll down to "Your apps" section
2. Click the **Web icon** `</>`
3. Register app nickname: "IDDocScan Web"
4. **DON'T check** "Also set up Firebase Hosting"
5. Click "Register app"

### You'll see a config like this - COPY ALL VALUES:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBEROHDreTZb7B1xaod8bJBDj4o85ieASI", // Your Web API Key
  authDomain: "iddocscan.firebaseapp.com",
  projectId: "iddocscan",
  storageBucket: "iddocscan.appspot.com", // or iddocscan.firebasestorage.app
  messagingSenderId: "523972049807",
  appId: "1:523972049807:web:xxxxxxxx"
};
```

### These will go to Netlify as:
```
REACT_APP_FIREBASE_API_KEY=AIzaSyBEROHDreTZb7B1xaod8bJBDj4o85ieASI
REACT_APP_FIREBASE_AUTH_DOMAIN=iddocscan.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=iddocscan
REACT_APP_FIREBASE_STORAGE_BUCKET=iddocscan.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=523972049807
REACT_APP_FIREBASE_APP_ID=1:523972049807:web:xxxxxxxx
```

---

## Step 2: Get Service Account Credentials (FOR BACKEND)

### Go to:
https://console.firebase.google.com/project/iddocscan/settings/serviceaccounts/adminsdk

1. Click "Generate new private key"
2. Click "Generate key"
3. Download the JSON file
4. **Open the JSON file** - you need these values:

```json
{
  "project_id": "iddocscan",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@iddocscan.iam.gserviceaccount.com"
}
```

### These will go to Netlify as:
```
FIREBASE_PROJECT_ID=iddocscan
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@iddocscan.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=iddocscan.appspot.com
```

---

## Step 3: Google OAuth Credentials (YOU ALREADY HAVE THIS!)

### Your OAuth Client ID:
```
29205515218-569db55486d5apli4uqn2uvm3dqg0gbg.apps.googleusercontent.com
```

### Get the Client Secret:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth client "DOCIDSCAN"
3. You'll see "Client secret" - **COPY IT NOW!**

### These will go to Netlify as:
```
GOOGLE_CLIENT_ID=29205515218-569db55486d5apli4uqn2uvm3dqg0gbg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://your-site.netlify.app/api/google/oauth/callback
```

⚠️ **Note:** You'll update `GOOGLE_REDIRECT_URI` after deploying to Netlify.

---

## Step 4: Complete Checklist

### Firebase Web App Config
- [ ] Created web app in Firebase
- [ ] Copied apiKey
- [ ] Copied authDomain
- [ ] Copied projectId
- [ ] Copied storageBucket
- [ ] Copied messagingSenderId
- [ ] Copied appId

### Service Account
- [ ] Downloaded service account JSON
- [ ] Copied project_id
- [ ] Copied private_key
- [ ] Copied client_email
- [ ] Know storage bucket name

### Google OAuth
- [ ] Have Client ID (already have ✓)
- [ ] Copied Client Secret
- [ ] Will add redirect URI after deployment

---

## Step 5: Deploy to Netlify

Once you have all these values:

1. Go to https://netlify.com
2. Sign up/Login with GitHub
3. Import your repository
4. Add all environment variables
5. Deploy!

Then update the Google OAuth redirect URI with your Netlify URL.

---

## Quick Reference

**Your Known Values:**
- Firebase Project: `iddocscan`
- Web API Key: `AIzaSyBEROHDreTZb7B1xaod8bJBDj4o85ieASI`
- OAuth Client ID: `29205515218-569db55486d5apli4uqn2uvm3dqg0gbg.apps.googleusercontent.com`

**Need to Get:**
- Firebase appId (from creating web app)
- Service account credentials (JSON file)
- Google Client Secret (from Google Cloud Console)

