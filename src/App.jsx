import React from 'react'
import './styles/ui.css'

import Header from './components/Header.jsx'
import MobileTabs from './components/MobileTabs.jsx'

import Home from './screens/Home.jsx'
import AirQualityIndex from './screens/AirQualityIndex.jsx'
import CityRankings from './screens/CityRankings.jsx'
import WildfireUpdates from './screens/WildfireUpdates.jsx'
import DataSources from './screens/DataSources.jsx'

function App() {
  return (
    <div className="app-root">
      <MobileTabs />
      <div className="container">
        <Header />
        <Home />
        <AirQualityIndex />
        <CityRankings />
        <WildfireUpdates />
        <DataSources />
      </div>
    </div>
  )
}

export default App
