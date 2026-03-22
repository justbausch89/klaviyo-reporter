import React, { useState } from 'react';
import './AuditFindings.css';

function FindingCard({ item, category }) {
  const [open, setOpen] = useState(false);
  const colors = {
    win: { bg: 'var(--green-dim)', border: 'var(--green)', emoji: '🟢' },
    issue: { bg: 'var(--red-dim)', border: 'var(--red)', emoji: '🔴' },
    opportunity: { bg: 'var(--yellow-dim)', border: 'var(--yellow)', emoji: '🟡' },
  };
  const style = colors[category];

  return (
    <div
      className={`finding-card ${open ? 'open' : ''}`}
      style={{ '--card-border': style.border, '--card-bg': style.bg }}
    >
      <button className="finding-header" onClick={() => setOpen(!open)}>
        <span className="finding-emoji">{style.emoji}</span>
        <span className="finding-title">{item.title}</span>
        <span className="finding-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="finding-body fade-in">
          {item.detail}
        </div>
      )}
    </div>
  );
}

function Section({ title, items, category, emptyMsg }) {
  return (
    <div className="audit-section">
      <h3 className="audit-section-title">{title} <span className="audit-count">{items.length}</span></h3>
      {items.length === 0 ? (
        <p className="audit-empty">{emptyMsg}</p>
      ) : (
        <div className="finding-list">
          {items.map((item, i) => (
            <FindingCard key={i} item={item} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditFindings({ findings, loading }) {
  if (loading) {
    return (
      <div className="audit-findings">
        {[1, 2, 3].map(i => (
          <div key={i} className="audit-section">
            <div className="skeleton" style={{ height: '16px', width: '140px', marginBottom: '0.75rem' }} />
            {[1, 2].map(j => (
              <div key={j} className="skeleton" style={{ height: '44px', marginBottom: '0.5rem', borderRadius: '8px' }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!findings) return null;

  return (
    <div className="audit-findings fade-in">
      <Section
        title="Wins"
        items={findings.wins}
        category="win"
        emptyMsg="No particular wins identified — review benchmarks after generating audit."
      />
      <Section
        title="Issues"
        items={findings.issues}
        category="issue"
        emptyMsg="No critical issues detected."
      />
      <Section
        title="Opportunities"
        items={findings.opportunities}
        category="opportunity"
        emptyMsg="No specific opportunities identified."
      />
    </div>
  );
}
