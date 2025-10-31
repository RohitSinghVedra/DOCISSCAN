# Google OAuth Settings Propagation

## The Issue
Even after adding `https://docidscan.netlify.app` to Google Cloud Console, the error persists. This is likely due to **propagation delay**.

## Google's Propagation Time
Google Cloud Console warns:
> "Note: It may take **five minutes to a few hours** for settings to take effect."

## What to Do:

### 1. Verify OAuth Consent Screen Settings
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Navigate to: **APIs & Services** → **OAuth consent screen**
3. Check the **"Authorized domains"** section
4. Make sure `netlify.app` is listed (or add it if missing)
5. Also check **"Authorized JavaScript origins"** are showing correctly

### 2. Wait and Test
1. **Wait at least 10-15 minutes** after making changes
2. Hard refresh your browser: `Ctrl + Shift + R` (or `Cmd + Shift + R`)
3. Try again

### 3. Check Console Logs
After the new deployment, check your browser console. You should now see:
- `Initializing Google API with Client ID: ...`
- `Current origin: https://docidscan.netlify.app`

This confirms the Client ID is being read correctly.

### 4. Verify Client ID Match
Make sure the Client ID in your **Netlify environment variables** (`REACT_APP_GOOGLE_CLIENT_ID`) **exactly matches** the one in Google Cloud Console:
- Google Console: `29205515218-569db55486d5apli4uqn2uvm3dqg0gbg.apps.googleusercontent.com`
- Netlify: Should be the same exact value

### 5. Try Incognito Mode
Sometimes browser cache causes issues:
- Open an **Incognito/Private window**
- Navigate to: https://docidscan.netlify.app
- Try connecting Google account

---

## If Still Not Working After 30 Minutes:

### Double-Check:
1. **Client ID matches exactly** between Netlify and Google Console
2. **Origin URL is exactly**: `https://docidscan.netlify.app` (no trailing slash, exact case)
3. **OAuth consent screen** has `netlify.app` in authorized domains
4. **Wait time** has passed (sometimes takes up to 2-3 hours)

### Alternative: Add Both HTTP and HTTPS (for testing)
If still not working, try adding:
- `https://docidscan.netlify.app`
- `https://www.docidscan.netlify.app` (if your domain redirects to www)

---

## Next Steps:
1. Wait 15-30 minutes after your last Google Console save
2. Hard refresh browser
3. Check console for new diagnostic logs
4. Try in Incognito mode
5. Report back with any new errors or logs

