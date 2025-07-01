// CONTENT SCRIPT MANUAL INJECTION - Paste in Extension Popup Console
// This will manually inject the content script if it's missing

console.log('🔧 CONTENT SCRIPT INJECTION TEST...');

// Check current tab and inject content script manually
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
        const tab = tabs[0];
        console.log('Target tab:', tab.url);
        
        // Try to inject content script manually
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: ['content-scripts/extractor.js']
        }, (results) => {
            if (chrome.runtime.lastError) {
                console.log('❌ Manual injection failed:', chrome.runtime.lastError.message);
            } else {
                console.log('✅ Content script injected manually');
                
                // Test communication after injection
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, {action: 'PING'}, (response) => {
                        if (chrome.runtime.lastError) {
                            console.log('❌ Still no communication:', chrome.runtime.lastError.message);
                        } else {
                            console.log('✅ Communication restored:', response);
                        }
                    });
                }, 1000);
            }
        });
    } else {
        console.log('❌ No active tab found');
    }
});
