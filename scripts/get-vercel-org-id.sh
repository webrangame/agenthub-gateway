#!/bin/bash

# Script to get VERCEL_ORG_ID and VERCEL_PROJECT_ID

echo "🔍 Getting Vercel Credentials"
echo "=============================="
echo ""

# Method 1: Using Vercel CLI (if installed)
if command -v vercel &> /dev/null; then
  echo "📋 Method 1: Using Vercel CLI"
  echo ""
  cd client-next 2>/dev/null || cd .
  
  echo "Running: vercel link"
  echo "This will show your Organization ID and Project ID"
  echo ""
  echo "Or run: vercel whoami"
  echo ""
  
  # Try to get org ID from vercel.json or .vercel folder
  if [ -d ".vercel" ]; then
    echo "Found .vercel folder. Checking for org ID..."
    if [ -f ".vercel/project.json" ]; then
      echo "Organization ID:"
      cat .vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4 || echo "Not found in project.json"
    fi
    if [ -f ".vercel/org.json" ]; then
      echo "Organization ID:"
      cat .vercel/org.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4 || echo "Not found in org.json"
    fi
  fi
else
  echo "⚠️  Vercel CLI not installed"
  echo "   Install it: npm install -g vercel"
  echo ""
fi

echo ""
echo "📋 Method 2: From Vercel Dashboard"
echo ""
echo "1. Go to: https://vercel.com/account"
echo "2. Look for 'Team ID' or 'Organization ID'"
echo "3. Or check your team/org settings"
echo ""

echo "📋 Method 3: From Project Settings"
echo ""
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Select your project (client-next)"
echo "3. Go to Settings → General"
echo "4. Look for 'Organization ID' or check the URL"
echo "   (The org ID might be in the URL: vercel.com/[org-id]/[project])"
echo ""

echo "📋 Method 4: Using Vercel API"
echo ""
echo "If you have a VERCEL_TOKEN, you can run:"
echo "  curl -H 'Authorization: Bearer YOUR_TOKEN' https://api.vercel.com/v2/teams"
echo ""

echo "💡 Quick Check:"
echo "   If you've deployed before, check:"
echo "   - client-next/.vercel/project.json"
echo "   - client-next/.vercel/org.json"
echo ""



