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

    // Fetch all sent email campaigns in the date range
    const campaigns = await paginateAll(client, '/campaigns', {
      'filter': `equals(status,"Sent"),equals(messages.channel,"email"),greater-or-equal(send_time,${startDate}T00:00:00Z),less-or-equal(send_time,${endDate}T23:59:59Z)`,
      'fields[campaign]': 'name,status,send_time,created_at',
    });

    if (campaigns.length === 0) {
      return res.json({ campaigns: [] });
    }

    // Fetch a single bulk report for all campaigns in the period (POST endpoint in v2024)
    let reportResults = [];
    try {
      const reportRes = await client.post('/campaign-values-reports/', {
        data: {
          type: 'campaign-values-report',
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
      console.warn('Campaign values report failed:', err.response?.data?.errors?.[0]?.detail || err.message);
    }

    // Build a lookup map: campaign_id → statistics
    const statsById = {};
    for (const r of reportResults) {
      const cid = r.campaign_id || r.id;
      if (cid) statsById[cid] = r.statistics || r;
    }

    const campaignsWithReports = campaigns.map((campaign) => {
      const stats = statsById[campaign.id] || {};
      const recipients = stats.recipients || stats.unique_recipients || 0;
      const opens = stats.unique_opens || stats.opens || 0;
      const clicks = stats.unique_clicks || stats.clicks || 0;
      const unsubs = stats.unsubscribes || 0;
      const bounces = stats.bounces || 0;
      const revenue = stats.revenue || 0;
      const conversions = stats.conversions || 0;

      return {
        id: campaign.id,
        name: campaign.attributes?.name || 'Unknown',
        status: campaign.attributes?.status,
        sendDate: campaign.attributes?.send_time || campaign.attributes?.created_at,
        emailsSent: recipients,
        recipientCount: recipients,
        openRate: recipients > 0 ? opens / recipients : (stats.open_rate || 0),
        clickRate: recipients > 0 ? clicks / recipients : (stats.click_rate || 0),
        unsubscribeRate: recipients > 0 ? unsubs / recipients : (stats.unsubscribe_rate || 0),
        bounceRate: recipients > 0 ? bounces / recipients : (stats.bounce_rate || 0),
        revenue,
        conversions,
        conversionRate: recipients > 0 ? conversions / recipients : (stats.conversion_rate || 0),
      };
    });

    // Sort by revenue descending by default
    campaignsWithReports.sort((a, b) => b.revenue - a.revenue);

    res.json({ campaigns: campaignsWithReports });
  } catch (err) {
    console.error('Campaigns error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.errors?.[0]?.detail || err.message,
    });
  }
});

module.exports = router;
