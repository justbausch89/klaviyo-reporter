const express = require('express');
const router = express.Router();
const { createClient, paginateAll } = require('../klaviyoClient');

router.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;
  const apiKey = process.env.KLAVIYO_PRIVATE_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'KLAVIYO_PRIVATE_KEY not configured' });
  }

  try {
    const client = createClient(apiKey);

    // Fetch all flows
    const flows = await paginateAll(client, '/flows', {
      'filter': 'equals(status,"live")',
      'fields[flow]': 'name,status,trigger_type,created,updated',
    });

    // Fetch flow value reports in batches
    const batchSize = 5;
    const flowsWithReports = [];

    for (let i = 0; i < flows.length; i += batchSize) {
      const batch = flows.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (flow) => {
          try {
            const reportRes = await client.get('/flow-values-reports/', {
              params: {
                'filter': `equals(flow_id,"${flow.id}"),greater-or-equal(datetime,${startDate}T00:00:00Z),less-or-equal(datetime,${endDate}T23:59:59Z)`,
                'statistics': 'opens,clicks,unsubscribes,bounces,revenue,conversions,recipients',
              },
            });
            const stats = reportRes.data?.data?.attributes?.results?.[0] || {};
            const emailsSent = stats.statistics?.recipients || 0;
            return {
              id: flow.id,
              name: flow.attributes?.name || 'Unknown',
              status: flow.attributes?.status,
              triggerType: flow.attributes?.trigger_type || 'unknown',
              created: flow.attributes?.created,
              updated: flow.attributes?.updated,
              emailsSent,
              openRate: stats.statistics?.open_rate || 0,
              clickRate: stats.statistics?.click_rate || 0,
              unsubscribeRate: stats.statistics?.unsubscribe_rate || 0,
              bounceRate: stats.statistics?.bounce_rate || 0,
              revenue: stats.statistics?.revenue || 0,
              conversions: stats.statistics?.conversions || 0,
              conversionRate: stats.statistics?.conversion_rate || 0,
              isStale: emailsSent === 0,
            };
          } catch (err) {
            return {
              id: flow.id,
              name: flow.attributes?.name || 'Unknown',
              status: flow.attributes?.status,
              triggerType: flow.attributes?.trigger_type || 'unknown',
              created: flow.attributes?.created,
              updated: flow.attributes?.updated,
              emailsSent: 0,
              openRate: 0,
              clickRate: 0,
              unsubscribeRate: 0,
              bounceRate: 0,
              revenue: 0,
              conversions: 0,
              conversionRate: 0,
              isStale: true,
              error: 'Report unavailable',
            };
          }
        })
      );
      flowsWithReports.push(...results);
    }

    // Sort by revenue descending
    flowsWithReports.sort((a, b) => b.revenue - a.revenue);

    res.json({ flows: flowsWithReports });
  } catch (err) {
    console.error('Flows error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.errors?.[0]?.detail || err.message,
    });
  }
});

module.exports = router;
