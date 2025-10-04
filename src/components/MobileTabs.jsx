import React from 'react'

export default function MobileTabs() {
  return (
    <nav className="mobile-tabs" aria-label="Mobile navigation">
      <a href="#aqi">Air Quality Index</a>
      <a href="#rankings">City Rankings</a>
      <a href="#wildfires">Wildfire Updates</a>
      <a href="#sources">Data Sources</a>
    </nav>
  )
}
