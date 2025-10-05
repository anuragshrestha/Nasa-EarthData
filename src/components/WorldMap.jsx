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
    const circleRef = useRef(null);

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
    }).catch(err => console.error('Maps JS failed to load:', err))
    return () => { cancelled = true }
  }, [])

  // Update marker + pan when center changes
  useEffect(() => {
    if (!ready || !center || !mapRef.current) return

    const lat = parseFloat(center.lat)
    const lng = parseFloat(center.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn('WorldMap: invalid center', center)
      return
    }

    const pos = new google.maps.LatLng(lat, lng)
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        title: 'Selected location',
        animation: google.maps.Animation.DROP,
      })
    } else {
      markerRef.current.setPosition(pos)
      if (markerRef.current.getIcon()) markerRef.current.setIcon(null)
    }

    mapRef.current.panTo(pos)
    setTimeout(() => mapRef.current.setZoom(zoomOnSelect), 150)

    // refresh AQI heat layer near the selected point
    refreshAQIHeat({ lat, lng })
  }, [center, ready, zoomOnSelect])



  function apiBase() {
    return import.meta.env.MODE === 'development'
      ? `http://localhost:4000`
      : import.meta.env.VITE_API_URL
  }


async function refreshAQIHeat(pt) {
  try {
    if (!pt) return;
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    const url = `${apiBase()}/api/airnow/aqi?lat=${encodeURIComponent(pt.lat)}&lon=${encodeURIComponent(pt.lng)}&radius=250`;
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) {
      if (heatmapRef.current) heatmapRef.current.setMap(null);
      if (circleRef.current) circleRef.current.setMap(null);
      return;
    }
    const data = await res.json();

    // Colored circle at the selected point
    const pos = new google.maps.LatLng(pt.lat, pt.lng);
    if (circleRef.current) circleRef.current.setMap(null);
    circleRef.current = new google.maps.Circle({
      map: mapRef.current,
      center: pos,
      radius: 1600,               
      strokeOpacity: 0,
      fillColor: data.color || "#777",
      fillOpacity: 0.35,
    });

    if (markerRef.current) {
      markerRef.current.setLabel({
        text: String(data.overallAQI ?? ""),
        className: "aqi-badge", 
      });
      markerRef.current.setTitle(`AQI ${data.overallAQI} (${data.category})`);
    }
  } catch (e) {
    console.warn("AQI overlay failed", e);
    if (heatmapRef.current) heatmapRef.current.setMap(null);
    if (circleRef.current) circleRef.current.setMap(null);
  }
}

  return (
    <div className="map-inner">
      <div ref={mapElRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
    </div>
  )
}