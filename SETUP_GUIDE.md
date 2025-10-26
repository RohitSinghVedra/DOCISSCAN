# Setup Guide - IDDocScan

This guide will walk you through setting up the IDDocScan application from scratch.

## Prerequisites

Before starting, ensure you have the following installed:
- Node.js (v16 or higher)
- npm or yarn
- MongoDB (running locally or MongoDB Atlas account)
- A Google Cloud account

## Step-by-Step Setup

### 1. MongoDB Setup

#### Option A: Local MongoDB
Install MongoDB locally and start the service:
```bash
# On Windows
net start MongoDB

# On Mac/Linux
brew services start mongodb-community

# Or manually
mongod
```

#### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env` file

### 2. Google Cloud Setup

1. **Create a Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Click "Create Project"
   - Name it "IDDocScan" or similar

2. **Enable APIs**
   - Navigate to "APIs & Services" > "Library"
   - Enable "Google Sheets API"
   - Enable "Google Drive API" (if needed)

3. **Create OAuth Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/api/google/oauth/callback`
   - Copy the Client ID and Client Secret

4. **Create a Google Sheet**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet
   - Name it "IDDocScan Documents"
   - Copy the Sheet ID from the URL (between `/d/` and `/edit`)
   - Share sync with yourself or service account email

### 3. Environment Configuration

Create `server/.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/iddocscan
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/oauth/callback
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
```

**Important**: Replace all placeholder values with your actual credentials!

### 4. Install Dependencies

From the root directory:
```bash
npm run install-all
```

This will install dependencies for:
- Root package.json
- Server (Express, MongoDB, etc.)
- Client (React, etc.)

### 5. Start the Application

#### Development Mode (Both services together):
```bash
npm run dev
```

This starts:
- Backend on http://localhost:5000
- Frontend on http://localhost:3000

#### Individual Services:

**Backend only:**
```bash
cd server
npm run dev
```

**Frontend only:**
```bash
cd client
npm start
```

### 6. First Use

1. Open http://localhost:3000 in your browser
2. Click "Register here" to create an account
3. Enter your email and password
4. After registration, you'll be redirected to Dashboard
5. Click "Connect Google Account"
6. Authorize the application
7. You're ready to scan documents!

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongosh --eval "db.version()"`
- Check connection string in `.env`
- Verify network/firewall settings

### Google OAuth Issues
- Verify redirect URI matches exactly
- Check if APIs are enabled
- Ensure credentials are correct in `.env`

### OCR Not Working
- First scan may be slow (downloading language models)
- Ensure good image quality
- Check browser console for errors

### Camera Not Accessing
- Allow camera permissions in browser
- Use HTTPS or localhost
- Check browser compatibility

### Build Errors
```bash
# Clear caches and reinstall
cd client
rm -rf node_modules package-lock.json
npm install

cd ../server
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

### Environment Variables
- Use a strong, random JWT_SECRET
- Set production MongoDB URI
- Use production redirect URIs for Google OAuth
- Enable CORS for your domain

### Build Frontend
```bash
cd client
npm run build
```

The built files will be in `client/build/`

### Deploy Backend
Deploy to services like:
- Heroku
- Railway
- DigitalOcean
- AWS

### Deploy Frontend
Deploy to services like:
- Netlify
- Vercel
- AWS S3 + CloudFront

## Security Checklist

- [ ] Change JWT_SECRET to a strong random string
- [ ] Use HTTPS in production
- [ ] Set up proper CORS
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Keep dependencies updated
- [ ] Don't commit `.env` files
- [ ] Use environment-specific configs

## Next Steps

After setup:
1. Test the login/register flow
2. Connect your Google account
3. Try scanning a sample document
4. Verify data in Google Sheets
5. Test on mobile devices

## Support

If you encounter issues:
1. Check the error messages in browser console
2. Check server logs
3. Verify all environment variables
4. Ensure all services are running
5. Open an issue on GitHub with error details
