# How to Get Google API Key

## Step-by-Step Instructions

### 1. Go to Credentials Page
- On the Google Cloud Console page you're currently on
- Click **"Credentials"** in the left sidebar (you can see it in the navigation)
- OR click the **"Credentials" tab** below the API details

### 2. Find or Create API Key

**Option A: If you already have an API key:**
- Look under "API keys" section
- Click on the API key to expand it
- Click "Edit" or the copy icon
- Copy the key value

**Option B: If you need to create one:**
1. Click **"+ CREATE CREDENTIALS"** at the top
2. Select **"API key"**
3. A new API key will be created and displayed in a popup
4. Copy the key value

### 3. Enable Required APIs (Important!)

Click on the API key to edit it, then:

1. Scroll down to **"API restrictions"**
2. Select **"Restrict key"**
3. Click **"Select APIs"**
4. Check the following:
   - ✅ Google Sheets API
   - ✅ Google Drive API
5. Click **"SAVE"**

### 4. Add to Netlify

1. Go to: https://app.netlify.com/sites/docidscan/configuration/env
2. Click **"Add a variable"**
3. Add:
   - **Key:** `REACT_APP_GOOGLE_API_KEY`
   - **Value:** Paste the API key you copied
4. Click **"Save"**

### 5. Redeploy

Go to Netlify Deploys and click "Trigger deploy" → "Deploy site"

---

## Quick Checklist:

- [ ] Went to Credentials page
- [ ] Found or created API key
- [ ] Restricted key to Google Sheets API and Google Drive API
- [ ] Copied the API key
- [ ] Added to Netlify as `REACT_APP_GOOGLE_API_KEY`
- [ ] Redeployed

---

**That's it! Your API key is ready to use.** 🎉

