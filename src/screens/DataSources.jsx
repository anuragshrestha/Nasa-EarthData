import React from 'react'

export default function DataSources() {
  return (
    <section id="sources" className="section">
      <div className="panel">
        <h3>Data Sources</h3>
        <ul className="source-list">
          <li className="source-item"><span className="dot" /> NASA TEMPO Satellite</li>
          <li className="source-item"><span className="dot" /> Ground-based Sensors</li>
          <li className="source-item"><span className="dot" /> OpenAQ Network</li>
          <li className="source-item"><span className="dot" /> Sentinel-5P (TROPOMI)</li>
          <li className="source-item"><span className="dot" /> NOAA Smoke & Fire Data</li>
        </ul>
      </div>
    </section>
  )
}
