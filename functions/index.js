const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines';
const newsApiKey = defineSecret('NEWS_API_KEY');

exports.newsProxy = onRequest({ region: 'us-central1', secrets: [newsApiKey] }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ status: 'error', message: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = newsApiKey.value();
    if (!apiKey) {
      res.status(500).json({ status: 'error', message: 'Server missing NEWS_API_KEY' });
      return;
    }

    const country = String(req.query.country || 'us');
    const pageSize = String(req.query.pageSize || '10');

    const params = new URLSearchParams({
      country,
      pageSize,
      apiKey,
    });

    const response = await fetch(`${NEWS_API_URL}?${params.toString()}`);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch headlines' });
  }
});
