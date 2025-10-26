# Quick Start Guide

## TL;DR - Get Running in 5 Minutes

### 1. Prerequisites Check
```bash
# Check Node.js version (should be 16+)
node --version

# Check MongoDB (should be running)
mongosh --version
```

### 2. Install Everything
```bash
npm run install-all
```

### 3. Configure

Create `server/.env` using the template:
```bash
cp server/env.template server/.env
```

Edit `server/.env` with:
- MongoDB connection string
- Google OAuth credentials (see SETUP_GUIDE.md)
- Google Spreadsheet ID

### 4. Run
```bash
npm run dev
```

### 5. Use
1. Go to http://localhost:3000
2. Register an account
3. Connect Google
4. Scan documents!

## Common Issues

**"MongoDB connection error"**
→ Start MongoDB: `mongod` or `brew services start mongodb-community`

**"Google OAuth error"**
→ Follow SETUP_GUIDE.md for Google Cloud setup

**"Camera not working"**
→ Allow camera permissions in browser

For detailed setup, see **SETUP_GUIDE.md**
