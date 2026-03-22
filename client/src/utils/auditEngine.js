// Industry benchmarks
const BENCHMARKS = {
  openRate: 0.35,        // 35%
  clickRate: 0.015,      // 1.5%
  unsubscribeRate: 0.003,// 0.3%
  bounceRate: 0.02,      // 2%
  spamRate: 0.0008,      // 0.08%
};

const FLOW_NAMES = {
  abandoned_cart: ['abandoned cart', 'cart abandonment', 'cart recovery'],
  browse_abandonment: ['browse abandonment', 'browse abandon'],
  welcome: ['welcome series', 'welcome flow', 'welcome email'],
  winback: ['win back', 'winback', 're-engagement', 'sunset'],
  post_purchase: ['post purchase', 'post-purchase', 'thank you', 'order follow'],
};

export function generateAuditFindings({ metrics, campaigns, flows, deliverability, segments }) {
  const wins = [];
  const issues = [];
  const opportunities = [];

  if (!metrics && !campaigns && !flows && !deliverability) {
    return { wins, issues, opportunities };
  }

  // --- METRICS ANALYSIS ---
  if (metrics) {
    if (metrics.avgOpenRate >= BENCHMARKS.openRate) {
      wins.push({
        title: `Strong Open Rate: ${fmtPct(metrics.avgOpenRate)}`,
        detail: `Your average open rate of ${fmtPct(metrics.avgOpenRate)} exceeds the ${fmtPct(BENCHMARKS.openRate)} Klaviyo benchmark, indicating strong subject line performance and engaged subscribers.`,
      });
    } else if (metrics.avgOpenRate > 0) {
      issues.push({
        title: `Below-Benchmark Open Rate: ${fmtPct(metrics.avgOpenRate)}`,
        detail: `Your average open rate of ${fmtPct(metrics.avgOpenRate)} is below the ${fmtPct(BENCHMARKS.openRate)} benchmark. Consider A/B testing subject lines, improving send-time optimisation, and cleaning inactive subscribers.`,
      });
    }

    if (metrics.avgClickRate >= BENCHMARKS.clickRate) {
      wins.push({
        title: `Good Click-Through Rate: ${fmtPct(metrics.avgClickRate)}`,
        detail: `A click rate of ${fmtPct(metrics.avgClickRate)} exceeds the ${fmtPct(BENCHMARKS.clickRate)} benchmark, showing strong content relevance and CTA effectiveness.`,
      });
    } else if (metrics.avgClickRate > 0) {
      issues.push({
        title: `Low Click-Through Rate: ${fmtPct(metrics.avgClickRate)}`,
        detail: `Your click rate of ${fmtPct(metrics.avgClickRate)} is below the ${fmtPct(BENCHMARKS.clickRate)} benchmark. Test more prominent CTAs, personalised product recommendations, and cleaner email layouts.`,
      });
    }

    if (metrics.avgUnsubRate > BENCHMARKS.unsubscribeRate) {
      issues.push({
        title: `High Unsubscribe Rate: ${fmtPct(metrics.avgUnsubRate)}`,
        detail: `An unsubscribe rate of ${fmtPct(metrics.avgUnsubRate)} exceeds the ${fmtPct(BENCHMARKS.unsubscribeRate)} acceptable threshold. Review send frequency, audience targeting, and content relevance.`,
      });
    }

    if (metrics.totalRevenue > 0) {
      wins.push({
        title: `Email Revenue Attributed: ${fmtCurrency(metrics.totalRevenue)}`,
        detail: `Your email programme generated ${fmtCurrency(metrics.totalRevenue)} in attributed revenue this period, at ${fmtCurrency(metrics.revenuePerEmail)} per email sent.`,
      });
    }
  }

  // --- CAMPAIGN ANALYSIS ---
  if (campaigns && campaigns.length > 0) {
    const topByRevenue = campaigns.filter(c => c.revenue > 0);
    if (topByRevenue.length > 0) {
      const top = topByRevenue[0];
      wins.push({
        title: `Top Campaign: "${top.name}" — ${fmtCurrency(top.revenue)}`,
        detail: `Best-performing campaign by revenue with a ${fmtPct(top.openRate)} open rate and ${fmtPct(top.clickRate)} click rate.`,
      });
    }

    const zeroRevenue = campaigns.filter(c => c.revenue === 0 && c.emailsSent > 0);
    if (zeroRevenue.length > 0) {
      issues.push({
        title: `${zeroRevenue.length} Campaign${zeroRevenue.length > 1 ? 's' : ''} With Zero Revenue`,
        detail: `Campaigns: ${zeroRevenue.slice(0, 3).map(c => `"${c.name}"`).join(', ')}${zeroRevenue.length > 3 ? ` +${zeroRevenue.length - 3} more` : ''}. Ensure revenue tracking is configured and review call-to-action effectiveness.`,
      });
    }

    const lowOpen = campaigns.filter(c => c.openRate > 0 && c.openRate < BENCHMARKS.openRate);
    if (lowOpen.length > 0) {
      issues.push({
        title: `${lowOpen.length} Campaign${lowOpen.length > 1 ? 's' : ''} With Below-Benchmark Open Rates`,
        detail: `These campaigns underperformed on opens: ${lowOpen.slice(0, 3).map(c => `"${c.name}" (${fmtPct(c.openRate)})`).join(', ')}${lowOpen.length > 3 ? ` +${lowOpen.length - 3} more` : ''}.`,
      });
    }

    const noABTest = campaigns.every(c => !c.name?.toLowerCase().includes('a/b') && !c.name?.toLowerCase().includes('test'));
    if (noABTest) {
      opportunities.push({
        title: 'No A/B Testing Detected in Campaigns',
        detail: 'No A/B test campaigns were found in this period. Running subject line and content tests can improve open rates by 10–30%. Consider testing at least 1–2 elements per major send.',
      });
    }
  } else if (campaigns && campaigns.length === 0) {
    opportunities.push({
      title: 'No Campaigns Sent in This Period',
      detail: 'No email campaigns were sent during the selected date range. Regular campaigns are important for revenue and list engagement.',
    });
  }

  // --- FLOW ANALYSIS ---
  if (flows) {
    const activeFlows = flows.filter(f => !f.isStale);
    const staleFlows = flows.filter(f => f.isStale);

    if (activeFlows.length > 0) {
      const topFlow = [...activeFlows].sort((a, b) => b.revenue - a.revenue)[0];
      if (topFlow.revenue > 0) {
        wins.push({
          title: `Top Flow: "${topFlow.name}" — ${fmtCurrency(topFlow.revenue)}`,
          detail: `Best-performing flow generating ${fmtCurrency(topFlow.revenue)} in attributed revenue with a ${fmtPct(topFlow.openRate)} open rate.`,
        });
      }
    }

    if (staleFlows.length > 0) {
      issues.push({
        title: `${staleFlows.length} Stale Flow${staleFlows.length > 1 ? 's' : ''} With No Activity`,
        detail: `These flows had zero emails sent in the period: ${staleFlows.slice(0, 3).map(f => `"${f.name}"`).join(', ')}${staleFlows.length > 3 ? ` +${staleFlows.length - 3} more` : ''}. Check triggers, segment conditions, and flow status.`,
      });
    }

    // Check for missing essential flows
    const flowNames = flows.map(f => f.name?.toLowerCase() || '');
    const missingFlows = [];

    if (!flowNames.some(n => FLOW_NAMES.abandoned_cart.some(k => n.includes(k)))) {
      missingFlows.push('Abandoned Cart');
    }
    if (!flowNames.some(n => FLOW_NAMES.browse_abandonment.some(k => n.includes(k)))) {
      missingFlows.push('Browse Abandonment');
    }
    if (!flowNames.some(n => FLOW_NAMES.welcome.some(k => n.includes(k)))) {
      missingFlows.push('Welcome Series');
    }
    if (!flowNames.some(n => FLOW_NAMES.winback.some(k => n.includes(k)))) {
      missingFlows.push('Win-Back / Re-engagement');
    }
    if (!flowNames.some(n => FLOW_NAMES.post_purchase.some(k => n.includes(k)))) {
      missingFlows.push('Post-Purchase');
    }

    if (missingFlows.length > 0) {
      opportunities.push({
        title: `Missing High-Value Flows: ${missingFlows.join(', ')}`,
        detail: `These essential automation flows are not detected: ${missingFlows.join(', ')}. Abandoned Cart alone can recover 5–15% of lost revenue. Setting these up is typically the highest-ROI email marketing activity.`,
      });
    }
  }

  // --- DELIVERABILITY ANALYSIS ---
  if (deliverability) {
    if (deliverability.deliverabilityScore >= 80) {
      wins.push({
        title: `Healthy Deliverability Score: ${deliverability.deliverabilityScore}/100`,
        detail: `Your deliverability metrics are in good shape. Bounce rate: ${fmtPct(deliverability.bounceRate)}, unsubscribe rate: ${fmtPct(deliverability.unsubscribeRate)}, spam rate: ${fmtPct(deliverability.spamRate)}.`,
      });
    } else if (deliverability.deliverabilityScore < 60) {
      issues.push({
        title: `Low Deliverability Score: ${deliverability.deliverabilityScore}/100`,
        detail: `Your deliverability health needs attention. ${deliverability.bounceRate > BENCHMARKS.bounceRate ? `Bounce rate ${fmtPct(deliverability.bounceRate)} exceeds ${fmtPct(BENCHMARKS.bounceRate)} threshold. ` : ''}${deliverability.spamRate > BENCHMARKS.spamRate ? `Spam rate ${fmtPct(deliverability.spamRate)} exceeds ${fmtPct(BENCHMARKS.spamRate)} threshold.` : ''}`,
      });
    }

    if (deliverability.bounceRate > BENCHMARKS.bounceRate) {
      issues.push({
        title: `High Bounce Rate: ${fmtPct(deliverability.bounceRate)}`,
        detail: `A bounce rate of ${fmtPct(deliverability.bounceRate)} exceeds the ${fmtPct(BENCHMARKS.bounceRate)} threshold. Implement a regular list cleaning process and consider a sunset flow for disengaged subscribers.`,
      });
    }

    if (deliverability.spamRate > BENCHMARKS.spamRate) {
      issues.push({
        title: `Elevated Spam Complaint Rate: ${fmtPct(deliverability.spamRate)}`,
        detail: `A spam rate of ${fmtPct(deliverability.spamRate)} (threshold: ${fmtPct(BENCHMARKS.spamRate)}) puts inbox placement at risk. Review list acquisition methods and ensure clear unsubscribe options.`,
      });
    }
  }

  // --- SEGMENTS ANALYSIS ---
  if (segments && segments.length > 0) {
    const emptySegments = segments.filter(s => s.isEmpty);
    if (emptySegments.length > 0) {
      issues.push({
        title: `${emptySegments.length} Empty Segment${emptySegments.length > 1 ? 's' : ''}`,
        detail: `Segments with 0 profiles: ${emptySegments.map(s => `"${s.name}"`).join(', ')}. These may be misconfigured or based on outdated criteria.`,
      });
    }
  }

  if (opportunities.length === 0) {
    opportunities.push({
      title: 'Review Send Frequency to Engaged Segments',
      detail: 'Ensure you are sending targeted campaigns to engaged subscriber segments rather than your full list. Segmented sends typically achieve 14–26% higher open rates.',
    });
  }

  return { wins, issues, opportunities };
}

function fmtPct(val) {
  if (val == null) return '0%';
  return `${(val * 100).toFixed(1)}%`;
}

function fmtCurrency(val) {
  if (val == null) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}
