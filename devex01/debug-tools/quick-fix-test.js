// EMERGENCY FIX TEST - Paste in Extension Popup Console
// This will manually create the devex0Interface if it's missing

console.log('🚨 EMERGENCY FIX TEST STARTING...');

// Test 1: Check if class exists
console.log('Devex0Interface class:', typeof Devex0Interface);

// Test 2: Check current state
console.log('Current window.devex0Interface:', window.devex0Interface);

// Test 3: Manual creation if missing
if (!window.devex0Interface && typeof Devex0Interface === 'function') {
    console.log('🔧 Manually creating devex0Interface...');
    try {
        const devex0 = new Devex0Interface();
        window.devex0Interface = devex0;
        devex0.init();
        console.log('✅ Successfully created devex0Interface');
        console.log('Extract method available:', typeof devex0.handleExtract);
    } catch (error) {
        console.log('❌ Failed to create interface:', error.message);
    }
} else if (!window.devex0Interface) {
    console.log('❌ Devex0Interface class not found - script loading issue');
} else {
    console.log('✅ devex0Interface already exists');
}

// Test 4: Try extract after creation
setTimeout(() => {
    if (window.devex0Interface && typeof window.devex0Interface.handleExtract === 'function') {
        console.log('🚀 Testing extract after manual creation...');
        const extractBtn = document.getElementById('extract');
        if (extractBtn) {
            extractBtn.click();
            console.log('✅ Extract button clicked successfully');
        }
    }
}, 1000);

console.log('🚨 EMERGENCY FIX TEST COMPLETE');
