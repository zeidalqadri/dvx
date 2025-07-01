/**
 * JavaScript port of the JSON dump analysis functionality
 * Analyzes extraction results and prepares data for Google Sheets
 */

class ExtractionAnalyzer {
  constructor() {
    this.googleSheets = new GoogleSheetsIntegration();
  }

  /**
   * Analyze extraction data and prepare for visualization
   */
  analyzeExtraction(extractionData) {
    const analysis = {
      metadata: {
        url: extractionData.url,
        timestamp: extractionData.timestamp,
        totalItems: extractionData.totalItems,
        selectors: extractionData.selectors || []
      },
      products: {},
      otherData: {},
      statistics: {
        totalProducts: 0,
        totalImages: 0,
        averageDataQuality: 0
      }
    };

    let productIndex = 0;

    // Process each selector's data
    for (const selector of analysis.metadata.selectors) {
      const items = extractionData.data && extractionData.data[selector] ? extractionData.data[selector] : [];
      
      if (items.length === 0) continue;

      // Check if this is a product-related selector
      const isProductSelector = this.isProductSelector(selector);

      if (isProductSelector) {
        console.log(`🔍 Processing product selector: ${selector} (${items.length} items)`);
        
        for (const item of items) {
          productIndex++;
          
          // Try to extract JSON-LD data from text content
          const productData = this.extractProductData(item);
          
          // Generate unique key
          const productKey = this.googleSheets.generateProductKey(productData, productIndex);
          
          // Store product information
          analysis.products[productKey] = {
            parsed_data: productData,
            raw_text: item.innerText || '',
            selector: selector,
            index: productIndex
          };
        }
      } else {
        // Store non-product data
        analysis.otherData[selector] = items;
      }
    }

    // Calculate statistics
    analysis.statistics.totalProducts = Object.keys(analysis.products).length;
    
    let totalImages = 0;
    let totalDataFields = 0;
    
    for (const productInfo of Object.values(analysis.products)) {
      const images = this.googleSheets.extractImageUrls(productInfo.parsed_data);
      totalImages += images.length;
      totalDataFields += Object.keys(productInfo.parsed_data).length;
    }
    
    analysis.statistics.totalImages = totalImages;
    analysis.statistics.averageDataQuality = analysis.statistics.totalProducts > 0 ? 
      Math.round(totalDataFields / analysis.statistics.totalProducts * 10) / 10 : 0;

    return analysis;
  }

  /**
   * Check if a selector is likely for product data
   */
  isProductSelector(selector) {
    const productKeywords = [
      'product', 'item', 'tile', 'card', 'listing', 
      'goods', 'merchandise', 'catalog'
    ];
    
    const selectorLower = selector.toLowerCase();
    return productKeywords.some(keyword => selectorLower.includes(keyword));
  }

  /**
   * Extract product data from item text content
   */
  extractProductData(item) {
    const textContent = item.text || '';
    
    // Try to find JSON-LD data in the text
    const jsonMatch = textContent.match(/^{.*}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.warn('Failed to parse JSON from item text:', error);
      }
    }

    // Fallback: create basic product data from available fields
    return {
      name: item.innerText ? item.innerText.substring(0, 100) : 'Unknown Product',
      source: 'extracted_text',
      rawText: item.innerText || ''
    };
  }

  /**
   * Create and populate Google Sheet with analysis results
   */
  async createAnalysisSheet(extractionData) {
    try {
      // Analyze the extraction data
      const analysis = this.analyzeExtraction(extractionData);
      
      console.log('📊 Analysis complete:', {
        products: analysis.statistics.totalProducts,
        images: analysis.statistics.totalImages,
        dataQuality: analysis.statistics.averageDataQuality
      });

      // Create Google Sheet
      const result = await this.googleSheets.createAnalysisSheet(extractionData, analysis);
      
      return {
        success: result.success,
        analysis: analysis,
        sheetUrl: result.url,
        message: result.message || result.error
      };

    } catch (error) {
      console.error('❌ Failed to create analysis sheet:', error);
      return {
        success: false,
        error: error.message,
        analysis: null
      };
    }
  }

  /**
   * Generate a summary report for the popup display
   */
  generateSummaryReport(analysis) {
    const report = [];
    
    report.push(`📊 **Analysis Summary**`);
    report.push(`🌐 URL: ${analysis.metadata.url}`);
    report.push(`📦 Products Found: ${analysis.statistics.totalProducts}`);
    report.push(`🖼️ Total Images: ${analysis.statistics.totalImages}`);
    report.push(`📈 Avg Data Quality: ${analysis.statistics.averageDataQuality} fields/product`);
    report.push(`🔍 Selectors Used: ${analysis.metadata.selectors.length}`);
    
    if (analysis.statistics.totalProducts > 0) {
      report.push(``);
      report.push(`🏆 **Top Products Found:**`);
      
      const productEntries = Object.entries(analysis.products).slice(0, 3);
      for (const [key, productInfo] of productEntries) {
        const product = productInfo.parsed_data;
        const brand = product.brand && product.brand.name ? product.brand.name : (product.brand || 'Unknown');
        const name = product.name || 'Unnamed Product';
        const imageCount = this.googleSheets.extractImageUrls(product).length;
        
        report.push(`• ${brand} - ${name.substring(0, 30)}${name.length > 30 ? '...' : ''} (${imageCount} images)`);
      }
    }

    return report.join('\n');
  }
}

// Make available globally
window.ExtractionAnalyzer = ExtractionAnalyzer;
