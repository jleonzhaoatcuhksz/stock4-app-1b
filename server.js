const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const Sentiment = require('sentiment');
const natural = require('natural');
const sentiment = new Sentiment();

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

    // Use Python scraper to get news data
    const pythonCommand = process.platform === 'win32' ? 'py' : 'python3';
    const pythonProcess = exec(`${pythonCommand} scraper.py ${symbol}`, 
      { cwd: __dirname, timeout: 15000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Python error: ${stderr}`);
          return res.status(500).json({ error: 'Scraping failed', details: stderr });
        }
        
        try {
          const news = JSON.parse(stdout);
          if (Array.isArray(news) && news.length === 0) {
            return res.status(404).json({ error: 'No news found' });
          } else if (news.error) {
            return res.status(500).json({ error: news.error });
          }

          // Add sentiment analysis to each news item
          const analyzedNews = news.map(item => {
            const sentimentResult = sentiment.analyze(item.title);
            return {
              ...item,
              sentiment: {
                score: sentimentResult.score,
                comparative: sentimentResult.comparative,
                positive: sentimentResult.positive,
                negative: sentimentResult.negative
              }
            };
          });
          
          res.json({ symbol, news: analyzedNews });
        } catch (e) {
          console.error('Failed to parse scraped data:', e);
          res.status(500).json({ error: 'Failed to parse scraped data', details: e.message });
        }
      }
    );
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sentiment analysis endpoint
app.get('/api/sentiment/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    if (!NASDAQ_STOCKS.includes(symbol)) {
      return res.status(400).json({ error: 'Invalid NASDAQ symbol' });
    }

    // Get news data first
    const newsResponse = await axios.get(`http://localhost:${PORT}/api/news/${symbol}`);
    const newsData = newsResponse.data.news;

    // Calculate overall sentiment
    const totalScore = newsData.reduce((sum, item) => sum + item.sentiment.score, 0);
    const avgScore = totalScore / newsData.length;

    res.json({
      symbol,
      sentimentScore: avgScore,
      newsCount: newsData.length,
      breakdown: newsData.map(item => ({
        title: item.title,
        score: item.sentiment.score
      }))
    });
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

// Get port from command line, environment variable, or default
const getPort = () => {
  if (process.argv[2]) return parseInt(process.argv[2]);
  if (process.env.PORT) return parseInt(process.env.PORT);
  return 3015; // New default port
};

const PORT = getPort();
const server = app.listen(PORT, () => {
  console.log(`
=== Server Started ===`);
  console.log(`Port: ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
  console.log(`Registered routes:`);
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`- ${middleware.route.stack[0].method.toUpperCase()} ${middleware.route.path}`);
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying another port...`);
    const newPort = PORT + 1;
    server.listen(newPort);
  } else {
    console.error('Server error:', err);
  }
});

// Verify all routes
console.log('Registered routes:');
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`${middleware.route.stack[0].method.toUpperCase()} ${middleware.route.path}`);
  }
});