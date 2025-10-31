# Fix: Add Google OAuth Origin

## The Error
```
idpiframe_initialization_failed: Not a valid origin for the client
```

This means `https://docidscan.netlify.app` is **NOT registered** in Google Cloud Console.

## Step-by-Step Fix:

### 1. Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Make sure you're in the **correct project** (the one where your OAuth Client ID is created)

### 2. Navigate to APIs & Services
1. Click on **"APIs & Services"** in the left menu
2. Click on **"Credentials"**

### 3. Find Your OAuth 2.0 Client ID
1. Look for your OAuth 2.0 Client ID (the one that starts with `29205515218-569...`)
2. Click on it to **Edit**

### 4. Add Authorized JavaScript Origins
In the **"Authorized JavaScript origins"** section:

1. Click **"+ ADD URI"**
2. Add this **exact URL** (copy-paste to avoid typos):
   ```
   https://docidscan.netlify.app
   ```
   ⚠️ **Important:**
   - Must start with `https://`
   - Must NOT end with `/`
   - Must be exactly: `https://docidscan.netlify.app`

### 5. Add Authorized Redirect URIs (if needed)
While you're here, also check **"Authorized redirect URIs"**:

1. Make sure this is included:
   ```
   https://docidscan.netlify.app
   ```
2. You might also want to add:
   ```
   https://docidscan.netlify.app/dashboard
   ```
   ```
   https://docidscan.netlify.app/api/google/oauth/callback
   ```

### 6. Save Changes
1. Click **"SAVE"** at the bottom
2. Wait a few seconds for Google to update (usually instant, but can take up to 5 minutes)

### 7. Test
1. Go back to your app: https://docidscan.netlify.app
2. **Hard refresh** your browser: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
3. Try clicking **"Connect Google Account"** again

---

## Quick Checklist:
- [ ] Added `https://docidscan.netlify.app` to Authorized JavaScript origins
- [ ] Added `https://docidscan.netlify.app` to Authorized redirect URIs
- [ ] Saved changes in Google Cloud Console
- [ ] Hard refreshed browser (`Ctrl + Shift + R`)
- [ ] Tried "Connect Google Account" again

---

## If Still Not Working:
1. Double-check you're editing the **correct OAuth Client ID** (the one in your Netlify env vars)
2. Make sure there are **no typos** in the origin URL
3. Try using **Incognito/Private window** to bypass cache
4. Wait 2-3 minutes and try again (sometimes Google needs time to propagate)

