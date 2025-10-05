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
  const [ready, setReady] = useState(false)

  
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
  }, [center, ready, zoomOnSelect])

  return (
    <div className="map-inner">
      <div ref={mapElRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
      {/* <div className="map-caption">Live satellite — Google Maps </div> */}
    </div>
  )
}
