// FINAL FIX TEST - After adding status element and scripting permission
// Copy-paste into Extension Popup Console

console.log('🎯 FINAL FIX TEST STARTING...');

// Test 1: Check status element
const statusEl = document.getElementById('status');
console.log('Status element found:', statusEl ? '✅ YES' : '❌ NO');

// Test 2: Create interface if missing
if (!window.devex0Interface && typeof Devex0Interface === 'function') {
    console.log('🔧 Creating devex0Interface...');
    try {
        const devex0 = new Devex0Interface();
        window.devex0Interface = devex0;
        devex0.init();
        console.log('✅ Interface created and initialized');
    } catch (error) {
        console.log('❌ Interface creation failed:', error.message);
    }
} else {
    console.log('✅ Interface already exists');
}

// Test 3: Test content script injection with new permission
setTimeout(() => {
    console.log('🔧 Testing content script injection...');
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs[0]) {
            const tab = tabs[0];
            console.log('Injecting into:', tab.url);
            
            chrome.scripting.executeScript({
                target: {tabId: tab.id},
                files: ['content-scripts/extractor.js']
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.log('❌ Injection failed:', chrome.runtime.lastError.message);
                } else {
                    console.log('✅ Content script injected');
                    
                    // Test communication
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tab.id, {action: 'PING'}, (response) => {
                            if (chrome.runtime.lastError) {
                                console.log('❌ Communication failed:', chrome.runtime.lastError.message);
                            } else {
                                console.log('✅ Communication working:', response);
                                
                                // NOW TRY EXTRACT!
                                console.log('🚀 Everything ready - trying extract...');
                                if (window.devex0Interface) {
                                    window.devex0Interface.handleExtract();
                                }
                            }
                        });
                    }, 500);
                }
            });
        }
    });
}, 1000);

console.log('🎯 FINAL FIX TEST COMPLETE - Watch for results...');
