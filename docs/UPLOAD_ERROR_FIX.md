# Video Upload 400 Error - Fixed

## Issue
Getting `AxiosError: Request failed with status code 400` when uploading videos.

## Root Cause
The frontend was manually setting `Content-Type: multipart/form-data` header, which breaks FormData uploads. Axios needs to set this automatically with the correct boundary.

## Fix Applied

### 1. Removed Manual Content-Type Header
**File:** `frontend/src/pages/VideoUpload.jsx`

**Before:**
```javascript
const response = await api.post('/api/videos/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'  // ❌ This breaks uploads
  },
  ...
});
```

**After:**
```javascript
const response = await api.post('/api/videos/upload', formData, {
  // ✅ Axios sets Content-Type automatically with boundary
  ...
});
```

### 2. Improved Error Handling
- Better error message display
- More detailed backend logging
- Clearer error messages for different failure types

## How to Test

1. **Refresh your browser** to get the updated code
2. **Try uploading a video again**
3. **Check the browser console** for any errors
4. **Check the backend console** for detailed error logs

## Common Upload Issues & Solutions

### Issue 1: "Invalid file type"
**Solution:** Ensure your video is one of:
- MP4 (video/mp4)
- MOV (video/quicktime)
- AVI (video/x-msvideo)
- WEBM (video/webm)
- MKV (video/x-matroska)

### Issue 2: "File too large"
**Solution:** 
- Maximum file size is 500MB
- Check your `.env` file: `MAX_FILE_SIZE=500000000`

### Issue 3: "No video file provided"
**Solution:**
- Ensure the file input field name is `video`
- Check that the file was actually selected

### Issue 4: "Failed to process video file"
**Solution:**
- FFmpeg might not be installed or not in PATH
- Install FFmpeg: `brew install ffmpeg` (Mac) or `choco install ffmpeg` (Windows)
- Verify: `ffmpeg -version`

## Debugging Steps

If upload still fails:

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for error messages
   - Check Network tab for the failed request

2. **Check Backend Console:**
   - Look for detailed error logs
   - Check for file validation errors
   - Verify FFmpeg is working

3. **Check Request Details:**
   - In Network tab, find the failed POST request
   - Check Request Payload
   - Verify file is included in FormData

4. **Verify File:**
   - Try a different video file
   - Try a smaller file first
   - Ensure file is not corrupted

## Testing with Different Files

Try uploading:
1. Small MP4 file (< 10MB) - should work
2. Different video format - check if format is supported
3. Check file size - ensure under 500MB

---

**The fix has been applied. Please refresh your browser and try uploading again!**
