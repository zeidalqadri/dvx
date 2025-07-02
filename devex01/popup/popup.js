/**
 * Devex0 Simplified Interface
 * Implements the streamlined workflow: Extract → Copy HTML → Ask for Insights → Asset Analysis → Exass
 */

class Devex0Interface {
  constructor() {
    this.currentTab = null;
    this.extractedHTML = null;
    this.assetAnalysis = null;
    this.selectedSelectors = new Set();
    this.workflowState = 'ready'; // ready, extracted, analyzed, done
    this.extractionAnalyzer = null; // Will be initialized when needed
    this.lastExtractionData = null; // Store for Google Sheets creation
    this.paginationMode = false; // Track if we're in pagination mode
    this.paginationStats = null; // Store pagination detection results
    this.urlPattern = null; // Store detected URL pattern
  }

  async init() {
    try {
      // Get current tab
      this.currentTab = await this.getCurrentTab();
      
      // Show current URL
      this.displayCurrentURL();
      
      // Load Google Sheets dependencies
      await this.loadGoogleSheetsDependencies();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Update status
      this.setStatus('ready - click extract to begin');
      
    } catch (error) {
      console.error('[Devex0] Init failed:', error);
      this.setStatus('initialization failed', 'error');
    }
  }

  async getCurrentTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0] || null);
      });
    });
  }

  displayCurrentURL() {
    if (this.currentTab && this.currentTab.url) {
      const urlDisplay = document.getElementById('urlDisplay');
      const currentUrlElement = document.getElementById('currentUrl');
      
      // Show URL (truncated for display)
      const url = this.currentTab.url;
      const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
      currentUrlElement.textContent = displayUrl;
      urlDisplay.style.display = 'block';
    }
  }

  setupEventListeners() {
    // Main extract button
    document.getElementById('extract').addEventListener('click', () => {
      this.handleExtract();
    });

    // Insight option buttons
    document.getElementById('showInsights').addEventListener('click', () => {
      this.handleShowInsights();
    });

    document.getElementById('skipInsights').addEventListener('click', () => {
      this.handleSkipInsights();
    });

    // Google Sheets creation (from insight options)
    document.getElementById('createGoogleSheet').addEventListener('click', () => {
      this.handleCreateGoogleSheet();
    });

    // Analysis action buttons
    document.getElementById('exass').addEventListener('click', () => {
      this.handleExass();
    });

    document.getElementById('reset').addEventListener('click', () => {
      this.handleReset();
    });

    // Selection controls
    document.getElementById('selectAll').addEventListener('click', () => {
      this.handleSelectAll();
    });

    document.getElementById('clearSelection').addEventListener('click', () => {
      this.handleClearSelection();
    });

    // Google Sheets creation (from analysis results)
    document.getElementById('createAnalysisSheet').addEventListener('click', () => {
      this.handleCreateAnalysisSheet();
    });
  }

  async handleExtract() {
    if (!this.isValidExtractionURL(this.currentTab.url)) {
      this.setStatus('cannot extract from this page type', 'error');
      return;
    }

    const extractBtn = document.getElementById('extract');
    
    try {
      extractBtn.disabled = true;
      extractBtn.classList.add('loading');
      this.setStatus('checking for pagination...');
      
      // First, detect pagination on the page
      const paginationResponse = await this.sendToTab('DETECT_PAGINATION');
      
      if (paginationResponse.success) {
        this.paginationStats = paginationResponse.stats;
        console.log('[Devex0] Pagination detection result:', this.paginationStats);
        
        // Show pagination info to user
        this.showPaginationInfo(paginationResponse.formatted);
        
        if (this.paginationStats.hasPagination) {
          // If pagination detected, enter pagination mode
          this.paginationMode = true;
          this.setStatus('pagination detected - starting URL monitoring');
          
          // Start URL monitoring
          const monitoringResponse = await this.sendToTab('START_URL_MONITORING');
          if (monitoringResponse.success) {
            this.showPaginationGuidance();
            return; // Wait for user to navigate pages
          } else {
            console.warn('[Devex0] URL monitoring failed:', monitoringResponse.error);
            // Continue with normal extraction
            this.paginationMode = false;
          }
        }
      } else {
        console.warn('[Devex0] Pagination detection failed:', paginationResponse.error);
      }
      
      // Normal extraction flow (no pagination or pagination detection failed)
      this.setStatus('extracting HTML content...');
      
      // Extract full page HTML using correct action name
      const response = await this.sendToTab('EXTRACT_HTML', {
        selector: 'html',
        contentType: 'outerHTML'
      });
      
      if (response.success) {
        this.extractedHTML = response.content;
        
        // Store extraction data for Google Sheets
        this.lastExtractionData = {
          url: this.currentTab.url,
          timestamp: new Date().toISOString(),
          totalItems: 0, // Will be updated during analysis
          selectors: [], // Will be populated during analysis
          data: {}, // Will be populated during analysis
          rawHTML: this.extractedHTML,
          paginationMode: this.paginationMode,
          paginationStats: this.paginationStats
        };
        
        // Copy to clipboard
        await navigator.clipboard.writeText(this.extractedHTML);
        
        this.workflowState = 'extracted';
        this.setStatus('HTML copied to clipboard');
        
        // Show insight options
        document.getElementById('extract').style.display = 'none';
        document.getElementById('insightOptions').style.display = 'block';
        
      } else {
        throw new Error(response.error || 'Failed to extract HTML');
      }
      
    } catch (error) {
      console.error('[Devex0] Extract failed:', error);
      this.setStatus(`extract error: ${error.message}`, 'error');
    } finally {
      extractBtn.disabled = false;
      extractBtn.classList.remove('loading');
    }
  }

  showInsightOptions() {
    document.getElementById('insightOptions').style.display = 'block';
    document.getElementById('extract').style.display = 'none';
  }

  async handleShowInsights() {
    const showBtn = document.getElementById('showInsights');
    
    try {
      showBtn.disabled = true;
      showBtn.classList.add('loading');
      this.setStatus('analyzing assets and selectors...');

      if (!this.extractedHTML) {
        throw new Error('No HTML content to analyze');
      }

      // Load the AssetSelectorRanker
      await this.loadAssetRanker();
      
      // Run asset analysis
      const ranker = new window.AssetSelectorRanker(this.extractedHTML);
      this.assetAnalysis = ranker.getFullAnalysis(50); // Increased from 25 to show more selectors
      
      this.workflowState = 'analyzed';
      this.setStatus('asset analysis complete');
      
      // Show analysis results
      this.showAnalysisResults();
      
    } catch (error) {
      console.error('[Devex0] Asset analysis failed:', error);
      this.setStatus(`analysis failed: ${error.message}`, 'error');
    } finally {
      showBtn.disabled = false;
      showBtn.classList.remove('loading');
    }
  }

  handleSkipInsights() {
    this.setStatus('workflow complete - HTML copied to clipboard');
    this.workflowState = 'done';
    this.showResetOption();
  }

  async loadAssetRanker() {
    // Check if already loaded
    if (window.AssetSelectorRanker) {
      return;
    }

    // Load the script dynamically
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '../utils/asset-selector-ranker.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load AssetSelectorRanker'));
      document.head.appendChild(script);
    });
  }

  async loadGoogleSheetsDependencies() {
    try {
      // Check if Google Sheets utilities are available
      if (window.GoogleSheetsIntegration && window.ExtractionAnalyzer) {
        console.log('[Devex0] Google Sheets dependencies already loaded');
        return;
      }

      // Wait a moment for scripts to load if they're still loading
      let attempts = 0;
      const maxAttempts = 10;
      
      while ((!window.GoogleSheetsIntegration || !window.ExtractionAnalyzer) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.GoogleSheetsIntegration) {
        throw new Error('GoogleSheetsIntegration not available');
      }
      
      if (!window.ExtractionAnalyzer) {
        throw new Error('ExtractionAnalyzer not available');
      }

      console.log('[Devex0] Google Sheets dependencies loaded successfully');
      
    } catch (error) {
      console.warn('[Devex0] Google Sheets dependencies failed to load:', error);
      // Don't throw error here - just log warning so extension still works
    }
  }

  async loadGoogleSheetsDependencies() {
    try {
      // Check if Google Sheets utilities are available
      if (window.GoogleSheetsIntegration && window.ExtractionAnalyzer) {
        console.log('[Devex0] Google Sheets dependencies already loaded');
        return;
      }

      // Wait a moment for scripts to load if they're still loading
      let attempts = 0;
      const maxAttempts = 10;
      
      while ((!window.GoogleSheetsIntegration || !window.ExtractionAnalyzer) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.GoogleSheetsIntegration) {
        throw new Error('GoogleSheetsIntegration not available');
      }
      
      if (!window.ExtractionAnalyzer) {
        throw new Error('ExtractionAnalyzer not available');
      }

      console.log('[Devex0] Google Sheets dependencies loaded successfully');
      
    } catch (error) {
      console.warn('[Devex0] Google Sheets dependencies failed to load:', error);
      // Don't throw error here - just log warning so extension still works
    }
  }

  showAnalysisResults() {
    // Hide insight options
    document.getElementById('insightOptions').style.display = 'none';
    
    // Show analysis results
    document.getElementById('analysisResults').style.display = 'block';
    
    // Populate summary
    this.populateAnalysisSummary();
    
    // Populate selectors list
    this.populateSelectorsList();
  }

  populateAnalysisSummary() {
    const summaryElement = document.getElementById('analysisSummary');
    const { summary, pagination } = this.assetAnalysis;
    
    const lines = [
      `📊 ${summary.totalSelectorsFound} total selectors analyzed`,
      `🎯 Showing top ${summary.topSelectorsShown} ranked by relevance`,
      `📄 Pagination: ${pagination.hasPagination ? `✅ ${pagination.type}` : '❌ None detected'}`,
      `⏰ Analysis completed at ${new Date().toLocaleTimeString()}`,
      ``,
      `💡 <strong>How to use:</strong> Click selectors below to select them, then click "exass" to extract data`
    ];
    
    summaryElement.innerHTML = lines.join('<br>');
  }

  populateSelectorsList() {
    const listElement = document.getElementById('selectorsList');
    const { selectors } = this.assetAnalysis;
    
    listElement.innerHTML = '';
    
    if (selectors.length === 0) {
      listElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No high-value selectors found on this page.</div>';
      return;
    }
    
    selectors.forEach((item, index) => {
      const selectorDiv = document.createElement('div');
      selectorDiv.className = 'target-item';
      selectorDiv.dataset.selector = item.selector;
      
      // Generate explanation for what this selector likely contains
      const explanation = this.explainSelector(item.selector, item.finalScore);
      const confidenceLevel = this.getConfidenceLevel(item.finalScore);
      
      selectorDiv.innerHTML = `
        <div style="flex: 1;">
          <div class="target-name">
            <span style="font-weight: bold;">${index + 1}. ${item.selector}</span>
            <span style="margin-left: 8px; padding: 2px 6px; border-radius: 3px; font-size: 9px; background: ${confidenceLevel.color}; color: white;">
              ${confidenceLevel.label}
            </span>
          </div>
          <div class="target-details" style="margin-top: 4px;">
            <div style="color: #333; font-size: 11px;">
              💡 <strong>Likely contains:</strong> ${explanation}
            </div>
            <div style="margin-top: 2px; color: #666; font-size: 10px;">
              📊 Found ${item.count} elements | Score: ${Math.round(item.finalScore)} | Avg: ${item.avgScore}
            </div>
          </div>
        </div>
        <div class="target-score">${Math.round(item.finalScore)}</div>
      `;
      
      // Click to select/deselect
      selectorDiv.addEventListener('click', () => {
        this.toggleSelectorSelection(selectorDiv, item.selector);
      });
      
      listElement.appendChild(selectorDiv);
    });
    
    // Add summary footer
    const footerDiv = document.createElement('div');
    footerDiv.style.cssText = 'padding: 12px; background: #f9f9f9; border-top: 1px solid #eee; font-size: 11px; color: #666;';
    footerDiv.innerHTML = `
      <div><strong>💡 Tips:</strong></div>
      <div>• Higher scores = more relevant for data extraction</div>
      <div>• Select multiple selectors to extract different data types</div>
      <div>• Green labels = high confidence, Yellow = medium, Red = experimental</div>
    `;
    listElement.appendChild(footerDiv);
  }

  explainSelector(selector, score) {
    const selectorLower = selector.toLowerCase();
    
    // Price patterns
    if (/price|cost|amount|total|subtotal/.test(selectorLower)) {
      return "💰 Pricing information, costs, or monetary values";
    }
    
    // Product patterns
    if (/product|item|sku|model|brand/.test(selectorLower)) {
      return "📦 Product information, names, or identifiers";
    }
    
    // Content patterns
    if (/title|name|heading|h[1-6]/.test(selectorLower)) {
      return "📝 Titles, headings, or main content names";
    }
    
    // Description patterns
    if (/desc|detail|info|about|summary/.test(selectorLower)) {
      return "📖 Descriptions, details, or additional information";
    }
    
    // Navigation patterns
    if (/nav|menu|link|button|btn/.test(selectorLower)) {
      return "🧭 Navigation elements, buttons, or interactive controls";
    }
    
    // Image patterns
    if (/img|image|photo|pic|thumbnail/.test(selectorLower)) {
      return "🖼️ Images, photos, or visual content";
    }
    
    // List patterns
    if (/list|item|row|card|tile/.test(selectorLower)) {
      return "📋 List items, cards, or structured content blocks";
    }
    
    // Form patterns
    if (/input|form|field|select|textarea/.test(selectorLower)) {
      return "📝 Form elements, inputs, or user interaction fields";
    }
    
    // Cart/Shopping patterns
    if (/cart|bag|checkout|purchase|buy|add/.test(selectorLower)) {
      return "🛒 Shopping cart, purchase actions, or e-commerce controls";
    }
    
    // Date/Time patterns
    if (/date|time|schedule|calendar/.test(selectorLower)) {
      return "📅 Date, time, or scheduling information";
    }
    
    // Contact patterns
    if (/contact|email|phone|address/.test(selectorLower)) {
      return "📞 Contact information or communication details";
    }
    
    // High score generic
    if (score > 50) {
      return "⭐ High-value content (likely product or key business data)";
    }
    
    // Medium score generic
    if (score > 20) {
      return "📊 Structured data or content with business relevance";
    }
    
    // Default
    return "📄 General content or page elements";
  }

  getConfidenceLevel(score) {
    if (score >= 50) {
      return { label: 'HIGH', color: '#4CAF50' }; // Green
    } else if (score >= 25) {
      return { label: 'MEDIUM', color: '#FF9800' }; // Orange
    } else {
      return { label: 'LOW', color: '#F44336' }; // Red
    }
  }

  toggleSelectorSelection(element, selector) {
    if (this.selectedSelectors.has(selector)) {
      this.selectedSelectors.delete(selector);
      element.classList.remove('selected');
    } else {
      this.selectedSelectors.add(selector);
      element.classList.add('selected');
    }
    
    // Update exass button state
    this.updateExassButton();
  }

  handleSelectAll() {
    // Get all selector elements
    const selectorElements = document.querySelectorAll('.target-item');
    
    selectorElements.forEach(element => {
      const selector = element.dataset.selector;
      if (selector) {
        this.selectedSelectors.add(selector);
        element.classList.add('selected');
      }
    });
    
    this.updateExassButton();
    this.setStatus(`Selected all ${this.selectedSelectors.size} selectors`);
  }

  handleClearSelection() {
    // Clear all selections
    const selectorElements = document.querySelectorAll('.target-item');
    
    selectorElements.forEach(element => {
      element.classList.remove('selected');
    });
    
    this.selectedSelectors.clear();
    this.updateExassButton();
    this.setStatus('Cleared all selections');
  }

  updateExassButton() {
    const exassBtn = document.getElementById('exass');
    exassBtn.textContent = this.selectedSelectors.size > 0 ? 
      `exass (${this.selectedSelectors.size})` : 'exass';
  }

  handleSelectAll() {
    // Get all selector elements
    const selectorElements = document.querySelectorAll('.target-item');
    
    selectorElements.forEach(element => {
      const selector = element.dataset.selector;
      if (selector) {
        this.selectedSelectors.add(selector);
        element.classList.add('selected');
      }
    });
    
    this.updateExassButton();
    this.setStatus(`Selected all ${this.selectedSelectors.size} selectors`);
  }

  handleClearSelection() {
    // Clear all selections
    const selectorElements = document.querySelectorAll('.target-item');
    
    selectorElements.forEach(element => {
      element.classList.remove('selected');
    });
    
    this.selectedSelectors.clear();
    this.updateExassButton();
    this.setStatus('Cleared all selections');
  }

  updateExassButton() {
    const exassBtn = document.getElementById('exass');
    exassBtn.textContent = this.selectedSelectors.size > 0 ? 
      `exass (${this.selectedSelectors.size})` : 'exass';
  }

  async handleExass() {
    const exassBtn = document.getElementById('exass');
    
    try {
      exassBtn.disabled = true;
      exassBtn.classList.add('loading');
      
      if (this.selectedSelectors.size === 0) {
        this.setStatus('select selectors first', 'error');
        return;
      }
      
      this.setStatus(`extracting assets using ${this.selectedSelectors.size} selectors...`);
      
      // Execute focused extraction using selected selectors
      const results = await this.executeFocusedExtraction();
      
      // Copy results to clipboard
      await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      
      this.setStatus(`extracted ${results.totalItems || 0} items - copied to clipboard`);
      this.workflowState = 'done';
      
    } catch (error) {
      console.error('[Devex0] Exass failed:', error);
      this.setStatus(`exass failed: ${error.message}`, 'error');
    } finally {
      exassBtn.disabled = false;
      exassBtn.classList.remove('loading');
    }
  }

  async executeFocusedExtraction() {
    const selectedSelectorsArray = Array.from(this.selectedSelectors);
    const extractionResults = {
      url: this.currentTab.url,
      timestamp: new Date().toISOString(),
      selectors: selectedSelectorsArray,
      totalItems: 0,
      data: {}
    };
    
    // Extract data for each selected selector
    for (const selector of selectedSelectorsArray) {
      try {
        const response = await this.sendToTab('EXTRACT_WITH_SELECTOR', {
          selector: selector,
          options: { includeText: true, includeAttributes: true }
        });
        
        if (response.success && response.data) {
          extractionResults.data[selector] = response.data;
          extractionResults.totalItems += response.data.length || 0;
        }
      } catch (error) {
        console.warn(`[Devex0] Failed to extract ${selector}:`, error);
        extractionResults.data[selector] = { error: error.message };
      }
    }
    
    return extractionResults;
  }

  async handleCopyAnalysis() {
    try {
      if (!this.assetAnalysis) {
        throw new Error('No analysis to copy');
      }
      
      const ranker = new window.AssetSelectorRanker(this.extractedHTML);
      const analysisText = ranker.exportAnalysis(25);
      
      await navigator.clipboard.writeText(analysisText);
      this.setStatus('complete analysis copied to clipboard');
      
    } catch (error) {
      console.error('[Devex0] Copy analysis failed:', error);
      this.setStatus(`copy failed: ${error.message}`, 'error');
    }
  }

  handleReset() {
    // Reset state
    this.extractedHTML = null;
    this.assetAnalysis = null;
    this.selectedSelectors.clear();
    this.workflowState = 'ready';
    
    // Reset pagination state
    this.paginationMode = false;
    this.paginationStats = null;
    this.urlPattern = null;
    
    // Reset UI
    document.getElementById('extract').style.display = 'block';
    document.getElementById('insightOptions').style.display = 'none';
    document.getElementById('analysisResults').style.display = 'none';
    
    // Hide pagination UI
    this.hidePaginationUI();
    
    this.setStatus('ready - click extract to begin');
  }

  showResetOption() {
    document.getElementById('insightOptions').style.display = 'none';
    document.getElementById('analysisResults').style.display = 'block';
    document.getElementById('analysisSummary').innerHTML = 'Workflow complete!';
    document.getElementById('selectorsList').innerHTML = '';
    
    // Hide action buttons, show only reset
    document.getElementById('exass').style.display = 'none';
    document.getElementById('copyAnalysis').style.display = 'none';
  }

  // ============== GOOGLE SHEETS INTEGRATION ==============

  async handleCreateGoogleSheet() {
    // This is called from the insight options (after extract, before analysis)
    if (!this.lastExtractionData) {
      this.setStatus('No extraction data available', 'error');
      return;
    }

    this.showGoogleSheetsStatus('Creating Google Sheet...');

    try {
      // Initialize analyzer if needed
      if (!this.extractionAnalyzer) {
        if (!window.ExtractionAnalyzer) {
          throw new Error('ExtractionAnalyzer not available. Please reload the extension.');
        }
        this.extractionAnalyzer = new window.ExtractionAnalyzer();
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
  }

  async handleCreateAnalysisSheet() {
    // This is called from the analysis results (after analysis is complete)
    if (!this.lastExtractionData || !this.assetAnalysis) {
      this.setStatus('No analysis data available', 'error');
      return;
    }

    this.showGoogleSheetsStatus('Creating enhanced analysis sheet...');

    try {
      // Initialize analyzer if needed
      if (!this.extractionAnalyzer) {
        if (!window.ExtractionAnalyzer) {
          throw new Error('ExtractionAnalyzer not available. Please reload the extension.');
        }
        this.extractionAnalyzer = new window.ExtractionAnalyzer();
      }

      // Create enhanced Google Sheet with full analysis
      const result = await this.extractionAnalyzer.createAnalysisSheet(this.lastExtractionData);

      if (result.success) {
        this.showGoogleSheetsSuccess(result.sheetUrl);
        this.setStatus('Enhanced Google Sheet created!');
        
        // Show summary in popup
        const summaryReport = this.extractionAnalyzer.generateSummaryReport(result.analysis);
        this.showAnalysisSummary(summaryReport);
      } else {
        this.showGoogleSheetsError(result.error);
        this.setStatus(`Failed to create analysis sheet: ${result.error}`, 'error');
      }

    } catch (error) {
      console.error('[Devex0] Analysis sheet creation failed:', error);
      this.showGoogleSheetsError(error.message);
      this.setStatus(`Analysis sheet error: ${error.message}`, 'error');
    }
  }

  showGoogleSheetsStatus(message) {
    const statusDiv = document.getElementById('googleSheetsStatus');
    const messageDiv = document.getElementById('sheetsStatusMessage');
    const urlDiv = document.getElementById('sheetsUrl');

    statusDiv.style.display = 'block';
    messageDiv.textContent = message;
    urlDiv.style.display = 'none';
  }

  showGoogleSheetsSuccess(sheetUrl) {
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
  }

  showGoogleSheetsError(error) {
    const statusDiv = document.getElementById('googleSheetsStatus');
    const messageDiv = document.getElementById('sheetsStatusMessage');
    const urlDiv = document.getElementById('sheetsUrl');

    statusDiv.style.display = 'block';
    statusDiv.style.borderColor = '#f44336';
    statusDiv.style.background = '#fff0f0';
    
    messageDiv.textContent = `❌ Error: ${error}`;
    urlDiv.style.display = 'none';
  }

  showAnalysisSummary(summaryReport) {
    // Update the analysis summary with Google Sheets report
    const summaryElement = document.getElementById('analysisSummary');
    summaryElement.innerHTML = summaryReport.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  // ============== END GOOGLE SHEETS INTEGRATION ==============

  // ============== PAGINATION HELPER METHODS ==============

  showPaginationInfo(formattedStats) {
    // Update status with pagination info
    this.setStatus('pagination analysis complete');
    
    // Show pagination info in the summary area (create if doesn't exist)
    let paginationInfoDiv = document.getElementById('paginationInfo');
    if (!paginationInfoDiv) {
      paginationInfoDiv = document.createElement('div');
      paginationInfoDiv.id = 'paginationInfo';
      paginationInfoDiv.style.cssText = `
        font-size: 11px; 
        margin-bottom: 12px; 
        padding: 8px; 
        border: 1px solid #2196F3; 
        background: #e3f2fd; 
        border-radius: 4px;
        white-space: pre-line;
      `;
      
      // Insert after URL display
      const urlDisplay = document.getElementById('urlDisplay');
      urlDisplay.parentNode.insertBefore(paginationInfoDiv, urlDisplay.nextSibling);
    }
    
    paginationInfoDiv.innerHTML = `<strong>📄 Pagination Analysis:</strong>\n${formattedStats}`;
    paginationInfoDiv.style.display = 'block';
  }

  showPaginationGuidance() {
    // Show guidance for user navigation
    let guidanceDiv = document.getElementById('paginationGuidance');
    if (!guidanceDiv) {
      guidanceDiv = document.createElement('div');
      guidanceDiv.id = 'paginationGuidance';
      guidanceDiv.style.cssText = `
        font-size: 11px; 
        margin-bottom: 12px; 
        padding: 12px; 
        border: 1px solid #ff9800; 
        background: #fff3e0; 
        border-radius: 4px;
      `;
      
      // Insert after pagination info
      const paginationInfo = document.getElementById('paginationInfo');
      if (paginationInfo) {
        paginationInfo.parentNode.insertBefore(guidanceDiv, paginationInfo.nextSibling);
      } else {
        const urlDisplay = document.getElementById('urlDisplay');
        urlDisplay.parentNode.insertBefore(guidanceDiv, urlDisplay.nextSibling);
      }
    }
    
    guidanceDiv.innerHTML = `
      <strong>🎯 Please navigate through pages:</strong><br>
      1. Click "Next" or page numbers 2-3 times<br>
      2. I'll detect the URL pattern automatically<br>
      3. Then return here to continue extraction<br><br>
      <button id="checkPattern" style="padding: 6px 12px; font-size: 10px; background: #ff9800; color: white; border: none; border-radius: 3px; cursor: pointer;">
        Check Pattern
      </button>
    `;
    guidanceDiv.style.display = 'block';
    
    // Add event listener for pattern check
    document.getElementById('checkPattern').addEventListener('click', () => {
      this.checkURLPattern();
    });
  }

  async checkURLPattern() {
    try {
      this.setStatus('analyzing URL pattern...');
      
      // Record current URL change
      await this.sendToTab('RECORD_URL_CHANGE');
      
      // Stop monitoring and get pattern
      const patternResponse = await this.sendToTab('STOP_URL_MONITORING');
      
      if (patternResponse.success && patternResponse.pattern.success) {
        this.urlPattern = patternResponse.pattern;
        this.showPatternConfirmation();
      } else {
        this.setStatus('pattern detection failed - please navigate more pages', 'error');
        console.error('[Devex0] Pattern detection failed:', patternResponse.pattern?.error);
      }
    } catch (error) {
      console.error('[Devex0] Pattern check failed:', error);
      this.setStatus('pattern check failed', 'error');
    }
  }

  showPatternConfirmation() {
    // Hide guidance
    const guidanceDiv = document.getElementById('paginationGuidance');
    if (guidanceDiv) {
      guidanceDiv.style.display = 'none';
    }
    
    // Show pattern confirmation
    let confirmDiv = document.getElementById('patternConfirmation');
    if (!confirmDiv) {
      confirmDiv = document.createElement('div');
      confirmDiv.id = 'patternConfirmation';
      confirmDiv.style.cssText = `
        font-size: 11px; 
        margin-bottom: 12px; 
        padding: 12px; 
        border: 1px solid #4CAF50; 
        background: #f0fff0; 
        border-radius: 4px;
      `;
      
      const guidanceDiv = document.getElementById('paginationGuidance');
      if (guidanceDiv) {
        guidanceDiv.parentNode.insertBefore(confirmDiv, guidanceDiv.nextSibling);
      }
    }
    
    const maxPages = this.paginationStats?.totalPages || 10;
    confirmDiv.innerHTML = `
      <strong>✅ Pattern Detected!</strong><br>
      Type: ${this.urlPattern.type}<br>
      Template: ${this.urlPattern.pattern.template}<br><br>
      <strong>Ready to process ${maxPages} pages?</strong><br>
      <div style="margin-top: 8px;">
        <label style="font-size: 10px;">Max pages: 
          <input id="maxPagesInput" type="number" value="${maxPages}" min="1" max="1000" 
                 style="width: 60px; padding: 2px; margin-left: 4px;">
        </label>
      </div><br>
      <button id="processPagesBtn" style="padding: 8px 16px; font-size: 11px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 8px;">
        Process All Pages
      </button>
      <button id="singlePageBtn" style="padding: 8px 16px; font-size: 11px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer;">
        Single Page Only
      </button>
    `;
    confirmDiv.style.display = 'block';
    
    // Add event listeners
    document.getElementById('processPagesBtn').addEventListener('click', () => {
      const maxPages = parseInt(document.getElementById('maxPagesInput').value) || 10;
      this.processAllPages(maxPages);
    });
    
    document.getElementById('singlePageBtn').addEventListener('click', () => {
      this.processSinglePage();
    });
  }

  async processAllPages(maxPages) {
    try {
      this.setStatus('starting multi-page processing...');
      
      // Hide confirmation UI and show progress
      this.hidePatternConfirmation();
      this.showProcessingProgress();
      
      // Generate all page URLs using detected pattern
      const pageURLs = this.generatePageURLs(maxPages);
      
      if (pageURLs.length === 0) {
        throw new Error('Failed to generate page URLs from pattern');
      }
      
      console.log('[Devex0] Generated URLs for processing:', pageURLs);
      
      // Initialize processing state
      const processingState = {
        totalPages: pageURLs.length,
        currentPage: 0,
        successfulPages: 0,
        failedPages: 0,
        totalItems: 0,
        allPageData: [],
        allSelectors: new Set(),
        startTime: Date.now()
      };
      
      // Process each page
      for (let i = 0; i < pageURLs.length; i++) {
        const pageURL = pageURLs[i];
        const pageNumber = i + 1;
        
        processingState.currentPage = pageNumber;
        this.updateProcessingProgress(processingState, `Loading page ${pageNumber}...`);
        
        try {
          // Navigate to page with retry mechanism
          const pageData = await this.processSinglePageWithRetry(pageURL, pageNumber, 3);
          
          if (pageData.success) {
            processingState.successfulPages++;
            processingState.totalItems += pageData.itemCount || 0;
            processingState.allPageData.push(pageData);
            
            // Collect unique selectors discovered
            if (pageData.selectors) {
              pageData.selectors.forEach(sel => processingState.allSelectors.add(sel));
            }
            
            this.updateProcessingProgress(processingState, 
              `Page ${pageNumber}: Found ${pageData.itemCount || 0} items`);
          } else {
            processingState.failedPages++;
            console.warn(`[Devex0] Page ${pageNumber} failed:`, pageData.error);
            this.updateProcessingProgress(processingState, 
              `Page ${pageNumber}: Failed - ${pageData.error}`);
          }
          
        } catch (error) {
          processingState.failedPages++;
          console.error(`[Devex0] Page ${pageNumber} error:`, error);
          this.updateProcessingProgress(processingState, 
            `Page ${pageNumber}: Error - ${error.message}`);
        }
        
        // Small delay between pages to avoid overwhelming the server
        if (i < pageURLs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Processing complete - show results
      await this.showMultiPageResults(processingState);
      
    } catch (error) {
      console.error('[Devex0] Multi-page processing failed:', error);
      this.setStatus(`multi-page processing failed: ${error.message}`, 'error');
      this.hideProcessingProgress();
    }
  }

  generatePageURLs(maxPages) {
    if (!this.urlPattern || !this.urlPattern.success) {
      console.error('[Devex0] No valid URL pattern for generation');
      return [];
    }

    const urls = [];
    const { pattern, increment, startValue } = this.urlPattern;

    for (let page = 1; page <= maxPages; page++) {
      let pageValue;
      
      if (increment === 1) {
        // Simple page numbering: 1, 2, 3, ...
        pageValue = page;
      } else {
        // Offset-based: 0, 20, 40, ... or 1, 21, 41, ...
        pageValue = startValue + (page - 1) * increment;
      }

      const url = pattern.template.replace('{PAGE}', pageValue);
      urls.push(url);
    }

    return urls;
  }

  async processSinglePageWithRetry(pageURL, pageNumber, maxRetries) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Devex0] Processing page ${pageNumber}, attempt ${attempt}: ${pageURL}`);
        
        // Navigate to the page using Chrome tabs API
        await this.navigateToPage(pageURL);
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Re-run asset analysis on this page
        const analysisResult = await this.runAssetAnalysisOnCurrentPage();
        
        if (!analysisResult.success) {
          throw new Error(`Asset analysis failed: ${analysisResult.error}`);
        }
        
        // Extract data using discovered selectors
        const extractionResult = await this.extractDataFromCurrentPage(analysisResult.selectors);
        
        return {
          success: true,
          pageNumber: pageNumber,
          url: pageURL,
          itemCount: extractionResult.totalItems || 0,
          selectors: analysisResult.selectors.map(s => s.selector),
          analysis: analysisResult,
          extraction: extractionResult,
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        console.warn(`[Devex0] Page ${pageNumber} attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed
    return {
      success: false,
      pageNumber: pageNumber,
      url: pageURL,
      error: lastError?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }

  async navigateToPage(url) {
    return new Promise((resolve, reject) => {
      chrome.tabs.update(this.currentTab.id, { url: url }, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });
  }

  async runAssetAnalysisOnCurrentPage() {
    try {
      // Extract HTML from current page
      const htmlResponse = await this.sendToTab('EXTRACT_HTML', {
        selector: 'html',
        contentType: 'outerHTML'
      });
      
      if (!htmlResponse.success) {
        throw new Error('Failed to extract HTML for analysis');
      }
      
      // Load AssetSelectorRanker if needed
      await this.loadAssetRanker();
      
      // Run analysis
      const ranker = new window.AssetSelectorRanker(htmlResponse.content);
      const analysis = ranker.getFullAnalysis(25); // Get top 25 selectors
      
      return {
        success: true,
        selectors: analysis.selectors,
        summary: analysis.summary,
        pagination: analysis.pagination
      };
      
    } catch (error) {
      console.error('[Devex0] Asset analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async extractDataFromCurrentPage(selectors) {
    const extractionResults = {
      totalItems: 0,
      data: {},
      selectorsUsed: []
    };
    
    // Use top 10 selectors for extraction to get comprehensive data
    const topSelectors = selectors.slice(0, 10).map(s => s.selector);
    
    for (const selector of topSelectors) {
      try {
        const response = await this.sendToTab('EXTRACT_WITH_SELECTOR', {
          selector: selector,
          options: { includeText: true, includeAttributes: true, smartExtraction: true }
        });
        
        if (response.success && response.data && response.data.length > 0) {
          extractionResults.data[selector] = response.data;
          extractionResults.totalItems += response.data.length;
          extractionResults.selectorsUsed.push(selector);
        }
      } catch (error) {
        console.warn(`[Devex0] Failed to extract ${selector}:`, error);
      }
    }
    
    return extractionResults;
  }

  async processSinglePage() {
    // Hide pagination UI elements
    this.hidePaginationUI();
    
    // Continue with normal extraction
    this.setStatus('proceeding with single-page extraction...');
    
    try {
      // Extract full page HTML
      const response = await this.sendToTab('EXTRACT_HTML', {
        selector: 'html',
        contentType: 'outerHTML'
      });
      
      if (response.success) {
        this.extractedHTML = response.content;
        
        // Store extraction data for Google Sheets
        this.lastExtractionData = {
          url: this.currentTab.url,
          timestamp: new Date().toISOString(),
          totalItems: 0,
          selectors: [],
          data: {},
          rawHTML: this.extractedHTML,
          paginationMode: this.paginationMode,
          paginationStats: this.paginationStats,
          urlPattern: this.urlPattern
        };
        
        // Copy to clipboard
        await navigator.clipboard.writeText(this.extractedHTML);
        
        this.workflowState = 'extracted';
        this.setStatus('HTML copied to clipboard');
        
        // Show insight options
        document.getElementById('extract').style.display = 'none';
        document.getElementById('insightOptions').style.display = 'block';
        
      } else {
        throw new Error(response.error || 'Failed to extract HTML');
      }
    } catch (error) {
      console.error('[Devex0] Single page extraction failed:', error);
      this.setStatus(`extraction failed: ${error.message}`, 'error');
    }
  }

  hidePaginationUI() {
    // Hide all pagination-related UI elements
    const elements = ['paginationInfo', 'paginationGuidance', 'patternConfirmation'];
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });
  }

  // ============== END PAGINATION HELPER METHODS ==============

  async sendToTab(action, data = {}) {
    if (!this.currentTab) {
      throw new Error('no active tab');
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        this.currentTab.id,
        { action, data, timestamp: Date.now() },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'no response' });
          }
        }
      );
    });
  }

  setStatus(message, type = '') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
  }

  isValidExtractionURL(url) {
    try {
      const urlObj = new URL(url);
      
      // Exclude chrome:// and other internal URLs
      if (urlObj.protocol === 'chrome:' || 
          urlObj.protocol === 'chrome-extension:' ||
          urlObj.protocol === 'moz-extension:' ||
          urlObj.protocol === 'file:') {
        return false;
      }
      
      // Only allow HTTP and HTTPS
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const devex0 = new Devex0Interface();
  window.devex0Interface = devex0; // Make available globally for debugging
  devex0.init();
});