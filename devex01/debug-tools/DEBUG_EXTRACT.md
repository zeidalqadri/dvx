# DevEx01 Extract Button Troubleshooting Guide

## 🔍 **Quick Diagnostic Tests**

### **Test 1: Extension Popup Console**
1. Right-click DevEx01 extension icon → **"Inspect popup"**
2. Go to **Console tab**
3. Run these tests one by one:

```javascript
// === TEST 1: Check Extension Object ===
console.log('🔍 Extension loaded:', typeof window);
console.log('🔍 DevEx0 interface:', window.devex0Interface || 'NOT FOUND');
console.log('🔍 Extract button:', document.getElementById('extract') || 'NOT FOUND');

// === TEST 2: Check Event Listeners ===
const extractBtn = document.getElementById('extract');
if (extractBtn) {
    console.log('✅ Extract button found');
    console.log('🔍 Button disabled?', extractBtn.disabled);
    console.log('🔍 Button styles:', extractBtn.style.display);
} else {
    console.log('❌ Extract button NOT found');
}

// === TEST 3: Test Content Script Communication ===
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
        console.log('🔍 Testing content script on:', tabs[0].url);
        chrome.tabs.sendMessage(tabs[0].id, {action: 'PING'}, (response) => {
            if (chrome.runtime.lastError) {
                console.log('❌ Communication error:', chrome.runtime.lastError.message);
            } else {
                console.log('✅ Content script response:', response);
            }
        });
    }
});

// === TEST 4: Manual Extract Trigger ===
setTimeout(() => {
    const devex0 = window.devex0Interface;
    if (devex0 && devex0.handleExtract) {
        console.log('🚀 Manually triggering extract...');
        devex0.handleExtract().catch(err => console.log('❌ Extract failed:', err));
    } else {
        console.log('❌ Cannot find handleExtract method');
    }
}, 1000);
```

### **Test 2: Webpage Console**
1. On the target webpage (like Farfetch), press **F12**
2. Go to **Console tab**
3. Run this test:

```javascript
// === WEBPAGE TEST: Check Content Script ===
console.log('🔍 Testing content script injection...');

// Test if content script is loaded
if (window.dataExtractor) {
    console.log('✅ DataExtractor found:', window.dataExtractor);
} else {
    console.log('❌ DataExtractor NOT found');
}

// Test direct message to extension
try {
    chrome.runtime.sendMessage({action: 'PING'}, (response) => {
        console.log('📡 Extension response:', response);
    });
} catch (error) {
    console.log('❌ Cannot send message:', error.message);
}
```

## 🎯 **Results Interpretation**

### ✅ **All Tests Pass - Expected Output:**
```
🔍 Extension loaded: object
🔍 DevEx0 interface: Devex0Interface {currentTab: {...}, ...}
🔍 Extract button: <button id="extract">EXTRACT</button>
✅ Extract button found
🔍 Button disabled? false
🔍 Testing content script on: https://example.com
✅ Content script response: {success: true, service: "data-extractor", ready: true}
🚀 Manually triggering extract...
```

### ❌ **Common Failure Patterns:**

| Error | Cause | Solution |
|-------|-------|----------|
| `DevEx0 interface: NOT FOUND` | Extension not loaded | Reload extension |
| `Extract button: NOT FOUND` | HTML issue | Check popup.html |
| `Communication error: Could not establish connection` | Content script not injected | Check page type |
| `Extract failed: TypeError` | Code error | Check console for details |

## 🔧 **Quick Fixes**

### **Fix 1: Reload Extension**
```bash
# Go to chrome://extensions/
# Find DevEx01 → Click "Reload" button
```

### **Fix 2: Check Page Type**
Extension only works on:
- ✅ `https://` websites
- ✅ `http://` websites  
- ❌ `chrome://` pages
- ❌ `file://` pages
- ❌ Extension pages

### **Fix 3: Manual Button Click Test**
In extension popup console:
```javascript
// Force button click
const btn = document.getElementById('extract');
if (btn) {
    console.log('🔄 Simulating button click...');
    btn.click();
} else {
    console.log('❌ Button not found');
}
```

### **Fix 4: Check Extension Permissions**
```javascript
// In extension popup console
chrome.permissions.getAll((permissions) => {
    console.log('📋 Extension permissions:', permissions);
});
```

## 🚨 **Emergency Reset**
If nothing works:
1. Go to `chrome://extensions/`
2. **Remove** DevEx01 extension
3. **Reload** from `/app/devex01` folder
4. **Test** on https://example.com

## 📊 **Debug Output Template**
When reporting issues, copy-paste this format:

```
=== DEVEX01 DEBUG REPORT ===
Extension loaded: [YES/NO]
DevEx0 interface: [FOUND/NOT FOUND]  
Extract button: [FOUND/NOT FOUND]
Content script: [WORKING/ERROR]
Target URL: [URL]
Console errors: [PASTE ERRORS]
========================
```

Run these tests and let me know the exact output! 🎯