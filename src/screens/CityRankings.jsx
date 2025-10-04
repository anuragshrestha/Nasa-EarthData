import React from 'react'

export default function CityRankings() {
  return (
    <section id="rankings" className="section">
      <div className="panel">
        <h3>City Rankings</h3>

        <div className="toggle">
          <button className="active">Most Polluted</button>
          <button>Cleanest</button>
        </div>

        <div className="rank-list">
          <div className="rank-item">
            <div>
              <div>Delhi, India</div>
              <div className="muted">Hazardous</div>
            </div>
            <span className="aq-pill">AQI 267</span>
          </div>
          <div className="rank-item">
            <div>
              <div>Beijing, China</div>
              <div className="muted">Unhealthy</div>
            </div>
            <span className="aq-pill">AQI 198</span>
          </div>
          <div className="rank-item">
            <div>
              <div>Lahore, Pakistan</div>
              <div className="muted">Unhealthy</div>
            </div>
            <span className="aq-pill">AQI 189</span>
          </div>
        </div>
      </div>
    </section>
  )
}
