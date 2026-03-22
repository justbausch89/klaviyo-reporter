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

    // Fetch all sent campaigns
    const campaigns = await paginateAll(client, '/campaigns', {
      'filter': `equals(messages.channel,'email'),greater-or-equal(created_at,${startDate}T00:00:00Z),less-or-equal(created_at,${endDate}T23:59:59Z)`,
      'fields[campaign]': 'name,status,created_at,send_time,audiences',
      'fields[campaign-message]': 'label,channel,content',
      'include': 'campaign-messages',
    });

    // Filter to sent campaigns
    const sentCampaigns = campaigns.filter(c => c.attributes?.status === 'Sent');

    // Fetch reports for each campaign in parallel (batched to avoid rate limits)
    const batchSize = 5;
    const campaignsWithReports = [];

    for (let i = 0; i < sentCampaigns.length; i += batchSize) {
      const batch = sentCampaigns.slice(i, i + batchSize);
      const reports = await Promise.all(
        batch.map(async (campaign) => {
          try {
            const reportRes = await client.get(`/campaign-values-reports/`, {
              params: {
                'filter': `equals(campaign_id,"${campaign.id}")`,
                'statistics': 'opens,clicks,unsubscribes,bounces,revenue,conversions,recipients',
                'conversion_metric_id': undefined,
              },
            });
            const stats = reportRes.data?.data?.attributes?.results?.[0] || {};
            return {
              id: campaign.id,
              name: campaign.attributes?.name || 'Unknown',
              status: campaign.attributes?.status,
              sendDate: campaign.attributes?.send_time || campaign.attributes?.created_at,
              recipientCount: stats.statistics?.recipients || 0,
              openRate: stats.statistics?.open_rate || 0,
              clickRate: stats.statistics?.click_rate || 0,
              unsubscribeRate: stats.statistics?.unsubscribe_rate || 0,
              bounceRate: stats.statistics?.bounce_rate || 0,
              revenue: stats.statistics?.revenue || 0,
              conversions: stats.statistics?.conversions || 0,
              conversionRate: stats.statistics?.conversion_rate || 0,
              emailsSent: stats.statistics?.recipients || 0,
            };
          } catch (err) {
            return {
              id: campaign.id,
              name: campaign.attributes?.name || 'Unknown',
              status: campaign.attributes?.status,
              sendDate: campaign.attributes?.send_time || campaign.attributes?.created_at,
              recipientCount: 0,
              openRate: 0,
              clickRate: 0,
              unsubscribeRate: 0,
              bounceRate: 0,
              revenue: 0,
              conversions: 0,
              conversionRate: 0,
              emailsSent: 0,
              error: 'Report unavailable',
            };
          }
        })
      );
      campaignsWithReports.push(...reports);
    }

    // Sort by revenue descending
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
