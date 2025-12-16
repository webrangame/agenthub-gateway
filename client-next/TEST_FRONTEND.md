# Frontend Testing Guide

## 🧪 Quick Test

### 1. Install Dependencies (if needed)

```bash
cd client-next
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at: `http://localhost:3000`

### 3. Test Endpoints

#### Test Feed Endpoint
- Open browser: `http://localhost:3000`
- Check "Insight Stream" panel (right side)
- Should load feed data from backend

#### Test Chat Endpoint
- Type a message in chat input
- Click "Send"
- Should receive streaming response

#### Test Upload
- Drag and drop a file
- Should upload to backend

## 🔍 Verify Configuration

### Check API Endpoints

Open browser console (F12) and check:
```javascript
// Should show proxy routes
console.log('Feed:', '/api/proxy/feed');
console.log('Chat:', '/api/proxy/chat');
console.log('Upload:', '/api/proxy/upload');
```

### Check Network Requests

In browser Network tab:
- Feed: `http://localhost:3000/api/proxy/feed`
- Chat: `http://localhost:3000/api/proxy/chat`
- Upload: `http://localhost:3000/api/proxy/upload`

## 🐛 Troubleshooting

### Backend Not Responding

1. **Check backend is running**:
   ```bash
   curl http://3.82.226.162:8081/health
   ```

2. **Check backend IP is correct**:
   - Current IP: `3.82.226.162`
   - Update in `.env.local` if different

### CORS Errors

- Proxy routes should handle CORS
- If errors, check proxy routes are working

### Build Errors

```bash
# Clean and rebuild
rm -rf .next node_modules/.cache
npm run build
```

## ✅ Expected Behavior

1. **Feed Panel**: Should show feed items from backend
2. **Chat Panel**: Should send messages and receive responses
3. **Upload**: Should upload files successfully
4. **No CORS errors**: Proxy handles CORS

## 📋 Test Checklist

- [ ] Development server starts
- [ ] Feed loads data
- [ ] Chat sends and receives messages
- [ ] File upload works
- [ ] No console errors
- [ ] No CORS errors
- [ ] Network requests go through proxy
