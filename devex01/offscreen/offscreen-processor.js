/**
 * Offscreen Document for Headless JavaScript-enabled Processing
 * This runs in the background and can execute JavaScript without affecting visible tabs
 */

class OffscreenProcessor {
  constructor() {
    this.isProcessing = false;
    this.processingFrame = document.getElementById('processing-frame');
    this.statusElement = document.getElementById('status');
    this.urlElement = document.getElementById('current-url');
    this.itemsElement = document.getElementById('items-count');
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
    
    console.log('[OffscreenProcessor] Initialized and ready for headless processing');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'PROCESS_PAGE_HEADLESS':
          const result = await this.processPageHeadless(message.url, message.options || {});
          sendResponse(result);
          break;
          
        case 'PROCESS_MULTIPLE_PAGES':
          const batchResult = await this.processMultiplePages(message.urls, message.options || {});
          sendResponse(batchResult);
          break;
          
        case 'GET_STATUS':
          sendResponse({
            success: true,
            isProcessing: this.isProcessing,
            ready: true
          });
          break;
          
        default:
          sendResponse({
            success: false,
            error: `Unknown action: ${message.action}`
          });
      }
    } catch (error) {
      console.error('[OffscreenProcessor] Message handling error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async processPageHeadless(url, options = {}) {
    if (this.isProcessing) {
      return {
        success: false,
        error: 'Processor is busy'
      };
    }

    try {
      this.isProcessing = true;
      this.updateStatus('Loading page...');
      this.updateURL(url);
      
      console.log(`[OffscreenProcessor] Processing page: ${url}`);
      
      // Load page in hidden iframe
      await this.loadPageInFrame(url);
      
      // Wait for JavaScript to execute
      await new Promise(resolve => setTimeout(resolve, options.loadDelay || 3000));
      
      this.updateStatus('Analyzing content...');
      
      // Get the page content after JavaScript execution
      const frameDocument = this.processingFrame.contentDocument;
      if (!frameDocument) {
        throw new Error('Could not access frame document');
      }
      
      const htmlContent = frameDocument.documentElement.outerHTML;
      
      // Run asset analysis
      const analysisResult = await this.runAssetAnalysis(htmlContent);
      
      if (!analysisResult.success) {
        throw new Error(`Asset analysis failed: ${analysisResult.error}`);
      }
      
      this.updateStatus('Extracting data...');
      
      // Extract data using discovered selectors
      const extractionResult = await this.extractDataFromDocument(frameDocument, analysisResult.selectors);
      
      this.updateItemsCount(extractionResult.totalItems);
      this.updateStatus('Complete');
      
      console.log(`[OffscreenProcessor] Successfully processed page: ${extractionResult.totalItems} items`);
      
      return {
        success: true,
        url: url,
        itemCount: extractionResult.totalItems || 0,
        selectors: analysisResult.selectors.map(s => s.selector),
        analysis: analysisResult,
        extraction: extractionResult,
        method: 'offscreen_headless',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[OffscreenProcessor] Processing error:', error);
      this.updateStatus(`Error: ${error.message}`);
      
      return {
        success: false,
        url: url,
        error: error.message,
        method: 'offscreen_headless_failed',
        timestamp: new Date().toISOString()
      };
    } finally {
      this.isProcessing = false;
    }
  }

  async processMultiplePages(urls, options = {}) {
    const results = [];
    const startTime = Date.now();
    
    console.log(`[OffscreenProcessor] Processing ${urls.length} pages`);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const pageNumber = i + 1;
      
      console.log(`[OffscreenProcessor] Processing page ${pageNumber}/${urls.length}: ${url}`);
      
      const result = await this.processPageHeadless(url, options);
      results.push(result);
      
      // Small delay between pages
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, options.pageDelay || 1000));
      }
    }
    
    const totalItems = results.reduce((sum, result) => sum + (result.itemCount || 0), 0);
    const successfulPages = results.filter(r => r.success).length;
    
    return {
      success: true,
      totalPages: urls.length,
      successfulPages: successfulPages,
      failedPages: urls.length - successfulPages,
      totalItems: totalItems,
      processingTime: Date.now() - startTime,
      results: results,
      method: 'offscreen_batch',
      timestamp: new Date().toISOString()
    };
  }

  loadPageInFrame(url) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Page load timeout'));
      }, 30000); // 30 second timeout
      
      const onLoad = () => {
        clearTimeout(timeout);
        this.processingFrame.removeEventListener('load', onLoad);
        this.processingFrame.removeEventListener('error', onError);
        resolve();
      };
      
      const onError = () => {
        clearTimeout(timeout);
        this.processingFrame.removeEventListener('load', onLoad);
        this.processingFrame.removeEventListener('error', onError);
        reject(new Error('Failed to load page in iframe'));
      };
      
      this.processingFrame.addEventListener('load', onLoad);
      this.processingFrame.addEventListener('error', onError);
      
      // Load the page
      this.processingFrame.src = url;
    });
  }

  async runAssetAnalysis(htmlContent) {
    try {
      // Use the AssetSelectorRanker from the loaded script
      if (!window.AssetSelectorRanker) {
        throw new Error('AssetSelectorRanker not available in offscreen document');
      }
      
      const ranker = new window.AssetSelectorRanker(htmlContent);
      const analysis = ranker.getFullAnalysis(25);
      
      return {
        success: true,
        selectors: analysis.selectors,
        summary: analysis.summary,
        pagination: analysis.pagination
      };
    } catch (error) {
      console.error('[OffscreenProcessor] Asset analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async extractDataFromDocument(document, selectors) {
    const extractionResults = {
      totalItems: 0,
      data: {},
      selectorsUsed: []
    };
    
    try {
      // Use top 10 selectors for extraction
      const topSelectors = selectors.slice(0, 10).map(s => s.selector);
      
      for (const selector of topSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          
          if (elements.length > 0) {
            const extractedData = [];
            
            elements.forEach((element, index) => {
              const itemData = {
                index: index,
                text: element.textContent?.trim() || '',
                html: element.outerHTML?.substring(0, 500) || '',
                tagName: element.tagName.toLowerCase()
              };
              
              // Extract common attributes
              if (element.id) itemData.id = element.id;
              if (element.className) itemData.className = element.className;
              if (element.getAttribute('href')) itemData.href = element.getAttribute('href');
              if (element.getAttribute('src')) itemData.src = element.getAttribute('src');
              if (element.getAttribute('alt')) itemData.alt = element.getAttribute('alt');
              if (element.getAttribute('data-price')) itemData.price = element.getAttribute('data-price');
              
              extractedData.push(itemData);
            });
            
            extractionResults.data[selector] = extractedData;
            extractionResults.totalItems += extractedData.length;
            extractionResults.selectorsUsed.push(selector);
          }
        } catch (selectorError) {
          console.warn(`[OffscreenProcessor] Failed to extract ${selector}:`, selectorError);
        }
      }
      
      return extractionResults;
    } catch (error) {
      console.error('[OffscreenProcessor] Document extraction error:', error);
      return {
        totalItems: 0,
        data: {},
        selectorsUsed: [],
        error: error.message
      };
    }
  }

  updateStatus(status) {
    this.statusElement.textContent = status;
    console.log(`[OffscreenProcessor] Status: ${status}`);
  }

  updateURL(url) {
    this.urlElement.textContent = url;
  }

  updateItemsCount(count) {
    this.itemsElement.textContent = count;
  }
}

// Initialize the offscreen processor
const offscreenProcessor = new OffscreenProcessor();