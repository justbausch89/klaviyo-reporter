const express = require('express');
const router = express.Router();
const { createClient } = require('../klaviyoClient');

router.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;
  const apiKey = process.env.KLAVIYO_PRIVATE_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'KLAVIYO_PRIVATE_KEY not configured' });
  }

  try {
    const client = createClient(apiKey);

    // Fetch all metrics list
    const metricsRes = await client.get('/metrics', { params: { 'page[size]': 100 } });
    const allMetrics = metricsRes.data?.data || [];

    const findMetric = (name) =>
      allMetrics.find((m) =>
        m.attributes?.name?.toLowerCase().includes(name.toLowerCase())
      );

    const sentMetric = findMetric('Received Email') || findMetric('Sent Email');
    const openMetric = findMetric('Opened Email');
    const clickMetric = findMetric('Clicked Email');
    const unsubMetric = findMetric('Unsubscribed');
    const orderMetric = findMetric('Placed Order');
    const bounceMetric = findMetric('Bounced Email');

    async function queryMetricAggregate(metricId, measurement = 'count') {
      if (!metricId) return { count: 0, sum: 0 };
      try {
        const r = await client.post('/metric-aggregates/', {
          data: {
            type: 'metric-aggregate',
            attributes: {
              metric_id: metricId,
              measurements: [measurement],
              interval: 'month',
              filter: `greater-or-equal(datetime,${startDate}T00:00:00Z),less-or-equal(datetime,${endDate}T23:59:59Z)`,
              timezone: 'UTC',
            },
          },
        });
        const results = r.data?.data?.attributes?.data || [];
        const total = results.reduce(
          (sum, d) => sum + (d.measurements?.[measurement]?.[0] || 0),
          0
        );
        return { [measurement]: total };
      } catch (err) {
        console.error(`[metrics] queryMetricAggregate(${metricId}) error:`, JSON.stringify(err.response?.data || err.message));
        return { [measurement]: 0 };
      }
    }

    async function queryRevenue(metricId) {
      if (!metricId) return 0;
      try {
        const r = await client.post('/metric-aggregates/', {
          data: {
            type: 'metric-aggregate',
            attributes: {
              metric_id: metricId,
              measurements: ['sum'],
              interval: 'month',
              filter: `greater-or-equal(datetime,${startDate}T00:00:00Z),less-or-equal(datetime,${endDate}T23:59:59Z)`,
              by: ['$attributed_message'],
              timezone: 'UTC',
            },
          },
        });
        const results = r.data?.data?.attributes?.data || [];
        return results.reduce((sum, d) => sum + (d.measurements?.sum?.[0] || 0), 0);
      } catch (err) {
        console.error(`[metrics] queryRevenue(${metricId}) with by[] error:`, JSON.stringify(err.response?.data || err.message));
        try {
          const r2 = await client.post('/metric-aggregates/', {
            data: {
              type: 'metric-aggregate',
              attributes: {
                metric_id: metricId,
                measurements: ['sum'],
                interval: 'month',
                filter: `greater-or-equal(datetime,${startDate}T00:00:00Z),less-or-equal(datetime,${endDate}T23:59:59Z)`,
                timezone: 'UTC',
              },
            },
          });
          const results2 = r2.data?.data?.attributes?.data || [];
          return results2.reduce((sum, d) => sum + (d.measurements?.sum?.[0] || 0), 0);
        } catch (err2) {
          console.error(`[metrics] queryRevenue(${metricId}) fallback error:`, JSON.stringify(err2.response?.data || err2.message));
          return 0;
        }
      }
    }

    const [sentData, openData, clickData, unsubData, conversionsData, revenueTotal] =
      await Promise.all([
        queryMetricAggregate(sentMetric?.id, 'count'),
        queryMetricAggregate(openMetric?.id, 'count'),
        queryMetricAggregate(clickMetric?.id, 'count'),
        queryMetricAggregate(unsubMetric?.id, 'count'),
        queryMetricAggregate(orderMetric?.id, 'count'),
        queryRevenue(orderMetric?.id),
      ]);

    const emailsSent = sentData.count || 0;
    const opens = openData.count || 0;
    const clicks = clickData.count || 0;
    const unsubs = unsubData.count || 0;
    const conversions = conversionsData.count || 0;

    const avgOpenRate = emailsSent > 0 ? opens / emailsSent : 0;
    const avgClickRate = emailsSent > 0 ? clicks / emailsSent : 0;
    const avgUnsubRate = emailsSent > 0 ? unsubs / emailsSent : 0;
    const revenuePerEmail = emailsSent > 0 ? revenueTotal / emailsSent : 0;

    res.json({
      metrics: {
        totalRevenue: revenueTotal,
        totalEmailsSent: emailsSent,
        totalOpens: opens,
        totalClicks: clicks,
        totalUnsubs: unsubs,
        totalConversions: conversions,
        avgOpenRate,
        avgClickRate,
        avgUnsubRate,
        revenuePerEmail,
      },
    });
  } catch (err) {
    console.error('Metrics error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.errors?.[0]?.detail || err.message,
    });
  }
});

module.exports = router;
