import React from 'react'

export default function TitleBar() {
  return (
    <div className="titlebar">
      <img
        className="brand-logo"
        alt="NASA logo"
        src="https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg"
      />
      <div className="title">Nasa Inhale</div>
      <div className="subtitle">Real-time Air Quality Monitoring powered by NASA TEMPO</div>
    </div>
  )
}
