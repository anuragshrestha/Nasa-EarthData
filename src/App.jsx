import React from 'react'
import './styles/ui.css'

import Header from './components/Header.jsx'
import TitleBar from './components/TitleBar.jsx'
import MobileTabs from './components/MobileTabs.jsx'

import Home from './screens/Home.jsx'
import AirQualityIndex from './screens/AirQualityIndex.jsx'
import AirQualityAlerts from './screens/AirQualityAlerts.jsx'
import CityRankings from './screens/CityRankings.jsx'
import WildfireUpdates from './screens/WildfireUpdates.jsx'
import DataSources from './screens/DataSources.jsx'

function App() {
  return (
    <div className="app-root">
      <MobileTabs />
      <div className="container">
        <TitleBar />
        <Header />
        <div className="dashboard-grid">
          <div className="stack">
            <AirQualityAlerts />
            <CityRankings />
          </div>
          <div>
            <Home />
          </div>
          <div className="stack">
            <WildfireUpdates />
            <DataSources />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
