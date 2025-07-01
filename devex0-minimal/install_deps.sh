#!/bin/bash

echo "📦 Installing dependencies for enhanced JSON dump analyzer..."

# Install required packages
pip install tabulate rich google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client

echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up Google Cloud Console project and enable Google Docs API"
echo "2. Download credentials.json from Google Cloud Console"
echo "3. Run: python json_dump_enhanced.py"
echo ""
echo "🎯 Features available:"
echo "• Rich table formatting with colors and styling"
echo "• Product primary key generation"
echo "• Image URL extraction and display" 
echo "• Enhanced product data visualization"
echo "• Support for e-commerce JSON-LD data parsing"