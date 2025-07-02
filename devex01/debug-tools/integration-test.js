// Integration Test for Google Sheets Hotfix
// Test if all components load correctly

console.log('🧪 Running integration test...');

// Test 1: Check if classes are available
setTimeout(() => {
  console.log('📋 Checking class availability:');
  
  console.log('GoogleSheetsIntegration:', typeof window.GoogleSheetsIntegration);
  console.log('ExtractionAnalyzer:', typeof window.ExtractionAnalyzer);
  console.log('AssetSelectorRanker:', typeof window.AssetSelectorRanker);
  
  // Test 2: Check if devex0Interface is available
  console.log('devex0Interface:', typeof window.devex0Interface);
  
  if (window.devex0Interface) {
    console.log('handleCreateGoogleSheet:', typeof window.devex0Interface.handleCreateGoogleSheet);
    console.log('handleCreateAnalysisSheet:', typeof window.devex0Interface.handleCreateAnalysisSheet);
    console.log('loadGoogleSheetsDependencies:', typeof window.devex0Interface.loadGoogleSheetsDependencies);
  }
  
  // Test 3: Check if buttons exist
  const createSheetBtn = document.getElementById('createGoogleSheet');
  const createAnalysisBtn = document.getElementById('createAnalysisSheet');
  
  console.log('createGoogleSheet button:', createSheetBtn ? 'exists' : 'missing');
  console.log('createAnalysisSheet button:', createAnalysisBtn ? 'exists' : 'missing');
  
  console.log('✅ Integration test complete');
}, 1000);
