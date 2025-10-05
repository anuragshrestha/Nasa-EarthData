import React from 'react'
import WorldMap from '../components/WorldMap'

export default function Home({center}) {
  return (
    <section id="home" className="section">
      <div className="panel">
        <h3>Satellite View</h3>
        <WorldMap center={center}/>
      </div>
    </section>
  )
}
