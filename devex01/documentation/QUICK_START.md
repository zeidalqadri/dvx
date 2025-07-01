# DevEx01 - Quick Installation Guide

## 🚀 **Chrome Extension Installation**

### Step 1: Load Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `devex01` folder
5. ✅ Extension loaded! Note your **Extension ID**

### Step 2: Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project → Enable **Google Sheets API** & **Google Drive API**
3. Create **OAuth 2.0 Client ID**:
   - Application type: **Chrome Extension**
   - Item ID: **[Your Extension ID from Step 1]**
4. Copy the **Client ID**

### Step 3: Configure Extension
1. Edit `manifest.json` in devex01 folder:
   ```json
   "oauth2": {
     "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com"
   }
   ```
2. **Reload extension** in Chrome (click reload button)

## 🎯 **Usage**

### Basic Workflow:
1. **Navigate** to any e-commerce website
2. **Click DevEx01 icon** in Chrome toolbar
3. **Click "EXTRACT"** → HTML copied to clipboard
4. **Choose analysis option**:
   - "yes, analyze" → View ranked selectors
   - "📊 Create Google Sheet" → Instant automated report

### Google Sheets Integration:
- **📊 Create Google Sheet** → Basic extraction data
- **📊 Save to Google Sheets** → Enhanced analysis with product tables

## ✨ **Features Available**

- ✅ **Intelligent CSS Selector Ranking**
- ✅ **Automated Google Sheets Creation**
- ✅ **Product Table Generation**
- ✅ **Image URL Extraction**
- ✅ **Primary Key Generation**
- ✅ **E-commerce Optimization**

## 📊 **What You Get**

DevEx01 creates professional Google Sheets with:
- **Raw Data Tab**: URL, timestamp, extraction metadata
- **Product Analysis Tab**: Brand, Name, Price, Images, Quality
- **Images Tab**: Product keys, image URLs, validation status

**Total Size**: 536KB | **Files**: 14 | **Status**: Production Ready

Perfect for e-commerce data extraction, product research, and competitive analysis! 🎉