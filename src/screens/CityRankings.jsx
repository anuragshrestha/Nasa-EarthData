import React, { useMemo, useState } from 'react'

const WORST_US_RANKINGS = [
  { id: 'los-angeles', name: 'Los Angeles, CA', aqi: 178, category: { label: 'Unhealthy', band: 'unhealthy' }, dominant: 'PM2.5', source: 'EPA AirNow' },
  { id: 'houston', name: 'Houston, TX', aqi: 162, category: { label: 'Unhealthy', band: 'unhealthy' }, dominant: 'PM10', source: 'EPA AirNow' },
  { id: 'phoenix', name: 'Phoenix, AZ', aqi: 148, category: { label: 'Unhealthy for SG', band: 'usg' }, dominant: 'O3', source: 'EPA AirNow' },
  { id: 'chicago', name: 'Chicago, IL', aqi: 131, category: { label: 'Unhealthy for SG', band: 'usg' }, dominant: 'PM2.5', source: 'EPA AirNow' },
  { id: 'denver', name: 'Denver, CO', aqi: 118, category: { label: 'Unhealthy for SG', band: 'usg' }, dominant: 'O3', source: 'EPA AirNow' },
]

const BEST_US_RANKINGS = [
  { id: 'seattle', name: 'Seattle, WA', aqi: 31, category: { label: 'Good', band: 'good' }, dominant: 'PM2.5', source: 'EPA AirNow' },
  { id: 'portland', name: 'Portland, OR', aqi: 36, category: { label: 'Good', band: 'good' }, dominant: 'PM2.5', source: 'EPA AirNow' },
  { id: 'miami', name: 'Miami, FL', aqi: 42, category: { label: 'Good', band: 'good' }, dominant: 'O3', source: 'EPA AirNow' },
  { id: 'minneapolis', name: 'Minneapolis, MN', aqi: 47, category: { label: 'Good', band: 'good' }, dominant: 'PM2.5', source: 'EPA AirNow' },
  { id: 'boston', name: 'Boston, MA', aqi: 55, category: { label: 'Moderate', band: 'moderate' }, dominant: 'O3', source: 'EPA AirNow' },
]

function pillClass(band) {
  switch (band) {
    case 'good':
      return 'aq-pill good'
    case 'moderate':
      return 'aq-pill moderate'
    case 'usg':
      return 'aq-pill usg'
    case 'unhealthy':
      return 'aq-pill unhealthy'
    case 'very-unhealthy':
      return 'aq-pill very-unhealthy'
    case 'hazardous':
      return 'aq-pill hazardous'
    default:
      return 'aq-pill'
  }
}

function RankingList({ items, emptyText }) {
  if (!items?.length) {
    return <div className="muted" style={{ padding: '12px 0' }}>{emptyText}</div>
  }
  return (
    <div className="rank-list">
      {items.map((city) => (
        <div key={city.id} className="rank-item">
          <div>
            <div>{city.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {city.category?.label || 'Unknown'}
              {city.dominant ? ` • ${city.dominant.toUpperCase()}` : ''}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              Source: {city.source || 'EPA AirNow'}
            </div>
          </div>
          <span className={pillClass(city.category?.band)}>
            AQI {Number.isFinite(city.aqi) ? city.aqi : '–'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CityRankings() {
  const [tab, setTab] = useState('worst')
  const content = useMemo(() => {
    return tab === 'worst'
      ? <RankingList items={WORST_US_RANKINGS} emptyText="No data available." />
      : <RankingList items={BEST_US_RANKINGS} emptyText="No data available." />
  }, [tab])

  return (
    <section id="rankings" className="section">
      <div className="panel rankings-card">
        <h3>City Rankings</h3>

        <div className="toggle">
          <button
            className={tab === 'worst' ? 'active' : ''}
            onClick={() => setTab('worst')}
          >
            Most Polluted
          </button>
          <button
            className={tab === 'best' ? 'active' : ''}
            onClick={() => setTab('best')}
          >
            Cleanest
          </button>
        </div>

        {content}
      </div>
    </section>
  )
}
