import React from 'react'

export default function AirQualityIndex() {
  return (
    <section id="aqi" className="section">
      <div className="panel">
        <h3>Air Quality Index</h3>

        <div className="aqi-wrap">
          <div className="aqi-gauge" role="img" aria-label="AQI gauge">
            <div className="aqi-gauge-inner">
              <div style={{textAlign:'center'}}>
                <div className="aqi-value">153</div>
                <div className="aqi-label muted">Unhealthy</div>
              </div>
            </div>
          </div>

          <div>
            <div className="muted">Sample city overview (static)</div>
            <div className="chips">
              <span className="chip">PM2.5: 78 µg/m³</span>
              <span className="chip">PM10: 120 µg/m³</span>
              <span className="chip">O3: 42 ppb</span>
              <span className="chip">NO2: 29 ppb</span>
            </div>

            <div style={{marginTop:16}}>
              <label className="muted" htmlFor="aqi-alert">Alert when AQI exceeds:</label>
              <div style={{display:'grid', gridTemplateColumns:'1fr auto', gap:10, marginTop:8}}>
                <input id="aqi-alert" className="input" defaultValue="100" />
                <button className="btn">Set Alert</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
