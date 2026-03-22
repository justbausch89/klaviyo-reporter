import React from 'react';
import './SetupScreen.css';

export default function SetupScreen({ error }) {
  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-icon">⚙</div>
        <h1 className="setup-title">Setup Required</h1>
        <p className="setup-desc">
          To use the Klaviyo Audit Dashboard, you need to add your Klaviyo Private API Key to the server configuration.
        </p>
        {error && (
          <div className="setup-error">
            <strong>Error:</strong> {error}
          </div>
        )}
        <div className="setup-steps">
          <div className="setup-step">
            <span className="step-num">1</span>
            <div>
              <strong>Create a <code>.env</code> file</strong> in the <code>/server</code> directory:
              <pre className="code-block">{`cd server\ncp .env.example .env`}</pre>
            </div>
          </div>
          <div className="setup-step">
            <span className="step-num">2</span>
            <div>
              <strong>Add your Klaviyo Private API Key:</strong>
              <pre className="code-block">{`KLAVIYO_PRIVATE_KEY=pk_your_key_here`}</pre>
            </div>
          </div>
          <div className="setup-step">
            <span className="step-num">3</span>
            <div>
              <strong>Restart the server</strong> and refresh this page.
            </div>
          </div>
        </div>
        <div className="setup-note">
          <strong>Required API Key Permissions</strong>
          <ul>
            <li>Campaigns — Read</li>
            <li>Flows — Read</li>
            <li>Metrics — Read</li>
            <li>Profiles — Read</li>
            <li>Lists — Read</li>
            <li>Segments — Read</li>
          </ul>
        </div>
        <button className="setup-retry" onClick={() => window.location.reload()}>
          Retry Connection
        </button>
      </div>
    </div>
  );
}
