import React, { useEffect, useRef, useState } from 'react'

// Load Google Maps JS 
let mapsLoader
function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve()
  if (mapsLoader) return mapsLoader
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  mapsLoader = new Promise((resolve, reject) => {
    const id = 'google-maps-places'
    if (document.getElementById(id)) {
      document.getElementById(id).addEventListener('load', resolve, { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = id
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
  return mapsLoader
}

export default function SearchBar() {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let autocomplete
    let sessionToken
    let listener

    let cancelled = false
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current) return
        sessionToken = new window.google.maps.places.AutocompleteSessionToken()
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components'],
          types: ['geocode'],
        })
        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          const label = place.formatted_address || place.name || ''
          setQuery(label)
        })
      })
      .catch(() => {
        console.error('Failed to load google maps')
      })

    return () => {
      cancelled = true
      if (listener) window.google?.maps?.event?.removeListener(listener)
    }
  }, [])

  return (
    <header className="hero">
      <div className="search-wrap">
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Enter Street address, City name or ZIP code"
          aria-label="Search by address, city, or ZIP"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          autoComplete="off"
        />
        <button className="search-btn">Search</button>
      </div>
    </header>
  )
}
