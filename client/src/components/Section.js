import React, { useState } from 'react';
import './Section.css';

export default function Section({ title, subtitle, children, collapsible = false, defaultOpen = true, badge, error }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="section">
      <div className={`section-header ${collapsible ? 'clickable' : ''}`} onClick={() => collapsible && setOpen(o => !o)}>
        <div className="section-header-left">
          <h2 className="section-title">{title}</h2>
          {subtitle && <span className="section-subtitle">{subtitle}</span>}
          {badge != null && <span className="section-badge">{badge}</span>}
        </div>
        {collapsible && (
          <button className="section-toggle">{open ? '▲' : '▼'}</button>
        )}
      </div>
      {error && (
        <div className="section-error">
          <span className="error-icon">⚠</span> {error}
        </div>
      )}
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}
