/**
 * Pagination Detection and Management Utility
 * Handles automatic pagination detection, pattern recognition, and multi-page processing
 */

class PaginationDetector {
  constructor() {
    this.urlHistory = [];
    this.detectedPattern = null;
    this.paginationStats = null;
    this.isMonitoring = false;
  }

  /**
   * Detect pagination elements and stats on current page
   */
  detectPaginationOnPage() {
    const stats = {
      hasPagination: false,
      totalPages: null,
      currentPage: null,
      totalItems: null,
      itemsPerPage: null,
      paginationElements: [],
      paginationType: null
    };

    // Look for pagination indicators
    const paginationSelectors = [
      '.pagination', '.pager', '.page-numbers', '.paginate',
      '[class*="pagination"]', '[class*="pager"]', '[id*="pagination"]',
      'nav[aria-label*="pagination" i]', 'nav[aria-label*="pager" i]'
    ];

    let paginationContainer = null;
    for (const selector of paginationSelectors) {
      paginationContainer = document.querySelector(selector);
      if (paginationContainer) {
        stats.paginationType = 'numbered';
        break;
      }
    }

    // Look for next/previous buttons
    const nextPrevSelectors = [
      'a[aria-label*="next" i]', 'button[aria-label*="next" i]',
      'a[aria-label*="previous" i]', 'button[aria-label*="previous" i]',
      'a:contains("Next")', 'a:contains("Previous")',
      'button:contains("Next")', 'button:contains("Previous")',
      '[class*="next"]', '[class*="prev"]'
    ];

    let hasNextPrev = false;
    for (const selector of nextPrevSelectors) {
      try {
        if (document.querySelector(selector)) {
          hasNextPrev = true;
          if (!stats.paginationType) {
            stats.paginationType = 'next_prev';
          }
          break;
        }
      } catch (e) {
        // Skip invalid selectors
        continue;
      }
    }

    // Check for infinite scroll indicators
    const infiniteScrollSelectors = [
      '[class*="infinite"]', '[class*="load-more"]', '[class*="show-more"]'
    ];

    for (const selector of infiniteScrollSelectors) {
      if (document.querySelector(selector)) {
        stats.paginationType = 'infinite_scroll';
        break;
      }
    }

    // Look for Load More buttons by text content
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      const text = button.textContent.toLowerCase();
      if (text.includes('load more') || text.includes('show more')) {
        stats.paginationType = 'infinite_scroll';
        break;
      }
    }

    stats.hasPagination = !!(paginationContainer || hasNextPrev || stats.paginationType);

    // Extract pagination numbers if found
    if (paginationContainer) {
      const pageLinks = paginationContainer.querySelectorAll('a, button, span');
      const pageNumbers = [];
      
      pageLinks.forEach(link => {
        const text = link.textContent.trim();
        const pageNum = parseInt(text);
        if (!isNaN(pageNum) && pageNum > 0) {
          pageNumbers.push(pageNum);
        }
      });

      if (pageNumbers.length > 0) {
        stats.totalPages = Math.max(...pageNumbers);
        stats.currentPage = this.findCurrentPage(pageLinks);
      }

      stats.paginationElements = Array.from(pageLinks).map(el => ({
        text: el.textContent.trim(),
        tag: el.tagName.toLowerCase(),
        href: el.getAttribute('href'),
        classes: el.className
      }));
    }

    // Look for result count indicators
    const resultCountSelectors = [
      '[class*="result"]', '[class*="count"]', '[class*="total"]',
      '[class*="showing"]', '[class*="items"]', '[class*="products"]'
    ];

