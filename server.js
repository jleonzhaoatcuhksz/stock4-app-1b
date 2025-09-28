const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static('public'));

// Top 20 NASDAQ stocks by market cap
const NASDAQ_STOCKS = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL',
  'META', 'TSLA', 'AVGO', 'PEP', 'COST',
  'CSCO', 'ADBE', 'INTC', 'CMCSA', 'AMD',
  'TXN', 'QCOM', 'AMGN', 'HON', 'INTU'
];

// Scrape endpoint
app.get('/api/news/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    if (!NASDAQ_STOCKS.includes(symbol)) {
      return res.status(400).json({ error: 'Invalid NASDAQ symbol' });
    }

    // In production, this would call a Python scraping service
    const mockNews = [
      {
        source: 'Yahoo Finance',
        title: `${symbol} surges on earnings beat`,
        date: new Date().toISOString(),
        url: `https://finance.yahoo.com/quote/${symbol}`
      },
      {
        source: 'MarketWatch',
        title: `Analysts raise ${symbol} price target`,
        date: new Date(Date.now() - 86400000).toISOString(),
        url: `https://www.marketwatch.com/investing/stock/${symbol}`
      }
    ];

    res.json({ symbol, news: mockNews });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available stocks
app.get('/api/stocks', (req, res) => {
  res.json(NASDAQ_STOCKS);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Stock News Scraper running on port ${PORT}`);
});