const express = require('express');
const router = express.Router();
const { createClient, paginateAll } = require('../klaviyoClient');

function calculateDeliverabilityScore({ bounceRate, unsubscribeRate, spamRate }) {
  // Score starts at 100, deduct for bad metrics
  let score = 100;

  // Bounce rate: <2% is good, >5% is very bad
  if (bounceRate > 0.05) score -= 30;
  else if (bounceRate > 0.03) score -= 20;
  else if (bounceRate > 0.02) score -= 10;
  else if (bounceRate > 0.01) score -= 5;

  // Unsubscribe rate: <0.3% is good, >1% is very bad
  if (unsubscribeRate > 0.01) score -= 25;
  else if (unsubscribeRate > 0.005) score -= 15;
  else if (unsubscribeRate > 0.003) score -= 8;
  else if (unsubscribeRate > 0.002) score -= 3;

  // Spam rate: <0.08% is acceptable
  if (spamRate > 0.001) score -= 30;
  else if (spamRate > 0.0008) score -= 20;
  else if (spamRate > 0.0005) score -= 10;
  else if (spamRate > 0.0003) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

router.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;
  const apiKey = process.env.KLAVIYO_PRIVATE_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'KLAVIYO_PRIVATE_KEY not configured' });
  }

  try {
    const client = createClient(apiKey);

    // Fetch metrics to find bounce/unsubscribe/spam metrics
    const [metricsRes, listsRes] = await Promise.all([
      client.get('/metrics'),
      paginateAll(client, '/lists', {
        'fields[list]': 'name,created,updated',
      }),
    ]);

    const metrics = metricsRes.data?.data || [];

    // Find relevant metrics by name
    const findMetric = (name) =>
      metrics.find((m) =>
        m.attributes?.name?.toLowerCase().includes(name.toLowerCase())
      );

    const bounceMetric = findMetric('Bounced Email');
    const unsubMetric = findMetric('Unsubscribed');
    const spamMetric = findMetric('Marked as Spam');
    const sentMetric = findMetric('Received Email') || findMetric('Sent Email');

    // Query metric aggregates
    async function queryMetricCount(metricId) {
      if (!metricId) return 0;
      try {
        const r = await client.post('/metric-aggregates/', {
          data: {
            type: 'metric-aggregate',
            attributes: {
              metric_id: metricId,
              measurements: ['count'],
              interval: 'month',
              filter: `greater-or-equal(datetime,${startDate}T00:00:00Z),less-or-equal(datetime,${endDate}T23:59:59Z)`,
              timezone: 'UTC',
            },
          },
        });
        const results = r.data?.data?.attributes?.data || [];
        return results.reduce((sum, d) => sum + (d.measurements?.count?.[0] || 0), 0);
      } catch (err) {
        console.error(`[deliverability] queryMetricCount(${metricId}) error:`, JSON.stringify(err.response?.data || err.message));
        return 0;
      }
    }

    const [bounceCount, unsubCount, spamCount, sentCount] = await Promise.all([
      queryMetricCount(bounceMetric?.id),
      queryMetricCount(unsubMetric?.id),
      queryMetricCount(spamMetric?.id),
      queryMetricCount(sentMetric?.id),
    ]);

    // Profile counts
    let totalProfiles = 0;
    let suppressedProfiles = 0;
    try {
      const profilesRes = await client.get('/profiles');
      totalProfiles = profilesRes.data?.meta?.total || 0;
    } catch (err) {
      console.error('[deliverability] profiles count error:', JSON.stringify(err.response?.data || err.message));
      totalProfiles = 0;
    }

    // Get list totals
    const totalListSize = listsRes.reduce((sum, l) => sum + (l.attributes?.profile_count || 0), 0);

    const bounceRate = sentCount > 0 ? bounceCount / sentCount : 0;
    const unsubscribeRate = sentCount > 0 ? unsubCount / sentCount : 0;
    const spamRate = sentCount > 0 ? spamCount / sentCount : 0;

    const deliverabilityScore = calculateDeliverabilityScore({
      bounceRate,
      unsubscribeRate,
      spamRate,
    });

    res.json({
      deliverability: {
        totalListSize,
        totalProfiles,
        suppressedProfiles,
        emailsSent: sentCount,
        bounceCount,
        unsubscribeCount: unsubCount,
        spamCount,
        bounceRate,
        unsubscribeRate,
        spamRate,
        deliverabilityScore,
      },
    });
  } catch (err) {
    console.error('[deliverability] route error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.errors?.[0]?.detail || err.message,
    });
  }
});

module.exports = router;
