import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DateRangeSelector from './components/DateRangeSelector';
import KPICard from './components/KPICard';
import SortableTable from './components/SortableTable';
import DeliverabilityGauge from './components/DeliverabilityGauge';
import AuditFindings from './components/AuditFindings';
import LoadingProgress from './components/LoadingProgress';
import SetupScreen from './components/SetupScreen';
import Section from './components/Section';
import { checkAccount, fetchMetrics, fetchCampaigns, fetchFlows, fetchDeliverability, fetchSegments } from './utils/api';
import { getPresetRange, getPreviousPeriod } from './utils/dates';
import { generateAuditFindings } from './utils/auditEngine';
import './App.css';

const CAMPAIGN_COLS = [
  { key: 'name', label: 'Campaign Name', sortable: true },
  { key: 'sendDate', label: 'Send Date', format: 'date', sortable: true },
  { key: 'emailsSent', label: 'Sent', format: 'number', align: 'right', sortable: true },
  {
    key: 'openRate', label: 'Open Rate', align: 'right', sortable: true,
    render: (v) => <span className={`mono ${v >= 0.35 ? 'rate-good' : v >= 0.2 ? 'rate-warn' : v > 0 ? 'rate-bad' : ''}`}>{v != null ? `${(v * 100).toFixed(1)}%` : '—'}</span>
  },
  {
    key: 'clickRate', label: 'Click Rate', align: 'right', sortable: true,
    render: (v) => <span className={`mono ${v >= 0.015 ? 'rate-good' : v >= 0.008 ? 'rate-warn' : v > 0 ? 'rate-bad' : ''}`}>{v != null ? `${(v * 100).toFixed(1)}%` : '—'}</span>
  },
  {
    key: 'unsubscribeRate', label: 'Unsub Rate', align: 'right', sortable: true,
    render: (v) => <span className={`mono ${v < 0.003 && v > 0 ? 'rate-good' : v < 0.005 ? 'rate-warn' : v > 0 ? 'rate-bad' : ''}`}>{v != null ? `${(v * 100).toFixed(2)}%` : '—'}</span>
  },
  { key: 'revenue', label: 'Revenue', format: 'currency', align: 'right', sortable: true },
  { key: 'conversions', label: 'Conversions', format: 'number', align: 'right', sortable: true },
];

const FLOW_COLS = [
  { key: 'name', label: 'Flow Name', sortable: true },
  { key: 'triggerType', label: 'Trigger', sortable: true },
  { key: 'emailsSent', label: 'Emails Sent', format: 'number', align: 'right', sortable: true },
  {
    key: 'openRate', label: 'Open Rate', align: 'right', sortable: true,
    render: (v) => <span className={`mono ${v >= 0.35 ? 'rate-good' : v >= 0.2 ? 'rate-warn' : v > 0 ? 'rate-bad' : ''}`}>{v != null ? `${(v * 100).toFixed(1)}%` : '—'}</span>
  },
  {
    key: 'clickRate', label: 'Click Rate', align: 'right', sortable: true,
    render: (v) => <span className={`mono ${v >= 0.015 ? 'rate-good' : v >= 0.008 ? 'rate-warn' : v > 0 ? 'rate-bad' : ''}`}>{v != null ? `${(v * 100).toFixed(1)}%` : '—'}</span>
  },
  { key: 'revenue', label: 'Revenue', format: 'currency', align: 'right', sortable: true },
  {
    key: 'isStale', label: 'Status', align: 'right', sortable: true,
    render: (v) => v
      ? <span style={{ color: 'var(--red)', fontSize: '0.72rem', fontWeight: 600 }}>STALE</span>
      : <span style={{ color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 600 }}>ACTIVE</span>
  },
];

