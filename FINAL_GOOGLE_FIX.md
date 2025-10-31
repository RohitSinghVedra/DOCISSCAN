# Final Google OAuth Fix Checklist

## Client IDs Match ✅
You've confirmed the Client ID matches exactly. Now we need to check:

## Critical: OAuth Consent Screen Settings

### 1. Check OAuth Consent Screen
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Navigate to: **APIs & Services** → **OAuth consent screen**
3. Check the **"Authorized domains"** section

### 2. Add Authorized Domain
If `netlify.app` is NOT in the authorized domains:
1. Scroll down to **"Authorized domains"**
2. Click **"+ ADD DOMAIN"**
3. Add: `netlify.app`
4. Click **"SAVE"**

**This is REQUIRED for Google Identity Services to work!**

### 3. Verify User Type
Make sure your app is set to:
- **User Type:** Internal (if using Google Workspace) OR External (for public use)
- If External, make sure it's published or you've added yourself as a test user

### 4. Check Publishing Status
1. In OAuth consent screen, check **"Publishing status"**
2. If it says "Testing", make sure you've added your email as a test user
3. Or publish the app (if ready for production)

---

## Alternative: Try Removing GSI Script Temporarily

We're loading Google Identity Services script but using old gapi.auth2. Let's try a different approach - use ONLY gapi.auth2 without GSI.

---

## After Making Changes:

1. **Wait 10-15 minutes** for Google to propagate settings
2. **Hard refresh** browser: `Ctrl + Shift + R`
3. **Clear browser cache** (or use Incognito mode)
4. Try "Connect Google Account" again

---

## If Still Not Working:

We might need to switch to using Google Identity Services properly, or check if there are multiple OAuth clients in different Google Cloud projects.

