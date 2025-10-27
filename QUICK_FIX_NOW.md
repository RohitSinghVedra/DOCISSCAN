# Quick Fix - Two Options

## Option 1: Verify API Key in Firebase Console (2 minutes)

1. Go to: https://console.firebase.google.com/project/iddocscan/settings/general
2. Scroll to "Your apps"
3. Click on your web app
4. **Copy the EXACT apiKey value**
5. In `client/src/firebase-config.js`, verify line 7 has that exact value

## Option 2: Force Hard Refresh (30 seconds)

The browser might still have old cached JavaScript.

1. Press `F12` to open DevTools
2. **Right-click** the refresh button (while DevTools is open)
3. Select **"Empty Cache and Hard Reload"**
4. Close DevTools and try again

## Option 3: Check Build Status

Go to Netlify → Deploys tab:
- Is the latest deploy showing "Published" (green) or still building?
- Click on the deploy to see if it succeeded

---

## What's Likely Happening:

The build shows it compiled successfully, but your browser is using old cached files. The hard refresh (Option 2) should fix it.

**Try Option 2 first - it's the quickest!**
