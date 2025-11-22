# Fix for 401 Unauthorized Error

## Problem
You're getting a `401 Unauthorized` error when trying to create or access Google Sheets. This happens because:
1. **Access tokens expire** (usually after 1 hour)
2. The system wasn't automatically refreshing expired tokens

## Solution Implemented

I've added **automatic token refresh** functionality. When an access token expires, the system will:
1. Detect the 401 error
2. Automatically use the refresh token to get a new access token
3. Retry the API call

## What You Need to Do

### 1. Ensure Refresh Tokens Are Stored

For each nightclub, you need **BOTH** tokens:
- ✅ **Access Token** (expires in ~1 hour)
- ✅ **Refresh Token** (long-lived, used to get new access tokens)

**To get both tokens:**
1. Use **Google OAuth Playground** (see `OAUTH_TOKEN_SETUP.md`)
2. Make sure you copy **BOTH** the access token AND refresh token
3. Add both to the nightclub in Admin Dashboard

### 2. Add Client Secret to Netlify

The token refresh requires your Google OAuth Client Secret:

1. Go to **Netlify Dashboard** → Your site → **Site settings** → **Environment variables**
2. Add:
   - **Key**: `REACT_APP_GOOGLE_CLIENT_SECRET`
   - **Value**: Your Google OAuth Client Secret (from Google Cloud Console)
3. **Redeploy** your site

**To find your Client Secret:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Copy the **Client secret**

### 3. Verify Nightclub Tokens

1. Go to **Admin Dashboard**
2. Click **Edit** on the nightclub (e.g., "V1")
3. Check that **both** fields are filled:
   - ✅ Access Token
   - ✅ Refresh Token
4. If refresh token is missing, regenerate using OAuth Playground

## How It Works Now

1. **First API call**: Uses stored access token
2. **If token expired (401)**: Automatically refreshes using refresh token
3. **Retries API call**: With new access token
4. **User sees**: Seamless operation (no errors)

## Testing

1. Log in as a nightclub user (e.g., "V1")
2. Go to Dashboard
3. If spreadsheet doesn't exist, it should create automatically
4. If you see errors, check:
   - ✅ Refresh token is stored in Firestore
   - ✅ `REACT_APP_GOOGLE_CLIENT_SECRET` is set in Netlify
   - ✅ Tokens were generated using OAuth Playground

## Error Messages

### "Refresh token not available"
→ Add refresh token to nightclub in Admin Dashboard

### "OAuth credentials not configured"
→ Add `REACT_APP_GOOGLE_CLIENT_SECRET` to Netlify environment variables

### "Refresh token expired or invalid"
→ Regenerate tokens using OAuth Playground

## Security Note

⚠️ **Important**: Storing `CLIENT_SECRET` in frontend environment variables is not ideal for production. For better security, consider:
- Using a backend service to handle token refresh
- Using Google Service Account instead of OAuth tokens

For now, this solution works but keep the client secret secure.

