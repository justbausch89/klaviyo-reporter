import React from 'react';
import './LoadingProgress.css';

const STEPS = [
  { key: 'metrics', label: 'Fetching key metrics...' },
  { key: 'campaigns', label: 'Analysing campaigns...' },
  { key: 'flows', label: 'Analysing flows...' },
  { key: 'deliverability', label: 'Calculating deliverability...' },
  { key: 'segments', label: 'Loading segments...' },
];

export default function LoadingProgress({ progress }) {
  const completedCount = Object.values(progress).filter(Boolean).length;
  const pct = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="loading-progress">
      <div className="progress-header">
        <span className="progress-label">Generating Audit Report</span>
        <span className="progress-pct mono">{pct}%</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-steps">
        {STEPS.map((step) => (
          <div key={step.key} className={`progress-step ${progress[step.key] ? 'done' : progress[`${step.key}_loading`] ? 'active' : ''}`}>
            <span className="step-icon">
              {progress[step.key] ? '✓' : progress[`${step.key}_loading`] ? '◌' : '○'}
            </span>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
