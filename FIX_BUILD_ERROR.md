# Netlify Build Error - Possible Causes

## Issue
Build failing with exit code 2 during React build.

## Possible Causes:

### 1. Large Bundle Size (Tesseract.js)
- Tesseract.js is ~2-3MB
- Netlify might have size limits
- Or build timeout due to large dependencies

### 2. Missing Environment Variables
- `REACT_APP_GOOGLE_API_KEY` not set (but shouldn't cause build failure)
- Other env vars missing

### 3. Syntax Error in New Files
- Need to see full error message

## Next Steps:

**Can you scroll down in the Netlify build logs and show me:**
1. The exact error message (should show file name and line number)
2. Any "Failed to compile" messages

**The error should look something like:**
```
Failed to compile.
[eslint]
src/components/SomeFile.js
  Line 10: 'something' is not defined
```

Please paste the FULL error from the logs!

