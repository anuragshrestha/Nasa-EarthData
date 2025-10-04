import React from 'react'

export default function WildfireUpdates() {
  return (
    <section id="wildfires" className="section">
      <div className="panel">
        <h3>Wildfire Updates</h3>
        <div className="fire-list">
          <div className="fire-item">
            <h4>California Wildfire Affects Air Quality Across Western States</h4>
            <div className="muted">California, USA • <span className="badge bad">High</span></div>
          </div>
          <div className="fire-item">
            <h4>Australian Bushfires Create Smoke Plumes Visible from Space</h4>
            <div className="muted">New South Wales, Australia • <span className="badge warn">Extreme</span></div>
          </div>
          <div className="fire-item">
            <h4>Canada Forest Fires Impact Air Quality in Northern US</h4>
            <div className="muted">British Columbia, Canada • <span className="badge">Moderate</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
