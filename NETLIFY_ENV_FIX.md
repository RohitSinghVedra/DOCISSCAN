# Fix Firebase API Key Error

## The Problem
Error: `Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`

Your `REACT_APP_FIREBASE_API_KEY` in Netlify is incorrect or truncated.

## The Fix

### Your Correct Firebase API Key:
```
AIzaSyBEROHDreTZb7B1xaod8bJBDj4o85ieASI
```

### How to Update in Netlify:

1. Go to: Netlify Dashboard → Your Site → Site settings → Environment variables
2. Find `REACT_APP_FIREBASE_API_KEY`
3. Click the edit (pencil) icon
4. Update the value to: `AIzaSyBEROHDreTZb7B1xaod8bJBDj4o85ieASI`
5. Save
6. Go to: Deploys tab → Trigger deploy → Clear cache and deploy site

Wait 2-3 minutes for the rebuild, then try registering again.

## Verify All Firebase Environment Variables

Make sure these are set correctly in Netlify:

```
REACT_APP_FIREBASE_API_KEY=AIzaSyBEROHDreTZb7B1xaod8bJBDj4o85ieASI
REACT_APP_FIREBASE_AUTH_DOMAIN=iddocscan.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=iddocscan
REACT_APP_FIREBASE_STORAGE_BUCKET=iddocscan.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=523972049807
REACT_APP_FIREBASE_APP_ID=1:523972049807:web:d0877ec150eca66eaa29fa
```

Check each one carefully!

