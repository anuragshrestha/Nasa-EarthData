import React from 'react'

export default function Home() {
  return (
    <section id="home" className="section">
      <div className="panel">
        <h3>Satellite View</h3>
        <div className="map-inner">
          <img
            className="map-img"
            alt="Satellite view placeholder"
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop"
          />
          <div className="map-caption">Real-time satellite view — NASA TEMPO (placeholder)</div>
        </div>
      </div>
    </section>
  )
}
