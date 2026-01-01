# SSO Cookie Debugging Guide

## Problem
User logs in on `market.niyogen.com` but `travel.niyogen.com` doesn't auto-authenticate.

## Root Cause
For cross-subdomain SSO to work, **market.niyogen.com** must:

1. ✅ Set cookies with `Domain=.niyogen.com` (not just `market.niyogen.com`)
2. ✅ Set `SameSite=None; Secure` (required for cross-site cookies)
3. ✅ Configure CORS correctly for `/api/auth/me` endpoint

## Required Configuration on market.niyogen.com

### 1. Cookie Settings (When User Logs In)

When setting the auth cookie on `market.niyogen.com`, it MUST be:

```javascript
// ✅ CORRECT - Shared across subdomains
document.cookie = `auth_token=xxx; Domain=.niyogen.com; SameSite=None; Secure; HttpOnly; Path=/`;

// ❌ WRONG - Only works on market.niyogen.com
document.cookie = `auth_token=xxx; Domain=market.niyogen.com; SameSite=Lax; Secure; HttpOnly; Path=/`;
```

**Backend Example (Node.js/Express):**
```javascript
res.cookie('auth_token', token, {
  domain: '.niyogen.com',  // ← Must start with dot
  sameSite: 'none',         // ← Required for cross-site
  secure: true,             // ← Required when SameSite=None
  httpOnly: true,           // ← Security best practice
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

### 2. CORS Configuration for `/api/auth/me`

The `/api/auth/me` endpoint on `market.niyogen.com` MUST respond with:

```http
Access-Control-Allow-Origin: https://travel.niyogen.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept
```

**❌ WRONG:**
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```
*(Cannot use `*` with `credentials: true`)*

**✅ CORRECT:**
```http
Access-Control-Allow-Origin: https://travel.niyogen.com
Access-Control-Allow-Credentials: true
```

**Backend Example (Node.js/Express):**
```javascript
app.get('/api/auth/me', (req, res) => {
  // Get origin from request
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://travel.niyogen.com',
    'https://market.niyogen.com',
    'http://localhost:3000' // for dev
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Check cookie and return user
  const token = req.cookies?.auth_token;
  if (token) {
    res.json({ user: { /* user data */ } });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Handle preflight OPTIONS request
app.options('/api/auth/me', (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://travel.niyogen.com',
    'https://market.niyogen.com',
    'http://localhost:3000'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  }
  res.sendStatus(200);
});
```

## Testing Steps

### 1. Check Cookies in Browser DevTools

1. Open `https://market.niyogen.com` and log in
2. Open DevTools → Application → Cookies
3. Check if cookie has:
   - ✅ **Domain**: `.niyogen.com` (with leading dot)
   - ✅ **SameSite**: `None`
   - ✅ **Secure**: ✓ (checked)
   - ✅ **Path**: `/`

### 2. Test CORS from Browser Console

On `https://travel.niyogen.com`, open console and run:

```javascript
fetch('https://market.niyogen.com/api/auth/me', {
  method: 'GET',
  credentials: 'include',
  headers: { 'Accept': 'application/json' }
})
.then(r => r.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

**Expected Result:**
- ✅ If cookies are set correctly → Returns user data
- ❌ If CORS is wrong → `CORS policy` error
- ❌ If cookies aren't shared → Returns `401` or `Not authenticated`

### 3. Check Network Tab

1. Open `https://travel.niyogen.com`
2. Open DevTools → Network tab
3. Look for request to `market.niyogen.com/api/auth/me`
4. Check:
   - **Request Headers**: Should include `Cookie: auth_token=xxx`
   - **Response Headers**: Should include `Access-Control-Allow-Origin: https://travel.niyogen.com`
   - **Response Headers**: Should include `Access-Control-Allow-Credentials: true`

## Common Issues

### Issue 1: Cookies Not Shared
**Symptom**: Cookie exists on `market.niyogen.com` but not visible on `travel.niyogen.com`

**Fix**: Ensure cookie is set with `Domain=.niyogen.com` (with leading dot)

### Issue 2: CORS Error
**Symptom**: Console shows `Access to fetch at 'https://market.niyogen.com/api/auth/me' from origin 'https://travel.niyogen.com' has been blocked by CORS policy`

**Fix**: Update CORS headers on `market.niyogen.com` to allow `https://travel.niyogen.com` with `credentials: true`

### Issue 3: Cookies Not Sent
**Symptom**: Request to `/api/auth/me` doesn't include `Cookie` header

**Fix**: 
- Ensure `credentials: 'include'` is used in fetch (✅ already done)
- Ensure cookie has `SameSite=None; Secure`
- Ensure CORS allows credentials

## Current Implementation

The `travel.niyogen.com` side is correctly configured:

- ✅ Uses `credentials: 'include'` in fetch
- ✅ Calls `https://market.niyogen.com/api/auth/me`
- ✅ Handles errors gracefully
- ✅ Auto-checks auth on page load

**The fix must be made on `market.niyogen.com` backend.**

## Quick Fix Checklist for market.niyogen.com

- [ ] Update cookie setting to use `Domain=.niyogen.com`
- [ ] Update cookie to use `SameSite=None; Secure`
- [ ] Update `/api/auth/me` CORS to allow `https://travel.niyogen.com`
- [ ] Add `Access-Control-Allow-Credentials: true` header
- [ ] Handle OPTIONS preflight request
- [ ] Test from `travel.niyogen.com` browser console


