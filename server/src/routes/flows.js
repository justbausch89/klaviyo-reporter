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

    // Fetch all live flows
    const flows = await paginateAll(client, '/flows', {
      'filter': 'equals(status,"live")',
      'fields[flow]': 'name,status,trigger_type,created,updated',
    });

    if (flows.length === 0) {
      return res.json({ flows: [] });
    }

    // Fetch a single bulk report for all flows in the period (POST endpoint in v2024)
    let reportResults = [];
    try {
      const reportRes = await client.post('/flow-values-reports/', {
        data: {
          type: 'flow-values-report',
          attributes: {
            timeframe: {
              start: `${startDate}T00:00:00+00:00`,
              end: `${endDate}T23:59:59+00:00`,
            },
            statistics: [
              'opens',
              'unique_opens',
              'clicks',
              'unique_clicks',
              'unsubscribes',
              'bounces',
              'revenue',
              'conversions',
              'recipients',
            ],
          },
        },
      });
      reportResults = reportRes.data?.data?.attributes?.results || [];
    } catch (err) {
      console.warn('Flow values report failed:', err.response?.data?.errors?.[0]?.detail || err.message);
    }

    // Build a lookup map: flow_id → statistics
    const statsById = {};
    for (const r of reportResults) {
      const fid = r.flow_id || r.id;
      if (fid) statsById[fid] = r.statistics || r;
    }

    const flowsWithReports = flows.map((flow) => {
      const stats = statsById[flow.id] || {};
      const recipients = stats.recipients || stats.unique_recipients || 0;
      const opens = stats.unique_opens || stats.opens || 0;
      const clicks = stats.unique_clicks || stats.clicks || 0;
      const unsubs = stats.unsubscribes || 0;
      const bounces = stats.bounces || 0;
      const revenue = stats.revenue || 0;
      const conversions = stats.conversions || 0;

      return {
        id: flow.id,
        name: flow.attributes?.name || 'Unknown',
        status: flow.attributes?.status,
        triggerType: flow.attributes?.trigger_type || 'unknown',
        created: flow.attributes?.created,
        updated: flow.attributes?.updated,
        emailsSent: recipients,
        openRate: recipients > 0 ? opens / recipients : (stats.open_rate || 0),
        clickRate: recipients > 0 ? clicks / recipients : (stats.click_rate || 0),
        unsubscribeRate: recipients > 0 ? unsubs / recipients : (stats.unsubscribe_rate || 0),
        bounceRate: recipients > 0 ? bounces / recipients : (stats.bounce_rate || 0),
        revenue,
        conversions,
        conversionRate: recipients > 0 ? conversions / recipients : (stats.conversion_rate || 0),
        isStale: recipients === 0,
      };
    });

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