const SEGMENT_COLS = [
  { key: 'name', label: 'Segment Name', sortable: true },
  { key: 'profileCount', label: 'Profiles', format: 'number', align: 'right', sortable: true },
  { key: 'updated', label: 'Last Updated', format: 'date', align: 'right', sortable: true },
  {
    key: 'isEmpty', label: 'Status', align: 'right', sortable: false,
    render: (v) => v
      ? <span style={{ color: 'var(--red)', fontSize: '0.72rem', fontWeight: 600 }}>EMPTY</span>
      : <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>OK</span>
  },
];

function fmtN(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

export default function App() {
  const [accountStatus, setAccountStatus] = useState(null); // null=loading, false=not configured, object=ok
  const [setupError, setSetupError] = useState(null);

  const [dateRange, setDateRange] = useState(() => getPresetRange('30d'));
  const [compareEnabled, setCompareEnabled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({});
  const [hasRun, setHasRun] = useState(false);

  const [data, setData] = useState({
    metrics: null,
    campaigns: null,
    flows: null,
    deliverability: null,
    segments: null,
    prevMetrics: null,
  });
  const [errors, setErrors] = useState({});
  const [findings, setFindings] = useState(null);

  // Check API key on mount
  useEffect(() => {
    checkAccount()
      .then((res) => {
        if (res.configured) setAccountStatus(res.account);
        else { setAccountStatus(false); setSetupError(res.error); }
      })
      .catch((err) => {
        setAccountStatus(false);
        setSetupError(err.message);
      });
  }, []);

  const runAudit = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setHasRun(true);
    setProgress({});
    setErrors({});
    setData({ metrics: null, campaigns: null, flows: null, deliverability: null, segments: null, prevMetrics: null });
    setFindings(null);

    const { start, end } = dateRange;
    const prev = compareEnabled ? getPreviousPeriod(start, end) : null;

    const mark = (key, loading = false) =>
      setProgress(p => ({ ...p, [`${key}${loading ? '_loading' : ''}`]: !loading }));

    const safeCall = async (key, fn) => {
      mark(key, true);
      try {
        const result = await fn();
        mark(key);
        return result;
      } catch (err) {
        mark(key);
        setErrors(e => ({ ...e, [key]: err.message }));
        return null;
      }
    };

    // Run all fetches in parallel
    const [metricsRes, campaignsRes, flowsRes, delivRes, segsRes, prevMetricsRes] = await Promise.all([
      safeCall('metrics', () => fetchMetrics(start, end)),
      safeCall('campaigns', () => fetchCampaigns(start, end)),
      safeCall('flows', () => fetchFlows(start, end)),
      safeCall('deliverability', () => fetchDeliverability(start, end)),
      safeCall('segments', () => fetchSegments()),
      prev ? safeCall('prevMetrics', () => fetchMetrics(prev.start, prev.end)) : Promise.resolve(null),
    ]);

    const newData = {
      metrics: metricsRes?.metrics || null,
      campaigns: campaignsRes?.campaigns || null,
      flows: flowsRes?.flows || null,
      deliverability: delivRes?.deliverability || null,
      segments: segsRes?.segments || null,
      prevMetrics: prevMetricsRes?.metrics || null,
    };

    setData(newData);

    // Generate audit findings
    const auditInput = {
      metrics: newData.metrics,
      campaigns: newData.campaigns,
      flows: newData.flows,
      deliverability: newData.deliverability,
      segments: newData.segments,
    };
    setFindings(generateAuditFindings(auditInput));
    setLoading(false);
  }, [loading, dateRange, compareEnabled]);

  function handleExport() {
    const printWin = window.open('', '_blank');
    const styles = Array.from(document.styleSheets)
      .map(s => { try { return Array.from(s.cssRules).map(r => r.cssText).join('\n'); } catch { return ''; } })
      .join('\n');
    printWin.document.write(`<html><head><title>Klaviyo Audit Report</title><style>${styles} body { background: #0f1117; color: #f0f4ff; }</style></head><body>${document.getElementById('audit-report').innerHTML}</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  }

  if (accountStatus === null) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <span>Connecting to Klaviyo...</span>
      </div>
    );
  }

  if (accountStatus === false) {
    return <SetupScreen error={setupError} />;
  }

  const m = data.metrics;
  const pm = data.prevMetrics;

  return (
    <div className="app">
      <Header account={accountStatus} />

      <main className="main" id="audit-report">
        <div className="container">
          {/* Controls */}
          <div className="controls-row">
            <div className="controls-left">
              <h1 className="page-title">Performance Audit</h1>
              <p className="page-subtitle">
                {dateRange.start} → {dateRange.end}
                {compareEnabled && <span className="compare-badge"> · comparing to previous period</span>}
              </p>
            </div>
            <div className="controls-right">
              {hasRun && !loading && (
                <button className="btn btn-secondary" onClick={handleExport}>
                  Export Report
                </button>
              )}
              <button className="btn btn-primary" onClick={runAudit} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Audit'}
              </button>
            </div>
          </div>

          <DateRangeSelector
            startDate={dateRange.start}
            endDate={dateRange.end}
            onDateChange={(s, e) => setDateRange({ start: s, end: e })}
            compareEnabled={compareEnabled}
            onCompareToggle={setCompareEnabled}
          />

          {loading && <LoadingProgress progress={progress} />}

          {hasRun && !loading && (
            <div className="report-content fade-in">
              {/* KPI Cards */}
              <Section title="Key Metrics" subtitle="Attributed email performance" error={errors.metrics}>
                <div className="kpi-grid">
                  <KPICard
                    title="Total Revenue"
                    value={m?.totalRevenue}
                    prevValue={pm?.totalRevenue}
                    format="currency"
                    icon="$"
                    higherIsBetter={true}
                  />
                  <KPICard
                    title="Emails Sent"
                    value={m?.totalEmailsSent}
                    prevValue={pm?.totalEmailsSent}
                    format="number"
                    icon="✉"
                    higherIsBetter={true}
                  />
                  <KPICard
                    title="Avg Open Rate"
                    value={m?.avgOpenRate}
                    prevValue={pm?.avgOpenRate}
                    format="percent"
                    icon="◉"
                    higherIsBetter={true}
                  />
                  <KPICard
                    title="Avg Click Rate"
                    value={m?.avgClickRate}
                    prevValue={pm?.avgClickRate}
                    format="percent"
                    icon="↗"
                    higherIsBetter={true}
                  />
                  <KPICard
                    title="Avg Unsub Rate"
                    value={m?.avgUnsubRate}
                    prevValue={pm?.avgUnsubRate}
                    format="percent"
                    icon="✕"
                    higherIsBetter={false}
                  />
                  <KPICard
                    title="Total Conversions"
                    value={m?.totalConversions}
                    prevValue={pm?.totalConversions}
                    format="number"
                    icon="◆"
                    higherIsBetter={true}
                  />
                  <KPICard
                    title="Revenue per Email"
                    value={m?.revenuePerEmail}
                    prevValue={pm?.revenuePerEmail}
                    format="currency_cents"
                    icon="⊕"
                    higherIsBetter={true}
                  />
                  <KPICard
                    title="Total Opens"
                    value={m?.totalOpens}
                    prevValue={pm?.totalOpens}
                    format="number"
                    icon="◎"
                    higherIsBetter={true}
                  />
                </div>
              </Section>

              {/* Campaigns */}
              <Section
                title="Campaigns"
                subtitle="Email campaigns sorted by revenue"
                badge={data.campaigns ? data.campaigns.length : undefined}
                error={errors.campaigns}
              >
                <SortableTable
                  columns={CAMPAIGN_COLS}
                  rows={data.campaigns || []}
                  defaultSort="revenue"
                  defaultDir="desc"
                  emptyMessage="No sent campaigns found in the selected period."
                />
              </Section>

              {/* Flows */}
              <Section
                title="Flows"
                subtitle="Active automation flows"
                badge={data.flows ? data.flows.length : undefined}
                error={errors.flows}
              >
                <SortableTable
                  columns={FLOW_COLS}
                  rows={data.flows || []}
                  defaultSort="revenue"
                  defaultDir="desc"
                  emptyMessage="No live flows found."
                />
              </Section>

              {/* Deliverability */}
              <Section title="Deliverability & List Health" error={errors.deliverability}>
                {data.deliverability ? (
                  <div className="deliverability-layout">
                    <div className="gauge-col">
                      <div className="gauge-label">Health Score</div>
                      <DeliverabilityGauge score={data.deliverability.deliverabilityScore} />
                    </div>
                    <div className="deliv-stats">
                      <div className="deliv-grid">
                        <div className="deliv-stat">
                          <span className="deliv-label">Total List Size</span>
                          <span className="deliv-value mono">{fmtN(data.deliverability.totalListSize)}</span>
                        </div>
                        <div className="deliv-stat">
                          <span className="deliv-label">Emails Sent</span>
                          <span className="deliv-value mono">{fmtN(data.deliverability.emailsSent)}</span>
                        </div>
                        <div className="deliv-stat">
                          <span className="deliv-label">Bounce Rate</span>
                          <span className={`deliv-value mono ${data.deliverability.bounceRate > 0.02 ? 'bad' : 'good'}`}>
                            {(data.deliverability.bounceRate * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="deliv-stat">
                          <span className="deliv-label">Unsubscribe Rate</span>
                          <span className={`deliv-value mono ${data.deliverability.unsubscribeRate > 0.003 ? 'bad' : 'good'}`}>
                            {(data.deliverability.unsubscribeRate * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="deliv-stat">
                          <span className="deliv-label">Spam Rate</span>
                          <span className={`deliv-value mono ${data.deliverability.spamRate > 0.0008 ? 'bad' : 'good'}`}>
                            {(data.deliverability.spamRate * 100).toFixed(3)}%
                          </span>
                        </div>
                        <div className="deliv-stat">
                          <span className="deliv-label">Spam Complaints</span>
                          <span className="deliv-value mono">{fmtN(data.deliverability.spamCount)}</span>
                        </div>
                        <div className="deliv-stat">
                          <span className="deliv-label">Hard/Soft Bounces</span>
                          <span className="deliv-value mono">{fmtN(data.deliverability.bounceCount)}</span>
                        </div>
                        <div className="deliv-stat">
                          <span className="deliv-label">Unsubscribes</span>
                          <span className="deliv-value mono">{fmtN(data.deliverability.unsubscribeCount)}</span>
                        </div>
                      </div>
                      <div className="benchmark-row">
                        <span className="benchmark-label">Benchmarks:</span>
                        <span className="benchmark-item good">Open &gt;35%</span>
                        <span className="benchmark-item good">Click &gt;1.5%</span>
                        <span className="benchmark-item bad">Bounce &lt;2%</span>
                        <span className="benchmark-item bad">Unsub &lt;0.3%</span>
                        <span className="benchmark-item bad">Spam &lt;0.08%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="no-data">Deliverability data unavailable.</p>
                )}
              </Section>

              {/* Segments */}
              <Section
                title="Segments Overview"
                subtitle="Top 10 segments by profile count"
                badge={data.segments ? data.segments.length : undefined}
                error={errors.segments}
              >
                <SortableTable
                  columns={SEGMENT_COLS}
                  rows={data.segments || []}
                  defaultSort="profileCount"
                  defaultDir="desc"
                  emptyMessage="No segments found."
                />
              </Section>

              {/* Audit Findings */}
              <Section title="Audit Findings" subtitle="AI-powered insights based on your data">
                <AuditFindings findings={findings} />
              </Section>
            </div>
          )}

          {!hasRun && !loading && (
            <div className="empty-state fade-in">
              <div className="empty-icon">◈</div>
              <h2>Ready to audit your Klaviyo account</h2>
              <p>Select a date range and click <strong>Generate Audit</strong> to analyse your campaigns, flows, deliverability, and key metrics.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
