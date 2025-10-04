import React from 'react'

export default function Header() {
  return (
    <header className="hero">
      <div className="brand-row">
        <div className="brand-mark" aria-hidden />
        <div>
          <div className="title">AirWatch Global</div>
          <div className="subtitle">Real-time Air Quality Monitoring powered by NASA TEMPO</div>
        </div>
      </div>

      <div className="search-wrap">
        <input className="search-input" placeholder="Enter city name or zip code..." aria-label="Search city or zip" />
        <button className="search-btn">Search</button>
      </div>
    </header>
  )
}
