#!/bin/bash
# Quick test script for CI/CD pipeline

echo "🧪 Testing Vercel CI/CD Pipeline"
echo "================================"
echo ""

# Check if workflows exist
if [ ! -f ".github/workflows/deploy-client-next-simple.yml" ]; then
  echo "❌ Workflow file not found!"
  exit 1
fi

echo "✅ Workflow file exists"
echo ""

# Check if client-next exists
if [ ! -d "client-next" ]; then
  echo "❌ client-next directory not found!"
  exit 1
fi

echo "✅ client-next directory exists"
echo ""

# Check git status
echo "📋 Git Status:"
git status --short | head -5
echo ""

# Check if workflows are committed
if git ls-files --error-unmatch .github/workflows/deploy-client-next-simple.yml >/dev/null 2>&1; then
  echo "✅ Workflows are committed"
else
  echo "⚠️  Workflows need to be committed"
  echo ""
  echo "Run:"
  echo "  git add .github/workflows/"
  echo "  git commit -m 'Add Vercel CI/CD pipeline'"
  echo "  git push origin master"
fi

echo ""
echo "🚀 To trigger deployment:"
echo "   1. Make a small change in client-next/"
echo "   2. Commit and push:"
echo "      git add client-next/"
echo "      git commit -m 'Trigger CI/CD test'"
echo "      git push origin master"
echo ""
echo "   3. Check GitHub Actions:"
echo "      https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
