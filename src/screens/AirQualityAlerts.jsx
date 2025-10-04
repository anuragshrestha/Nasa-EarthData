import React from 'react'

export default function AirQualityAlerts() {
  return (
    <section id="alerts" className="section">
      <div className="panel alerts">
        <h3>
          <span className="emoji-icon" role="img" aria-label="Alert">🔔</span>
          Air Quality Alerts
        </h3>
        <div className="field" style={{display:'grid', gap:8, marginBottom:10}}>
          <input className="input" placeholder="Enter email address" />
        </div>
        <div className="field" style={{display:'grid', gap:8, marginBottom:10}}>
          <label className="muted" htmlFor="threshold">Alert when AQI exceeds:</label>
          <input id="threshold" className="input" defaultValue="100" />
        </div>
        <button className="btn">
          <svg
            className="icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            <path d="m22 6-10 7L2 6" />
          </svg>
          Set Alert
        </button>
      </div>
    </section>
  )
}
