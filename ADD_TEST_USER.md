# Fix: Add Test User to OAuth Consent Screen

## The Error
```
Access blocked: docidscan.netlify.app has not completed the Google verification process
Error 403: access_denied
```

This means your OAuth app is in **"Testing"** mode and needs test users added.

## Solution: Add Yourself as a Test User

### Step-by-Step:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Make sure you're in the **"DOCIDSCAN"** project

2. **Navigate to OAuth Consent Screen**
   - Click on **"APIs & Services"** in the left menu
   - Click on **"OAuth consent screen"**

3. **Find "Test users" Section**
   - Scroll down to find the **"Test users"** section
   - Look for a button like **"+ ADD USERS"** or **"ADD TEST USERS"**

4. **Add Your Email**
   - Click **"+ ADD USERS"**
   - Enter your email: `rohitsingh2117@gmail.com`
   - Click **"ADD"** or **"SAVE"**

5. **Save Changes**
   - Scroll to the bottom
   - Click **"SAVE"** if needed

6. **Wait a Few Minutes**
   - Google may take 1-2 minutes to update

7. **Try Again**
   - Go back to your app: https://docidscan.netlify.app
   - **Hard refresh**: `Ctrl + Shift + R`
   - Click **"Connect Google Account"** again
   - This time, use `rohitsingh2117@gmail.com` when prompted

---

## Alternative: Publish Your App (Optional)

If you want anyone to use your app (not just test users):

1. In **OAuth consent screen**, scroll to **"Publishing status"**
2. Click **"PUBLISH APP"**
3. Note: This requires completing app verification if you're using sensitive scopes
4. For development/testing, adding test users is easier

---

## Quick Checklist:
- [ ] Added `rohitsingh2117@gmail.com` to Test users
- [ ] Saved changes in Google Cloud Console
- [ ] Waited 1-2 minutes
- [ ] Hard refreshed browser
- [ ] Tried "Connect Google Account" again
- [ ] Used the same email (`rohitsingh2117@gmail.com`) when signing in

---

After adding yourself as a test user, the connection should work! 🎉