    for (const selector of resultCountSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent.toLowerCase();
        
        // Pattern: "showing 1-20 of 500 results"
        const showingMatch = text.match(/showing\s+(\d+)[-–]\s*(\d+)\s+of\s+(\d+)/);
        if (showingMatch) {
          const [, start, end, total] = showingMatch;
          stats.totalItems = parseInt(total);
          stats.itemsPerPage = parseInt(end) - parseInt(start) + 1;
          stats.currentPage = Math.ceil(parseInt(start) / stats.itemsPerPage);
          if (stats.itemsPerPage > 0) {
            stats.totalPages = Math.ceil(stats.totalItems / stats.itemsPerPage);
          }
          break;
        }

        // Pattern: "page 5 of 47"
        const pageOfMatch = text.match(/page\s+(\d+)\s+of\s+(\d+)/);
        if (pageOfMatch) {
          const [, current, total] = pageOfMatch;
          stats.currentPage = parseInt(current);
          stats.totalPages = parseInt(total);
          break;
        }

        // Pattern: "500 products" or "1,234 items"
        const totalMatch = text.match(/(\d+(?:,\d+)*)\s+(?:products|items|results)/);
        if (totalMatch) {
          stats.totalItems = parseInt(totalMatch[1].replace(/,/g, ''));
          break;
        }
      }
    }

    return stats;
  }

  /**
   * Find the current page from pagination elements
   */
  findCurrentPage(pageElements) {
    for (const element of pageElements) {
      if (element.classList.contains('current') || 
          element.classList.contains('active') ||
          element.classList.contains('selected') ||
          element.getAttribute('aria-current') === 'page') {
        const pageNum = parseInt(element.textContent.trim());
        if (!isNaN(pageNum)) {
          return pageNum;
        }
      }
    }
    return null;
  }

  /**
   * Start monitoring URL changes during user navigation
   */
  startURLMonitoring() {
    this.isMonitoring = true;
    this.urlHistory = [window.location.href];
    
    // Store original URL for comparison
    this.originalURL = window.location.href;
    
    console.log('[PaginationDetector] Started URL monitoring from:', this.originalURL);
    return this.originalURL;
  }

  /**
   * Record URL change during navigation
   */
  recordURLChange() {
    if (!this.isMonitoring) return;
    
    const currentURL = window.location.href;
    if (currentURL !== this.urlHistory[this.urlHistory.length - 1]) {
      this.urlHistory.push(currentURL);
      console.log('[PaginationDetector] Recorded URL change:', currentURL);
      console.log('[PaginationDetector] URL history:', this.urlHistory);
    }
  }

  /**
   * Stop monitoring and analyze URL pattern
   */
  stopURLMonitoring() {
    this.isMonitoring = false;
    
    if (this.urlHistory.length < 2) {
      return {
        success: false,
        error: 'Not enough URL changes recorded. Please navigate through at least 2 pages.'
      };
    }

    const pattern = this.analyzeURLPattern();
    if (pattern.success) {
      this.detectedPattern = pattern;
      return pattern;
    } else {
      return pattern;
    }
  }

  /**
   * Analyze URL pattern from navigation history
   */
  analyzeURLPattern() {
    if (this.urlHistory.length < 2) {
      return {
        success: false,
        error: 'Insufficient URL history for pattern analysis'
      };
    }

    const urls = this.urlHistory.slice(); // Copy array
    const baseURL = urls[0];
    const differences = [];

    // Find differences between consecutive URLs
    for (let i = 1; i < urls.length; i++) {
      const diff = this.findURLDifference(urls[i-1], urls[i]);
      if (diff) {
        differences.push(diff);
      }
    }

    if (differences.length === 0) {
      return {
        success: false,
        error: 'No consistent pattern found in URL changes'
      };
    }

    // Analyze the most common pattern type
    const patternTypes = differences.map(d => d.type);
    const mostCommonType = this.getMostCommon(patternTypes);
    
    const relevantDiffs = differences.filter(d => d.type === mostCommonType);
    
    if (relevantDiffs.length === 0) {
      return {
        success: false,
        error: 'No consistent pattern detected'
      };
    }

    // Determine the pattern details
    const pattern = this.buildPattern(baseURL, relevantDiffs);
    
    return {
      success: true,
      type: mostCommonType,
      pattern: pattern.template,
      increment: pattern.increment,
      startValue: pattern.startValue,
      parameter: pattern.parameter,
      urlHistory: this.urlHistory,
      differences: relevantDiffs
    };
  }

  /**
   * Find difference between two URLs
   */
  findURLDifference(url1, url2) {
    try {
      const parsed1 = new URL(url1);
      const parsed2 = new URL(url2);

      // Check query parameters
      const params1 = new URLSearchParams(parsed1.search);
      const params2 = new URLSearchParams(parsed2.search);

      for (const [key, value1] of params1) {
        const value2 = params2.get(key);
        if (value2 && value1 !== value2) {
          const num1 = parseInt(value1);
          const num2 = parseInt(value2);
          
          if (!isNaN(num1) && !isNaN(num2)) {
            return {
              type: 'query_param',
              parameter: key,
              oldValue: num1,
              newValue: num2,
              increment: num2 - num1
            };
          }
        }
      }

      // Check path segments
      const path1 = parsed1.pathname.split('/').filter(p => p);
      const path2 = parsed2.pathname.split('/').filter(p => p);

      for (let i = 0; i < Math.max(path1.length, path2.length); i++) {
        const segment1 = path1[i] || '';
        const segment2 = path2[i] || '';
        
        if (segment1 !== segment2) {
          const num1 = parseInt(segment1);
          const num2 = parseInt(segment2);
          
          if (!isNaN(num1) && !isNaN(num2)) {
            return {
              type: 'path_segment',
              position: i,
              oldValue: num1,
              newValue: num2,
              increment: num2 - num1
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('[PaginationDetector] Error analyzing URL difference:', error);
      return null;
    }
  }

  /**
   * Build URL pattern template from differences
   */
  buildPattern(baseURL, differences) {
    const firstDiff = differences[0];
    
    if (firstDiff.type === 'query_param') {
      // Determine increment pattern
      const increments = differences.map(d => d.increment);
      const avgIncrement = increments.reduce((a, b) => a + b, 0) / increments.length;
      
      return {
        template: baseURL.split('?')[0] + '?' + this.buildQueryTemplate(baseURL, firstDiff.parameter),
        increment: Math.round(avgIncrement),
        startValue: firstDiff.oldValue,
        parameter: firstDiff.parameter
      };
    } else if (firstDiff.type === 'path_segment') {
      const increments = differences.map(d => d.increment);
      const avgIncrement = increments.reduce((a, b) => a + b, 0) / increments.length;
      
      return {
        template: this.buildPathTemplate(baseURL, firstDiff.position),
        increment: Math.round(avgIncrement),
        startValue: firstDiff.oldValue,
        parameter: `path_segment_${firstDiff.position}`
      };
    }

    return null;
  }

  /**
   * Build query parameter template
   */
  buildQueryTemplate(baseURL, changingParam) {
    try {
      const url = new URL(baseURL);
      const params = new URLSearchParams(url.search);
      
      const templateParams = [];
      for (const [key, value] of params) {
        if (key === changingParam) {
          templateParams.push(`${key}={PAGE}`);
        } else {
          templateParams.push(`${key}=${value}`);
        }
      }
      
      return templateParams.join('&');
    } catch (error) {
      return '{PAGE}';
    }
  }

  /**
   * Build path template
   */
  buildPathTemplate(baseURL, changingPosition) {
    try {
      const url = new URL(baseURL);
      const pathSegments = url.pathname.split('/').filter(p => p);
      
      const templateSegments = pathSegments.map((segment, index) => {
        if (index === changingPosition) {
          return '{PAGE}';
        }
        return segment;
      });
      
      return url.origin + '/' + templateSegments.join('/') + (url.search || '');
    } catch (error) {
      return baseURL.replace(/\d+/, '{PAGE}');
    }
  }

  /**
   * Generate all page URLs based on detected pattern
   */
  generatePageURLs(maxPage) {
    if (!this.detectedPattern || !this.detectedPattern.success) {
      return [];
    }

    const urls = [];
    const { pattern, increment, startValue } = this.detectedPattern;

    for (let page = 1; page <= maxPage; page++) {
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

  /**
   * Get most common element in array
   */
  getMostCommon(arr) {
    const counts = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  /**
   * Format pagination stats for display
   */
  formatStatsForDisplay(stats) {
    const lines = [];
    
    if (stats.hasPagination) {
      lines.push(`🔍 Pagination detected: ${stats.paginationType || 'unknown type'}`);
      
      if (stats.totalPages) {
        lines.push(`📄 Total pages: ${stats.totalPages}`);
      }
      
      if (stats.currentPage) {
        lines.push(`📍 Current page: ${stats.currentPage}`);
      }
      
      if (stats.totalItems) {
        lines.push(`📊 Total items: ${stats.totalItems.toLocaleString()}`);
      }
      
      if (stats.itemsPerPage) {
        lines.push(`📋 Items per page: ${stats.itemsPerPage}`);
      }
    } else {
      lines.push(`❌ No pagination detected on this page`);
    }
    
    return lines.join('\n');
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      urlHistoryLength: this.urlHistory.length,
      hasPattern: !!(this.detectedPattern && this.detectedPattern.success)
    };
  }
}

// Make available globally
window.PaginationDetector = PaginationDetector;