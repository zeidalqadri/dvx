// DevEx01 Webpage Content Script Test
// Copy-paste into TARGET WEBPAGE Console (F12 → Console on the page you want to scrape)

console.log('🌐 DEVEX01 WEBPAGE TEST STARTING...');
console.log('=====================================');

// Test 1: Page Environment
console.log('\n📋 TEST 1: Page Environment');
console.log('Page URL:', window.location.href);
console.log('Page title:', document.title);
console.log('Chrome extension APIs:', typeof chrome);

// Test 2: Content Script Detection
console.log('\n🔍 TEST 2: Content Script Detection');
console.log('DataExtractor global:', typeof window.dataExtractor);
console.log('Extension context:', typeof chrome?.runtime);

// Test 3: Manual Content Script Communication
console.log('\n📡 TEST 3: Manual Communication Test');
if (typeof chrome?.runtime?.sendMessage === 'function') {
    try {
        chrome.runtime.sendMessage({action: 'PING'}, (response) => {
            if (chrome.runtime.lastError) {
                console.log('❌ Message failed:', chrome.runtime.lastError.message);
            } else {
                console.log('✅ Extension response:', response);
            }
        });
    } catch (error) {
        console.log('❌ Send message error:', error.message);
    }
} else {
    console.log('❌ Chrome message API not available');
}

// Test 4: HTML Content Check
console.log('\n📄 TEST 4: HTML Content Check');
console.log('Document ready state:', document.readyState);
console.log('HTML length:', document.documentElement.outerHTML.length);
console.log('Body elements:', document.body?.children?.length || 'No body');

// Test 5: Simulate Extract Request
console.log('\n🚀 TEST 5: Simulate Extract Request');
setTimeout(() => {
    if (window.dataExtractor && typeof window.dataExtractor.extractHTML === 'function') {
        console.log('Testing HTML extraction...');
        window.dataExtractor.extractHTML({selector: 'html', contentType: 'outerHTML'})
            .then(result => {
                console.log('✅ Extract success:', result.success);
                console.log('Content length:', result.content?.length || 0);
            })
            .catch(error => {
                console.log('❌ Extract failed:', error.message);
            });
    } else {
        console.log('❌ DataExtractor not available or missing extractHTML method');
    }
}, 1000);

console.log('\n=====================================');
console.log('🌐 WEBPAGE TEST COMPLETE');
console.log('📋 Watch for results above');
console.log('=====================================');
