import React from 'react';
import './DeliverabilityGauge.css';

function getScoreColor(score) {
  if (score >= 80) return '#2DB57D';
  if (score >= 60) return '#f5c542';
  return '#ff4d4d';
}

function getScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 35) return 'Poor';
  return 'Critical';
}

export default function DeliverabilityGauge({ score, loading }) {
  if (loading) {
    return (
      <div className="gauge-container">
        <div className="skeleton" style={{ width: '140px', height: '140px', borderRadius: '50%', margin: '0 auto' }} />
      </div>
    );
  }

  const safeScore = score ?? 0;
  const color = getScoreColor(safeScore);
  const label = getScoreLabel(safeScore);

  // SVG gauge arc
  const radius = 60;
  const circumference = Math.PI * radius; // half circle
  const dashOffset = circumference * (1 - safeScore / 100);

  return (
    <div className="gauge-container fade-in">
      <svg viewBox="0 0 160 90" className="gauge-svg">
        {/* Background arc */}
        <path
          d="M 10 80 A 70 70 0 0 1 150 80"
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 10 80 A 70 70 0 0 1 150 80"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
        />
        {/* Score text */}
        <text x="80" y="72" textAnchor="middle" fill="white" fontSize="26" fontWeight="600" fontFamily="'JetBrains Mono', monospace">
          {safeScore}
        </text>
        <text x="80" y="86" textAnchor="middle" fill={color} fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif" letterSpacing="1">
          {label.toUpperCase()}
        </text>
      </svg>
      <div className="gauge-scale">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}
