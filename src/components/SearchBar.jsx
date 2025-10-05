import React, { useEffect, useRef, useState } from 'react'
import AutocompleteAddress from './AutoCompleteAddress'



export default function SearchBar() {

  const [location, setLocation] = useState(null);

  const onPressSearch = () => {
    console.log('pressed search');
    
    if (!location) {
      alert('Please select a location first!')
      return
    }

    // This is where you handle the location data
    console.log('Selected location:', location)

    // Example: extract and use data
    const { label, lat, lng } = location;

    console.log(lat, " ", lng);
    
  }

  return (
    <header className="hero">
      <div className="search-wrap">
        <AutocompleteAddress
        className="input"
        onPlaceSelected={setLocation}
        countryRestriction='us'
        />
        <button className="search-btn" onClick={onPressSearch} >Search</button>
      </div>
    </header>
  )
}
