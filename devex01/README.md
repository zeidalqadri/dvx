# DevEx0 Minimal - Intelligent Web Scraper

A lightweight Chrome extension for intelligent web scraping using CSS selector ranking.

## 🚀 Features

- **Smart Selector Ranking**: Automatically identifies the most relevant CSS selectors on any webpage
- **E-commerce Optimized**: Prioritizes product data, prices, and inventory information  
- **Simple Workflow**: Extract → Analyze → Select → Extract focused data
- **Lightweight**: Minimal footprint with core functionality only

## 📦 Installation

1. **Clone this repository**:
   ```bash
   git clone https://github.com/zeidalqadri/devex0.git
   cd devex0
   ```

2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this directory

## 🎯 Usage

1. Navigate to any webpage
2. Click the DevEx0 extension icon
3. Click "EXTRACT" to analyze the page
4. Choose "yes, analyze" for intelligent insights
5. Select relevant CSS selectors
6. Click "exass" for focused data extraction

## 📁 Project Structure

```
devex0-minimal/
├── manifest.json          # Extension configuration
├── popup/
│   ├── popup.html         # Extension UI
│   └── popup.js           # Main workflow logic  
├── utils/
│   └── asset-selector-ranker.js  # Core ranking algorithm
├── content-scripts/
│   └── extractor.js       # Data extraction engine
└── icons/                 # Extension icons
```

## 🛠️ Core Algorithm

The AssetSelectorRanker analyzes HTML and scores CSS selectors based on:
- E-commerce relevance keywords (price, sku, product, etc.)
- Stable attributes (data-testid, id)
- Text content patterns
- Structured data (JSON-LD)
- Element positioning and context

Perfect for extracting structured data from e-commerce sites, product listings, and content-rich pages.

## 📄 License

MIT License - see LICENSE file for details.