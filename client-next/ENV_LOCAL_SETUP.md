# .env.local File for Local Development

## ✅ Do You Need .env.local?

**Optional but Recommended!**

The code has fallback values, but `.env.local` lets you:
- Override backend IP easily
- Test with different backends
- Keep local config separate

## 📋 Current Setup

### With .env.local (Recommended)

Create `.env.local` in `client-next/`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://3.82.226.162:8081
BACKEND_API_URL=http://3.82.226.162:8081
FEED_API_URL=http://3.82.226.162:8081
```

### Without .env.local (Works Too)

The code has fallback values:
- Default backend: `http://3.82.226.162:8081`
- Works without `.env.local`

## 🔄 How It Works

### Priority Order:

1. **Environment variables** (from `.env.local` or system)
2. **Code defaults** (fallback values in code)

### Example:

```typescript
// In app/utils/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://3.82.226.162:8081';
//                                 ↑ from .env.local    ↑ fallback
```

## 📝 Current .env.local

If you have `.env.local`, it should contain:

```bash
NEXT_PUBLIC_API_URL=http://3.82.226.162:8081
BACKEND_API_URL=http://3.82.226.162:8081
FEED_API_URL=http://3.82.226.162:8081
```

## ⚠️ Important Notes

1. **.env.local is gitignored** - Won't be committed to Git
2. **Update after ECS redeployment** - Backend IP changes
3. **Optional** - Code has fallback values

## 🔄 Update Backend IP

When backend IP changes:

1. **Get new IP**:
   ```bash
   cd server
   ./update-backend-url.sh
   ```

2. **Update .env.local**:
   ```bash
   # Edit .env.local and update IP
   NEXT_PUBLIC_API_URL=http://NEW_IP:8081
   ```

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

## ✅ Summary

- **With .env.local**: Override backend IP easily
- **Without .env.local**: Uses code defaults (works fine)
- **Recommendation**: Create `.env.local` for easier IP updates

