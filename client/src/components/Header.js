import React from 'react';
import './Header.css';

export default function Header({ account }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">Klaviyo Audit</span>
        </div>
        {account && (
          <div className="account-badge">
            <span className="account-dot" />
            {account.name}
          </div>
        )}
      </div>
      <div className="header-right">
        <span className="header-tag">Performance Dashboard</span>
      </div>
    </header>
  );
}
