import React, { useState } from 'react'
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

  const [location, setLocation] = useState(null);


  return (
    <div className="app-root">
      <MobileTabs />
      <div className="container">
        <TitleBar />
        <SearchBar onSearchLocation = {(pt) => {
          const lat = Number(pt.lat)
          const lng = Number(pt.lng)
          if (Number.isFinite(lat) && Number.isFinite(lng)){
            setLocation({lat, lng});
          }else{
            console.warn('Bad coords from Search Bar:', pt);
          }
        }} />
        <div className="home-mobile"><Home center={location} /></div>
        <div className="dashboard-grid">
          <div className="stack">
            <AirQualityAlerts />
            <CityRankings />
          </div>
       <div className="home-desktop"><Home center={location} /></div>
          <div className="stack">
            <WildfireUpdates onFocusLocation={(pt) => {
              const lat = Number(pt?.lat)
              const lng = Number(pt?.lng)
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                setLocation({ lat, lng })
              }
            }} />
            <DataSources />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
