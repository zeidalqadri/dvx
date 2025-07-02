/**
 * Google Sheets Integration for DevEx0
 * Handles automated creation and population of Google Sheets with extraction results
 */

class GoogleSheetsIntegration {
  constructor() {
    this.authToken = null;
    this.isAuthenticated = false;
  }

  /**
   * Authenticate with Google and get access token
   */
  async authenticate() {
    try {
      console.log('🔐 Starting Google Sheets authentication...');
      
      // Use Chrome's identity API for OAuth
      const authResult = await chrome.identity.getAuthToken({
        interactive: true,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });
      
      if (authResult && authResult.token) {
        this.authToken = authResult.token;
        this.isAuthenticated = true;
        console.log('✅ Google Sheets authentication successful');
        return true;
      } else {
        throw new Error('No auth token received');
      }
    } catch (error) {
      console.error('❌ Google Sheets authentication failed:', error);
      this.isAuthenticated = false;
      
      // Provide user-friendly error messages
      if (error.message.includes('OAuth2 not granted or revoked')) {
        throw new Error('Google account access was denied. Please try again and grant permissions.');
      } else if (error.message.includes('invalid_request')) {
        throw new Error('OAuth configuration error. Please check the extension setup.');
      } else {
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }
  }

  /**
   * Create a new Google Sheet with extraction results
   */
  async createAnalysisSheet(extractionData, analysisResults) {
    if (!this.isAuthenticated) {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Authentication required for Google Sheets integration');
      }
    }

    try {
      // Create new spreadsheet
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `DevEx0 Analysis - ${new URL(extractionData.url).hostname} - ${new Date().toISOString().split('T')[0]}`
          },
          sheets: [
            {
              properties: {
                title: 'Raw Data',
                gridProperties: { rowCount: 1000, columnCount: 10 }
              }
            },
            {
              properties: {
                title: 'Product Analysis',
                gridProperties: { rowCount: 1000, columnCount: 15 }
              }
            },
            {
              properties: {
                title: 'Images',
                gridProperties: { rowCount: 1000, columnCount: 5 }
              }
            }
          ]
        })
      });

      const spreadsheet = await createResponse.json();
      const spreadsheetId = spreadsheet.spreadsheetId;

      console.log(`✅ Created spreadsheet: ${spreadsheetId}`);

      // Populate the sheets
      await this.populateRawDataSheet(spreadsheetId, extractionData);
      await this.populateAnalysisSheet(spreadsheetId, analysisResults);
      await this.populateImagesSheet(spreadsheetId, analysisResults);

      // Return the spreadsheet URL
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      
      return {
        success: true,
        spreadsheetId,
        url: spreadsheetUrl,
        message: 'Google Sheet created successfully!'
      };

    } catch (error) {
      console.error('❌ Failed to create Google Sheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate product key (JavaScript version)
   */
  generateProductKey(productData, index) {
    if (!productData || typeof productData !== 'object') {
      return `PRODUCT_${String(index).padStart(3, '0')}`;
    }

    // Try existing product identifiers
    const idFields = ['sku', 'gtin', 'mpn', 'productID', 'id', '@id'];
    for (const field of idFields) {
      if (productData[field]) {
        return String(productData[field]);
      }
    }

    // Create key from brand + name
    let brand = '';
    if (productData.brand) {
      brand = typeof productData.brand === 'object' ? 
             (productData.brand.name || '') : String(productData.brand);
    }

    const name = productData.name || '';

    if (brand && name) {
      const combined = `${brand}_${name}`.toLowerCase().replace(/\s+/g, '_');
      // Simple hash function for JavaScript
      let hash = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      const hashStr = Math.abs(hash).toString(16).substring(0, 8);
      return `${brand.substring(0, 10).replace(/\s+/g, '_')}_${hashStr}`;
    }

    return `PRODUCT_${String(index).padStart(3, '0')}`;
  }

  /**
   * Extract image URLs from product data
   */
  extractImageUrls(productData) {
    const imageUrls = [];
    const imageFields = ['image', 'images', 'thumbnail', 'photo', 'picture'];

    for (const field of imageFields) {
      if (productData[field]) {
        const images = productData[field];

        if (typeof images === 'string') {
          imageUrls.push(images);
        } else if (Array.isArray(images)) {
          for (const img of images) {
            if (typeof img === 'string') {
              imageUrls.push(img);
            } else if (img && img.url) {
              imageUrls.push(img.url);
            }
          }
        } else if (images && images.url) {
          imageUrls.push(images.url);
        }
      }
    }

    // Remove duplicates and clean URLs
    const uniqueUrls = [];
    for (const url of imageUrls) {
      if (url && !uniqueUrls.includes(url)) {
        if (url.startsWith('http') || url.startsWith('//')) {
          uniqueUrls.push(url);
        } else if (url.startsWith('/')) {
          uniqueUrls.push(`[RELATIVE]${url}`);
        }
      }
    }

    return uniqueUrls.slice(0, 5); // Limit to 5 images
  }
}

// Make available globally
window.GoogleSheetsIntegration = GoogleSheetsIntegration;
