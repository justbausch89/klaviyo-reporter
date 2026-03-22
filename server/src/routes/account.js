const express = require('express');
const router = express.Router();
const { createClient } = require('../klaviyoClient');

router.get('/', async (req, res) => {
  const apiKey = process.env.KLAVIYO_PRIVATE_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'KLAVIYO_PRIVATE_KEY not configured', configured: false });
  }

  try {
    const client = createClient(apiKey);
    const response = await client.get('/accounts/');
    const account = response.data?.data?.[0];

    res.json({
      configured: true,
      account: {
        id: account?.id,
        name: account?.attributes?.contact_information?.organization_name || 'Unknown',
        timezone: account?.attributes?.timezone,
        currency: account?.attributes?.preferred_currency,
      },
    });
  } catch (err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      return res.status(401).json({
        error: 'Invalid API key. Please check your KLAVIYO_PRIVATE_KEY.',
        configured: false,
      });
    }
    res.status(status || 500).json({
      error: err.response?.data?.errors?.[0]?.detail || err.message,
      configured: false,
    });
  }
});

module.exports = router;
