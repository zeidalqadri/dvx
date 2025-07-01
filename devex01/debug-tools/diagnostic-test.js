// DevEx01 Quick Diagnostic Script
// Copy-paste into Extension Popup Console (Right-click extension icon → Inspect popup → Console)

console.log('🔍 DEVEX01 DIAGNOSTIC TEST STARTING...');
console.log('==========================================');

// Test 1: Extension Environment
console.log('\n📋 TEST 1: Extension Environment');
console.log('Window object:', typeof window);
console.log('Chrome APIs available:', typeof chrome);
console.log('DevEx0 interface:', window.devex0Interface ? '✅ FOUND' : '❌ NOT FOUND');

// Test 2: UI Elements
console.log('\n🎨 TEST 2: UI Elements');
const extractBtn = document.getElementById('extract');
const insightOptions = document.getElementById('insightOptions');
const analysisResults = document.getElementById('analysisResults');

console.log('Extract button:', extractBtn ? '✅ FOUND' : '❌ NOT FOUND');
console.log('Insight options:', insightOptions ? '✅ FOUND' : '❌ NOT FOUND');
console.log('Analysis results:', analysisResults ? '✅ FOUND' : '❌ NOT FOUND');

if (extractBtn) {
    console.log('Button disabled:', extractBtn.disabled);
    console.log('Button visible:', extractBtn.style.display !== 'none');
    console.log('Button text:', extractBtn.textContent);
}

// Test 3: Extension State
console.log('\n⚙️ TEST 3: Extension State');
if (window.devex0Interface) {
    const devex0 = window.devex0Interface;
    console.log('Current tab:', devex0.currentTab ? '✅ SET' : '❌ NOT SET');
    console.log('Workflow state:', devex0.workflowState || 'undefined');
    console.log('Extracted HTML:', devex0.extractedHTML ? 'Has data' : 'No data');
    console.log('handleExtract method:', typeof devex0.handleExtract);
}

// Test 4: Content Script Communication
console.log('\n📡 TEST 4: Content Script Communication');
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
        const currentTab = tabs[0];
        console.log('Current tab URL:', currentTab.url);
        console.log('Tab ID:', currentTab.id);
        
        // Test ping
        chrome.tabs.sendMessage(currentTab.id, {action: 'PING'}, (response) => {
            if (chrome.runtime.lastError) {
                console.log('❌ Communication failed:', chrome.runtime.lastError.message);
            } else {
                console.log('✅ Content script response:', response);
            }
        });
    } else {
        console.log('❌ No active tab found');
    }
});

// Test 5: Manual Extract Trigger (wait 2 seconds for tab query to complete)
console.log('\n🚀 TEST 5: Manual Extract Test (in 2 seconds...)');
setTimeout(() => {
    if (window.devex0Interface && typeof window.devex0Interface.handleExtract === 'function') {
        console.log('Attempting manual extract...');
        try {
            window.devex0Interface.handleExtract();
            console.log('✅ Extract method called successfully');
        } catch (error) {
            console.log('❌ Extract method failed:', error.message);
        }
    } else {
        console.log('❌ Cannot trigger extract - method not available');
    }
}, 2000);

console.log('\n==========================================');
console.log('🔍 DIAGNOSTIC TEST COMPLETE');
console.log('📋 Watch for results above and check for any ❌ symbols');
console.log('📧 Copy this entire output to report issues');
console.log('==========================================');
