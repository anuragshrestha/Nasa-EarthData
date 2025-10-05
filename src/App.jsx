import React from 'react'
import './styles/ui.css'

import SearchBar from './components/SearchBar.jsx'
import TitleBar from './components/TitleBar.jsx'
import MobileTabs from './components/MobileTabs.jsx'

import Home from './screens/Home.jsx'
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
        <SearchBar />
        <div className="home-mobile"><Home /></div>
        <div className="dashboard-grid">
          <div className="stack">
            <AirQualityAlerts />
            <CityRankings />
          </div>
       <div className="home-desktop"><Home /></div>
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
