# Multi-Page Processing Crash Recovery Guide

## 🚨 Issue: Extension Disappearing During Multi-Page Processing

### Problem Description
The extension terminates/crashes during multi-page processing, typically after processing the first URL and starting the second. This results in lost progress and no visible results.

### Root Causes
1. **Chrome Extension Context Loss**: Navigation between pages can invalidate the extension context
2. **Content Script Disconnection**: Content scripts may become unavailable after navigation
3. **Memory/Resource Limits**: Processing large amounts of data can exhaust extension resources
4. **Network Timeouts**: Slow page loads can cause processing to hang

## ✅ Solutions Implemented

### 1. Incremental Progress Saving
- **Before Each Page**: Progress is saved to Chrome storage before processing
- **After Success**: Results are incrementally saved after each successful page
- **On Error**: Partial results are preserved even during crashes

### 2. Crash Detection & Recovery
- **Context Loss Detection**: Detects when extension context becomes invalid
- **Automatic Recovery**: Saves partial results and shows recovery UI
- **Graceful Degradation**: Continues processing even if some pages fail

### 3. Recovery UI Features
- **Crash Recovery Banner**: Shows when partial results are available
- **Copy Partial Results**: Retrieve data from interrupted processing
- **Clear Recovery**: Dismiss recovery and start fresh

## 🛠️ How It Works Now

### During Processing
```
Page 1: ✅ Processed → Saved to storage
Page 2: 🔄 Processing → CRASH occurs
Extension: 💾 Detects crash → Saves partial results
User: 🔄 Reopens extension → Sees recovery option
```

### Recovery Process
1. **Reopen Extension**: Click extension icon after crash
2. **Recovery Banner**: "🔄 Processing Recovery Available!"
3. **View Results**: Shows pages processed and items found
4. **Copy Results**: Click "📋 Copy Partial Results"
5. **Dismiss**: Clear recovery state if not needed

## 🎯 Usage Tips

### For Reliable Processing
1. **Start Small**: Test with 2-3 pages first
2. **Reduce Page Limit**: Use 5-10 pages instead of 20+
3. **Stable Network**: Ensure good internet connection
4. **Close Other Tabs**: Reduce browser memory usage

### If Crashes Occur
1. **Don't Panic**: Partial results are saved automatically
2. **Reopen Extension**: Check for recovery banner
3. **Copy Results**: Save what was processed successfully
4. **Retry with Fewer Pages**: Reduce page limit and try again

### Debugging Steps
1. **Check Browser Console**: Look for error messages
2. **Monitor Memory**: Close unnecessary tabs/extensions
3. **Network Issues**: Check if pages load slowly
4. **Extension Logs**: Look for specific error patterns

## 📊 Expected Partial Results Format

Even if processing crashes, you'll get structured data:
```json
{
  "multiPageExtraction": true,
  "status": "crashed_partial",
  "summary": {
    "totalPages": 10,
    "successfulPages": 3,
    "failedPages": 0,
    "totalItems": 87,
    "processingTime": 15000,
    "crashedAt": 4
  },
  "pages": [...], // Data from successfully processed pages
  "metadata": {
    "crashReason": "Extension context lost during navigation"
  }
}
```

## 🔧 Advanced Troubleshooting

### Common Error Messages
- **"Extension context invalidated"**: Reload extension and retry
- **"Cannot access chrome.tabs"**: Permission issue, check manifest
- **"No response from content script"**: Page navigation failed

### Performance Optimization
- **Reduce Selectors**: Use fewer selectors for extraction
- **Increase Delays**: Add longer waits between pages
- **Single-Page Fallback**: Use single-page mode for complex sites

### Alternative Approaches
1. **Manual Mode**: Process pages individually
2. **Smaller Batches**: Split large pagination into chunks
3. **Different Time**: Try during off-peak hours

## 🚀 Success Indicators

### Normal Processing
```
[Devex0] Processing page 1/5...
[Devex0] Page 1: Found 23 items
[Devex0] Incremental results saved (1 pages)
[Devex0] Processing page 2/5...
```

### Crash Recovery
```
[Devex0] Processing crash - saving partial results
[Devex0] Handling processing crash - saving partial results
[Devex0] Found partial results from interrupted processing
```

## 📝 Reporting Issues

If crashes persist, provide:
1. **Browser Console Logs**: Copy all error messages
2. **Page URL**: Which site you're testing on
3. **Page Count**: How many pages you're trying to process
4. **Error Point**: Which page number causes the crash
5. **Recovery Data**: Whether partial results are saved

The extension now has robust crash recovery, so your data won't be lost even if processing is interrupted!