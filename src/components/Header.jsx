import React from 'react'

export default function Header() {
  return (
    <header className="hero">
      <div className="search-wrap">
        <input className="search-input" placeholder="Enter city name or zip code" aria-label="Search city or zip" />
        <button className="search-btn">Search</button>
      </div>
    </header>
  )
}
