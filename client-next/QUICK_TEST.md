# Quick Frontend Test

## ✅ Current Status

- ✅ Dependencies installed
- ✅ Backend accessible: `http://3.82.226.162:8081` (HTTP 200)
- ✅ Development server ready

## 🚀 Start Testing

### 1. Start Development Server

```bash
cd client-next
npm run dev
```

Server will start at: `http://localhost:3000`

### 2. Open Browser

Go to: **http://localhost:3000**

### 3. Test Each Feature

#### ✅ Test Feed (Insight Stream)
- **Location**: Right panel
- **Expected**: Should load feed items from backend
- **Check**: Network tab shows `/api/proxy/feed`

#### ✅ Test Chat
- **Location**: Left panel
- **Action**: Type message and click "Send"
- **Expected**: Should receive streaming response
- **Check**: Network tab shows `/api/proxy/chat`

#### ✅ Test Upload
- **Location**: Chat panel (drag & drop area)
- **Action**: Drag and drop a file
- **Expected**: Should upload successfully
- **Check**: Network tab shows `/api/proxy/upload`

### 4. Check Browser Console

Open Developer Tools (F12):
- **Console tab**: Should have no errors
- **Network tab**: Should show proxy routes being used

## 🔍 Verify Configuration

### Check Proxy Routes

In browser Network tab, you should see:
- ✅ `/api/proxy/feed` → Backend
- ✅ `/api/proxy/chat` → Backend
- ✅ `/api/proxy/upload` → Backend

### Check Backend Connection

Proxy routes forward to: `http://3.82.226.162:8081`

## 🐛 Common Issues

### Backend Not Responding
- Check: `curl http://3.82.226.162:8081/health`
- Should return: `{"status":"ok","service":"guardian-gateway"}`

### CORS Errors
- Proxy should handle CORS
- If errors, check proxy routes are working

### Feed Not Loading
- Check browser console for errors
- Verify proxy route is being called
- Check backend is accessible

## ✅ Success Criteria

- [ ] Page loads without errors
- [ ] Feed panel shows data
- [ ] Chat sends and receives messages
- [ ] Upload works
- [ ] No CORS errors
- [ ] All requests go through proxy

