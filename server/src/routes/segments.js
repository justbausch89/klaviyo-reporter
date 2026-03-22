const express = require('express');
const router = express.Router();
const { createClient, paginateAll } = require('../klaviyoClient');

router.get('/', async (req, res) => {
  const apiKey = process.env.KLAVIYO_PRIVATE_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'KLAVIYO_PRIVATE_KEY not configured' });
  }

  try {
    const client = createClient(apiKey);

    console.log('[segments] Fetching segments');
    const segments = await paginateAll(client, '/segments', {
      'fields[segment]': 'name,created,updated',
    });

    // Sort by profile count, take top 10
    const sorted = segments
      .map((s) => ({
        id: s.id,
        name: s.attributes?.name || 'Unknown',
        profileCount: s.attributes?.profile_count || 0,
        created: s.attributes?.created,
        updated: s.attributes?.updated,
        isEmpty: (s.attributes?.profile_count || 0) === 0,
      }))
      .sort((a, b) => b.profileCount - a.profileCount)
      .slice(0, 10);

    res.json({ segments: sorted, totalSegments: segments.length });
  } catch (err) {
    console.error('[segments] route error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.errors?.[0]?.detail || err.message,
    });
  }
});

module.exports = router;
