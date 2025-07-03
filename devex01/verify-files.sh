#!/bin/bash

# DevEx0 Chrome Extension - Critical Files Verification Script

echo "🔍 DevEx0 Chrome Extension - Critical Files Check"
echo "================================================="

# Core Extension Files
echo ""
echo "📋 Core Extension Files:"
check_file() {
    if [ -f "$1" ]; then
        echo "  ✅ $1"
    else
        echo "  ❌ $1 (MISSING!)"
    fi
}

check_file "manifest.json"
check_file "popup/popup.html"
check_file "popup/popup.js"
check_file "content-scripts/extractor.js"

# Utility Scripts
echo ""
echo "🛠️ Utility Scripts:"
check_file "utils/asset-selector-ranker.js"
check_file "utils/google-sheets-integration.js"
check_file "utils/extraction-analyzer.js"
check_file "utils/pagination-detector.js"

# Assets
echo ""
echo "🎨 Extension Icons:"
check_file "icons/icon16.png"
check_file "icons/icon32.png"
check_file "icons/icon48.png"
check_file "icons/icon128.png"

# Configuration
echo ""
echo "⚙️ Configuration Files:"
check_file "package.json"
check_file ".gitignore"

# Documentation
echo ""
echo "📚 Essential Documentation:"
check_file "README.md"
check_file "PAGINATION_FEATURE.md"
check_file "PERSISTENT_STATE.md"
check_file "CRITICAL_FILES_CHECKLIST.md"

# Git Status Check
echo ""
echo "📁 Git Status:"
echo "=============="
git status --short

echo ""
echo "✅ Verification Complete!"
echo ""
echo "🚀 Ready for Chrome Extension Development!"
echo "   Load chrome://extensions/ and enable Developer mode"
echo "   Click 'Load unpacked' and select this directory"