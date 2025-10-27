# Step-by-Step: Verify All API Keys & Credentials

## Part 1: Verify Firebase Web App Config (5 minutes)

### Step 1.1: Get Firebase Web App Config
1. Go to: https://console.firebase.google.com/project/iddocscan/settings/general
2. Scroll down to "Your apps"
3. You should see a web app listed
4. Click on it or click "Add app" → Web (</>) if no app exists

### Step 1.2: Get the Firebase Config Object
1. You'll see a config object like this:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};
```

2. **WRITE DOWN EACH VALUE:**
   - apiKey: _______________________________
   - authDomain: _______________________________
   - projectId: _______________________________
   - storageBucket: _______________________________
   - messagingSenderId: _______________________________
   - appId: _______________________________

### Step 1.3: Verify in Code
Check file: `client/src/firebase-config.js` (lines 7-12)
- Do they match exactly?
- Is the apiKey the same?

---

## Part 2: Verify Service Account (for Backend) (3 minutes)

### Step 2.1: Get Service Account Credentials
1. Go to: https://console.firebase.google.com/project/iddocscan/settings/serviceaccounts/adminsdk
2. Click "Generate new private key" (even if you already have one)
3. Download the JSON file
4. Open the JSON file

### Step 2.2: Get Values from JSON
From the JSON file, copy these:
```json
{
  "project_id": "YOUR_PROJECT_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "YOUR_CLIENT_EMAIL"
}
```

**WRITE DOWN:**
- project_id: _______________________________
- client_email: _______________________________
- private_key: (First 20 chars) _______________________...

**ALSO NOTE:**
- storageBucket: _______________________________

---

## Part 3: Verify Google OAuth Credentials (3 minutes)

### Step 3.1: Get OAuth Client ID & Secret
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project "DOCIDSCAN" or "IDDOCSCAN"
3. Find "OAuth 2.0 Client IDs"
4. Click on your client (should be named something like "DOCIDSCAN" or similar)

### Step 3.2: Get the Credentials
You'll see:
- **Client ID**: _______________________________
- **Client secret**: _______________________________ (click to reveal)
- **Authorized redirect URIs**: (list them below)
  - _______________________________
  - _______________________________

---

## Part 4: Verify Netlify Environment Variables (5 minutes)

### Step 4.1: Go to Netlify
1. Go to: https://app.netlify.com/sites/docidscan/configuration/env
2. Verify you have exactly these variables

### Step 4.2: Check Each Variable

**Frontend Variables (must have "REACT_APP_" prefix):**
1. `REACT_APP_FIREBASE_API_KEY` = (should match Part 1.2 apiKey)
2. `REACT_APP_FIREBASE_AUTH_DOMAIN` = (should match Part 1.2 authDomain)
3. `REACT_APP_FIREBASE_PROJECT_ID` = (should match Part 1.2 projectId)
4. `REACT_APP_FIREBASE_STORAGE_BUCKET` = (should match Part 1.2 storageBucket)
5. `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` = (should match Part 1.2 messagingSenderId)
6. `REACT_APP_FIREBASE_APP_ID` = (should match Part 1.2 appId)

**Backend Variables:**
7. `FIREBASE_PROJECT_ID` = (should match Part 2.2 project_id)
8. `FIREBASE_CLIENT_EMAIL` = (should match Part 2.2 client_email)
9. `FIREBASE_PRIVATE_KEY` = (should match Part 2.2 private_key - particularly long, starting with -----BEGIN)
10. `FIREBASE_STORAGE_BUCKET` = (should match Part 2.2 storageBucket)
11. `GOOGLE_CLIENT_ID` = (should match Part 3.2 Client ID)
12. `GOOGLE_CLIENT_SECRET` = (should match Part 3.2 Client secret)
13. `GOOGLE_REDIRECT_URI` = (should be https://docidscan.netlify.app/api/google/oauth/callback)

---

## Common Issues to Check:

### ❌ Issue 1: Missing "REACT_APP_" prefix
- Frontend variables MUST have "REACT_APP_" prefix
- Example: `REACT_APP_FIREBASE_API_KEY` not `FIREBASE_API_KEY`

### ❌ Issue 2: Typos in Keys
- Check for extra spaces
- Check for missing letters
- Compare character by character

### ❌ Issue 3: Wrong Project ID
- Firebase: Must match "iddocscan"
- Google Cloud: Must match "DOCIDSCAN" or your project name

### ❌ Issue 4: Wrong Redirect URI
- Should be: `https://docidscan.netlify.app/api/google/oauth/callback`
- NOT: `https://TEMP.netlify.app/...`

---

## After Checking:

1. ✅ **If all match**: The code is correct, redeploy with cache clear
2. ❌ **If any mismatch**: Update the values, then redeploy
3. 🆘 **Still not working**: Share the exact values you found and I'll fix the code

---

## Quick Checklist:

- [ ] Firebase Web App Config downloaded/checked
- [ ] Service Account JSON downloaded/opened
- [ ] Google OAuth credentials checked
- [ ] All 13 Netlify environment variables present
- [ ] All values match between sources
- [ ] No typos found
- [ ] Redirect URI is correct

**Start with Part 1 now!**

