#!/bin/bash

# Check Vercel Environment Variables
# This script helps verify what's configured in Vercel

echo "📋 Vercel Environment Variables Checklist"
echo "=========================================="
echo ""

echo "✅ Variables in vercel.json:"
echo "----------------------------"
cat vercel.json | grep -A 10 '"env"' | grep -E '"[A-Z_]+"' | sed 's/.*"\([^"]*\)".*/  - \1/' || echo "  (none found)"

echo ""
echo "📝 Required Variables:"
echo "---------------------"
echo ""
echo "1. NEXT_PUBLIC_API_URL"
echo "   Expected: https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod"
echo "   Status: ✅ In vercel.json"
echo ""
echo "2. NEXT_PUBLIC_BACKEND_DIRECT_URL"
echo "   Expected: http://3.82.226.162:8081"
echo "   Status: ⚠️  NOT in vercel.json (must be in Vercel Dashboard)"
echo ""
echo "3. BACKEND_API_URL"
echo "   Expected: https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod"
echo "   Status: ✅ In vercel.json"
echo ""
echo "4. FEED_API_URL"
echo "   Expected: https://ql3aoaj2x0.execute-api.us-east-1.amazonaws.com/prod"
echo "   Status: ✅ In vercel.json"
echo ""

echo "🔍 How to Check in Vercel Dashboard:"
echo "-------------------------------------"
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Select your project"
echo "3. Go to: Settings → Environment Variables"
echo "4. Look for the variables listed above"
echo ""

echo "⚠️  Action Required:"
echo "-------------------"
echo "Add NEXT_PUBLIC_BACKEND_DIRECT_URL in Vercel Dashboard:"
echo "  - Key: NEXT_PUBLIC_BACKEND_DIRECT_URL"
echo "  - Value: http://3.82.226.162:8081"
echo "  - Environment: Production, Preview, Development"
echo ""

if command -v vercel &> /dev/null; then
    echo "🔧 Using Vercel CLI:"
    echo "-------------------"
    echo "Run: vercel env ls"
    echo "This will show all environment variables"
    echo ""
fi
