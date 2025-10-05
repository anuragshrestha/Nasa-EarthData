import React, { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../utils/loadGoogleMaps'


/**
 * Props:
 *   center: { lat: number, lng: number } | null
 *   zoomOnSelect?: number (default 11)
 */
export default function WorldMap({ center, zoomOnSelect = 11 }) {
  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const heatmapRef = useRef(null)
  const [ready, setReady] = useState(false)
  const abortRef = useRef(null)

  
  useEffect(() => {
    let cancelled = false
    loadGoogleMaps().then(() => {
      if (cancelled || !mapElRef.current || !window.google?.maps) return
      mapRef.current = new google.maps.Map(mapElRef.current, {
        center: { lat: 20, lng: 0 },     
        zoom: 2,
        mapTypeId: 'hybrid',            
        disableDefaultUI: true,
        gestureHandling: 'greedy',      
        backgroundColor: '#00132b'
      })
      setReady(true)
    })
    .catch(err => console.error('Maps JS failed to load:', err));

    return () => { cancelled = true }
  }, [])

  // Update marker + pan when center changes
  useEffect(() => {
    if (!ready || !center || !mapRef.current) return

    const lat = parseFloat(center.lat);
    const lng = parseFloat(center.lng);
    if(!Number.isFinite(lat) || !Number.isFinite(lng)){
        console.warn('WorldMap: invalid center', center);
        return
    }

    // Create/update the marker (use default Google red pin)
    const pos = new google.maps.LatLng(lat, lng);
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        title: 'Selected location',
        animation: google.maps.Animation.DROP,
      })
    } else {
      markerRef.current.setPosition(pos)
      if (markerRef.current.getIcon()) {
        markerRef.current.setIcon(null)
      }
    }

    mapRef.current.panTo(pos)

    setTimeout(() => mapRef.current.setZoom(zoomOnSelect), 150)

    // refresh AQI heat layer near the selected point
    refreshAQIHeat(center)
  }, [center, ready, zoomOnSelect])

  // Convert PM2.5 ug/m3 to US EPA AQI (approximate 24h formula)
  function pm25ToAQI(c) {
    const ranges = [
      { Cl: 0.0,   Ch: 12.0,   Il: 0,   Ih: 50 },
      { Cl: 12.1,  Ch: 35.4,   Il: 51,  Ih: 100 },
      { Cl: 35.5,  Ch: 55.4,   Il: 101, Ih: 150 },
      { Cl: 55.5,  Ch: 150.4,  Il: 151, Ih: 200 },
      { Cl: 150.5, Ch: 250.4,  Il: 201, Ih: 300 },
      { Cl: 250.5, Ch: 500.4,  Il: 301, Ih: 500 },
    ]
    for (const r of ranges) {
      if (c >= r.Cl && c <= r.Ch) {
        return Math.round(((r.Ih - r.Il) / (r.Ch - r.Cl)) * (c - r.Cl) + r.Il)
      }
    }
    return 500
  }

  function aqiGradient() {
    return [
      'rgba(0,0,0,0)',
      '#00e400', // Good
      '#ffff00', // Moderate
      '#ff7e00', // USG
      '#ff0000', // Unhealthy
      '#8f3f97', // Very Unhealthy
      '#7e0023', // Hazardous
    ]
  }

  function apiBase() {
    return import.meta.env.MODE === 'development'
      ? `http://localhost:4000`
      : import.meta.env.VITE_API_URL
  }

  async function refreshAQIHeat(pt) {
    try {
      if (!pt) return
      if (abortRef.current) abortRef.current.abort()
      const ctl = new AbortController()
      abortRef.current = ctl

      const url = `${apiBase()}/api/openaq/latest?lat=${encodeURIComponent(pt.lat)}&lon=${encodeURIComponent(pt.lng)}`
      const res = await fetch(url, { signal: ctl.signal })
      if (!res.ok) {
        console.log('failed to load the openap url');
        
        if (heatmapRef.current) heatmapRef.current.setMap(null)
        return
      }
      const data = await res.json()
      const results = Array.isArray(data?.results) ? data.results : []

      // Collect PM2.5 points
      const points = []
      const pushPoint = (lat, lng, pm25) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(pm25)) return
        const aqi = pm25ToAQI(pm25)
        const weight = Math.min(1, aqi / 300)
        points.push({ location: new google.maps.LatLng(lat, lng), weight })
      }

      for (const r of results) {
        // v3 latest often: { measurements: [{parameter, value}], coordinates: {latitude, longitude} }
        const lat = r?.coordinates?.latitude ?? r?.location?.coordinates?.latitude ?? r?.latitude ?? r?.location?.latitude
        const lng = r?.coordinates?.longitude ?? r?.location?.coordinates?.longitude ?? r?.longitude ?? r?.location?.longitude
        let pm25 = null
        if (Array.isArray(r?.measurements)) {
          const m = r.measurements.find(m => (m?.parameter || m?.parameterId || '').toString().toLowerCase() === 'pm25' || m?.parameter === 'pm2.5')
          pm25 = m?.value ?? null
        } else if ((r?.parameter || '').toString().toLowerCase() === 'pm25' || r?.parameter === 'pm2.5') {
          pm25 = r?.value ?? null
        }
        if (lat != null && lng != null && pm25 != null) pushPoint(Number(lat), Number(lng), Number(pm25))
      }

      if (!points.length) {
        if (heatmapRef.current) heatmapRef.current.setMap(null)
        return
      }

      if (!heatmapRef.current) {
        heatmapRef.current = new google.maps.visualization.HeatmapLayer({
          data: points,
          map: mapRef.current,
          radius: 32,
          opacity: 0.6,
          gradient: aqiGradient(),
        })
      } else {
        heatmapRef.current.setData(points)
        heatmapRef.current.set('gradient', aqiGradient())
        heatmapRef.current.set('radius', 32)
        heatmapRef.current.set('opacity', 0.6)
        heatmapRef.current.setMap(mapRef.current)
      }
    } catch (e) {
      // Swallow errors to avoid disrupting the UI
      console.warn('AQI heat refresh failed', e)
      if (heatmapRef.current) heatmapRef.current.setMap(null)
    }
  }

  return (
    <div className="map-inner">
      <div ref={mapElRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
    </div>
  )
}
