# Add Google Client ID for Frontend

## The Issue
The error "Google Client ID not configured" means the frontend can't access the Google Client ID because it needs the `REACT_APP_` prefix.

## Quick Fix

### Step 1: Get Your Google Client ID
Your Netlify environment already has `GOOGLE_CLIENT_ID`. You need to add it again with the `REACT_APP_` prefix.

### Step 2: Add to Netlify
1. Go to: https://app.netlify.com/sites/docidscan/configuration/env
2. Click "Add a variable"
3. Add:
   - **Key:** `REACT_APP_GOOGLE_CLIENT_ID`
   - **Value:** Copy the value from your existing `GOOGLE_CLIENT_ID` variable
   - (Should look like: `29205515218-...`)
4. Save

### Step 3: Redeploy
1. Go to Deploys tab
2. Click "Trigger deploy" → "Deploy site"
3. Wait 2 minutes

---

## Alternative: Just Copy the Value

Look at your existing environment variables in Netlify:
- Find `GOOGLE_CLIENT_ID` 
- Copy its value
- Add new variable `REACT_APP_GOOGLE_CLIENT_ID` with that same value
- Save and redeploy

That's it! 🎉

