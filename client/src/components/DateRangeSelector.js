import React, { useState } from 'react';
import { getPresetRange } from '../utils/dates';
import './DateRangeSelector.css';

const PRESETS = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 14 Days', value: '14d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
];

export default function DateRangeSelector({ startDate, endDate, onDateChange, compareEnabled, onCompareToggle }) {
  const [activePreset, setActivePreset] = useState('30d');

  function handlePreset(preset) {
    setActivePreset(preset);
    const range = getPresetRange(preset);
    onDateChange(range.start, range.end);
  }

  function handleStartChange(e) {
    setActivePreset(null);
    onDateChange(e.target.value, endDate);
  }

  function handleEndChange(e) {
    setActivePreset(null);
    onDateChange(startDate, e.target.value);
  }

  return (
    <div className="date-selector">
      <div className="date-selector-top">
        <div className="preset-buttons">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              className={`preset-btn ${activePreset === p.value ? 'active' : ''}`}
              onClick={() => handlePreset(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="custom-range">
          <div className="date-input-group">
            <label>From</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartChange}
              className="date-input"
            />
          </div>
          <span className="date-sep">→</span>
          <div className="date-input-group">
            <label>To</label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndChange}
              className="date-input"
            />
          </div>
        </div>
      </div>
      <div className="compare-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={compareEnabled}
            onChange={(e) => onCompareToggle(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-switch" />
          <span className="toggle-text">Compare to previous period</span>
        </label>
      </div>
    </div>
  );
}
