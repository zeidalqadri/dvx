// GOOGLE SHEETS HOTFIX - Add missing methods to existing instance
// Copy-paste into Extension Popup Console

console.log('🔧 GOOGLE SHEETS HOTFIX STARTING...');

// Add the missing methods directly to the existing devex0Interface
if (window.devex0Interface) {
    console.log('📝 Adding Google Sheets methods to existing interface...');
    
    // Add handleCreateGoogleSheet method
    window.devex0Interface.handleCreateGoogleSheet = async function() {
        console.log('📊 Creating Google Sheet...');
        
        if (!this.lastExtractionData) {
            this.setStatus('No extraction data available', 'error');
            return;
        }

        this.showGoogleSheetsStatus('Creating Google Sheet...');

        try {
            // Initialize analyzer if needed
            if (!this.extractionAnalyzer) {
                this.extractionAnalyzer = new ExtractionAnalyzer();
            }

            // Create the Google Sheet with raw extraction data
            const result = await this.extractionAnalyzer.createAnalysisSheet(this.lastExtractionData);

            if (result.success) {
                this.showGoogleSheetsSuccess(result.sheetUrl);
                this.setStatus('Google Sheet created successfully!');
            } else {
                this.showGoogleSheetsError(result.error);
                this.setStatus(`Failed to create Google Sheet: ${result.error}`, 'error');
            }

        } catch (error) {
            console.error('[Devex0] Google Sheets creation failed:', error);
            this.showGoogleSheetsError(error.message);
            this.setStatus(`Google Sheets error: ${error.message}`, 'error');
        }
    };
    
    // Add helper methods
    window.devex0Interface.showGoogleSheetsStatus = function(message) {
        const statusDiv = document.getElementById('googleSheetsStatus');
        const messageDiv = document.getElementById('sheetsStatusMessage');
        const urlDiv = document.getElementById('sheetsUrl');

        statusDiv.style.display = 'block';
        messageDiv.textContent = message;
        urlDiv.style.display = 'none';
    };
    
    window.devex0Interface.showGoogleSheetsSuccess = function(sheetUrl) {
        const statusDiv = document.getElementById('googleSheetsStatus');
        const messageDiv = document.getElementById('sheetsStatusMessage');
        const urlDiv = document.getElementById('sheetsUrl');
        const linkEl = urlDiv.querySelector('a');

        statusDiv.style.display = 'block';
        statusDiv.style.borderColor = '#4CAF50';
        statusDiv.style.background = '#f0fff0';
        
        messageDiv.textContent = '✅ Google Sheet created successfully!';
        
        linkEl.href = sheetUrl;
        urlDiv.style.display = 'block';
    };
    
    window.devex0Interface.showGoogleSheetsError = function(error) {
        const statusDiv = document.getElementById('googleSheetsStatus');
        const messageDiv = document.getElementById('sheetsStatusMessage');
        const urlDiv = document.getElementById('sheetsUrl');

        statusDiv.style.display = 'block';
        statusDiv.style.borderColor = '#f44336';
        statusDiv.style.background = '#fff0f0';
        
        messageDiv.textContent = `❌ Error: ${error}`;
        urlDiv.style.display = 'none';
    };
    
    console.log('✅ Google Sheets methods added successfully!');
    console.log('handleCreateGoogleSheet:', typeof window.devex0Interface.handleCreateGoogleSheet);
    
    // Test the button click now
    console.log('🔘 Testing Google Sheets button...');
    const createSheetBtn = document.getElementById('createGoogleSheet');
    if (createSheetBtn) {
        createSheetBtn.click();
        console.log('✅ Button clicked - watch for Google auth prompt!');
    }
    
} else {
    console.log('❌ No devex0Interface found');
}

console.log('🔧 GOOGLE SHEETS HOTFIX COMPLETE');
