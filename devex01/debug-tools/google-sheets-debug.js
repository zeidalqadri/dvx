// GOOGLE SHEETS INTEGRATION DEBUG TEST
// Copy-paste into Extension Popup Console

console.log('📊 GOOGLE SHEETS DEBUG TEST STARTING...');

// Test 1: Check if Google Sheets classes are loaded
console.log('GoogleSheetsIntegration class:', typeof GoogleSheetsIntegration);
console.log('ExtractionAnalyzer class:', typeof ExtractionAnalyzer);

// Test 2: Check button elements
const createSheetBtn = document.getElementById('createGoogleSheet');
const analysisSheetBtn = document.getElementById('createAnalysisSheet');
console.log('Create Google Sheet button:', createSheetBtn ? '✅ FOUND' : '❌ NOT FOUND');
console.log('Create Analysis Sheet button:', analysisSheetBtn ? '✅ FOUND' : '❌ NOT FOUND');

// Test 3: Check if buttons have event listeners
if (createSheetBtn) {
    console.log('Create Sheet button visible:', createSheetBtn.style.display !== 'none');
    console.log('Create Sheet button disabled:', createSheetBtn.disabled);
}
if (analysisSheetBtn) {
    console.log('Analysis Sheet button visible:', analysisSheetBtn.style.display !== 'none');
    console.log('Analysis Sheet button disabled:', analysisSheetBtn.disabled);
}

// Test 4: Check devex0Interface Google Sheets methods
if (window.devex0Interface) {
    console.log('handleCreateGoogleSheet method:', typeof window.devex0Interface.handleCreateGoogleSheet);
    console.log('handleCreateAnalysisSheet method:', typeof window.devex0Interface.handleCreateAnalysisSheet);
    console.log('lastExtractionData exists:', !!window.devex0Interface.lastExtractionData);
}

// Test 5: Test Google OAuth setup
console.log('Chrome identity API:', typeof chrome?.identity);
chrome.identity.getAuthToken({interactive: false}, (token) => {
    if (chrome.runtime.lastError) {
        console.log('❌ OAuth not authenticated:', chrome.runtime.lastError.message);
        console.log('💡 This is normal for first use - will prompt when clicking button');
    } else {
        console.log('✅ Already authenticated with Google');
    }
});

// Test 6: Manual button click test
setTimeout(() => {
    console.log('🔘 Testing manual button clicks...');
    
    if (createSheetBtn && window.devex0Interface?.handleCreateGoogleSheet) {
        console.log('📊 Manually triggering Google Sheets creation...');
        try {
            window.devex0Interface.handleCreateGoogleSheet();
            console.log('✅ Google Sheets method called');
        } catch (error) {
            console.log('❌ Google Sheets method failed:', error.message);
        }
    } else {
        console.log('❌ Cannot test - button or method missing');
    }
}, 1000);

console.log('📊 GOOGLE SHEETS DEBUG COMPLETE - Watch for results...');
