import React from 'react';
import { calcDelta } from '../utils/dates';
import './KPICard.css';

function formatValue(value, format) {
  if (value == null || value === undefined) return '—';
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'currency_cents':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'number':
      return new Intl.NumberFormat('en-US').format(Math.round(value));
    default:
      return String(value);
  }
}

export default function KPICard({ title, value, prevValue, format, icon, loading, higherIsBetter = true }) {
  if (loading) {
    return (
      <div className="kpi-card loading">
        <div className="skeleton" style={{ height: '12px', width: '60%', marginBottom: '0.75rem' }} />
        <div className="skeleton" style={{ height: '32px', width: '80%', marginBottom: '0.5rem' }} />
        <div className="skeleton" style={{ height: '12px', width: '40%' }} />
      </div>
    );
  }

  const delta = prevValue != null ? calcDelta(value, prevValue) : null;
  const isPositive = delta != null ? (higherIsBetter ? delta >= 0 : delta <= 0) : null;

  return (
    <div className="kpi-card fade-in">
      <div className="kpi-header">
        {icon && <span className="kpi-icon">{icon}</span>}
        <span className="kpi-title">{title}</span>
      </div>
      <div className="kpi-value mono">{formatValue(value, format)}</div>
      <div className="kpi-footer">
        {delta != null ? (
          <span className={`kpi-delta ${isPositive ? 'positive' : 'negative'}`}>
            <span className="delta-arrow">{delta >= 0 ? '↑' : '↓'}</span>
            {Math.abs(delta).toFixed(1)}%
            <span className="delta-label">vs prev period</span>
          </span>
        ) : prevValue != null ? (
          <span className="kpi-prev mono">prev: {formatValue(prevValue, format)}</span>
        ) : null}
      </div>
    </div>
  );
}
