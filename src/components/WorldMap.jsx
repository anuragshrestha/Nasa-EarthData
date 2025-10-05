import React, { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../utils/loadGoogleMaps'
import { fetchWildfiresGeoJSON } from '../lib/eonet'

const WILDFIRE_FILL_OPACITY = 0.25
const WILDFIRE_STROKE_OPACITY = 0.9

function createControl(html, onClick) {
  const div = document.createElement('div')
  div.style.background = '#fff'
  div.style.border = '1px solid #ccc'
  div.style.borderRadius = '6px'
  div.style.padding = '6px 10px'
  div.style.margin = '8px'
  div.style.font = '500 13px system-ui, sans-serif'
  div.style.cursor = 'pointer'
  div.innerHTML = html
  div.addEventListener('click', onClick)
  return div
}


/**
 * Props:
 *   center: { lat: number, lng: number } | null
 *   zoomOnSelect?: number (default 11)
 */
export default function WorldMap({ center, zoomOnSelect = 11 }) {
  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const labelRef = useRef(null)
  const heatmapRef = useRef(null)
  const tempoOverlayRef = useRef(null)
  const wildfireCtrlRef = useRef(null)
  const [ready, setReady] = useState(false)
  const abortRef = useRef(null)
  const wildfireFetchAbortRef = useRef(null)
  const [showWildfires, setShowWildfires] = useState(true)
  const [fireMarkers, setFireMarkers] = useState([])
  const [firePolys, setFirePolys] = useState([])

  
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

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return

    const map = mapRef.current
    if (!wildfireCtrlRef.current) {
      const ctrl = createControl('🔥 Wildfires: <b>ON</b>', () => {
        setShowWildfires(prev => !prev)
      })
      wildfireCtrlRef.current = ctrl
      map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(ctrl)
    }

    const idleListener = map.addListener('idle', () => {
      if (showWildfires) {
        refreshWildfires(map, setFireMarkers, setFirePolys, wildfireFetchAbortRef)
      }
    })

    return () => {
      if (idleListener?.remove) idleListener.remove()
    }
  }, [ready, showWildfires])

  useEffect(() => {
    if (wildfireCtrlRef.current) {
      wildfireCtrlRef.current.innerHTML = `🔥 Wildfires: <b>${showWildfires ? 'ON' : 'OFF'}</b>`
    }

    if (!showWildfires) {
      clearWildfires({ setFireMarkers, setFirePolys })
      if (wildfireFetchAbortRef.current) wildfireFetchAbortRef.current.abort()
      return
    }

    if (mapRef.current && ready) {
      refreshWildfires(mapRef.current, setFireMarkers, setFirePolys, wildfireFetchAbortRef)
    }
  }, [showWildfires, ready])

  useEffect(() => {
    return () => {
      if (wildfireFetchAbortRef.current) wildfireFetchAbortRef.current.abort()
      clearWildfires({ setFireMarkers, setFirePolys })
      if (mapRef.current && wildfireCtrlRef.current && window.google?.maps?.ControlPosition != null) {
        const controlsArray = mapRef.current.controls[window.google.maps.ControlPosition.TOP_LEFT]
        const current = wildfireCtrlRef.current
        for (let i = controlsArray.getLength() - 1; i >= 0; i -= 1) {
          if (controlsArray.getAt(i) === current) {
            controlsArray.removeAt(i)
            break
          }
        }
      }
      wildfireCtrlRef.current = null
    }
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
    refreshAqiBadge(center)
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

  async function refreshAqiBadge(pt){
    try{
      if(!pt || !markerRef.current) return
      const url = `${apiBase()}/api/airquality/ninjas?lat=${encodeURIComponent(pt.lat)}&lon=${encodeURIComponent(pt.lng)}`
      const res = await fetch(url)
      if(!res.ok) return
      const data = await res.json()
      const aqi = data?.normalized?.overallAQI
      if(aqi == null) return
      markerRef.current.setLabel({ text: String(aqi), color: '#ffffff', fontSize: '12px' })
    }catch(e){
      // non-fatal
    }
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

  function clearWildfires({ setFireMarkers, setFirePolys }) {
    setFireMarkers(prev => {
      prev.forEach(m => m.setMap?.(null))
      return []
    })
    setFirePolys(prev => {
      prev.forEach(p => p.setMap?.(null))
      return []
    })
  }

  function eonetBBoxFromMap(map) {
    const b = map?.getBounds?.()
    if (!b) return null
    const ne = b.getNorthEast()
    const sw = b.getSouthWest()
    if (!ne || !sw) return null
    const minLon = sw.lng()
    const maxLat = ne.lat()
    const maxLon = ne.lng()
    const minLat = sw.lat()
    return `${minLon},${maxLat},${maxLon},${minLat}`
  }

  async function refreshWildfires(map, setFireMarkers, setFirePolys, abortRefWildfire) {
    const g = window.google?.maps
    if (!g) return
    const bbox = eonetBBoxFromMap(map)
    if (!bbox) return

    if (abortRefWildfire.current) abortRefWildfire.current.abort()
    const controller = new AbortController()
    abortRefWildfire.current = controller

    let fc
    try {
      fc = await fetchWildfiresGeoJSON(
        { bbox, days: 14, limit: 300, status: 'open' },
        { signal: controller.signal }
      )
    } catch (error) {
      if (controller.signal.aborted) return
      console.error('EONET fetch failed:', error)
      return
    }
    if (controller.signal.aborted) return

    clearWildfires({ setFireMarkers, setFirePolys })

    const markers = []
    const polys = []

    const features = Array.isArray(fc?.features) ? fc.features : []
    features.forEach(feat => {
      const props = feat?.properties || {}
      const geom = feat?.geometry || {}

      if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
        const [lon, lat] = geom.coordinates
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          const el = document.createElement('div')
          el.style.fontSize = '18px'
          el.textContent = '🔥'

          let marker
          if (g.marker?.AdvancedMarkerElement) {
            marker = new g.marker.AdvancedMarkerElement({
              map,
              position: { lat, lng: lon },
              title: props.title || 'Wildfire',
              content: el,
            })
          } else {
            marker = new g.Marker({
              map,
              position: { lat, lng: lon },
              title: props.title || 'Wildfire',
              label: { text: '🔥', fontSize: '18px' },
            })
          }

          const content = document.createElement('div')
          content.style.maxWidth = '260px'
          content.style.fontSize = '12px'
          const sourcesHtml = Array.isArray(props.sources)
            ? props.sources
                .map(s => {
                  const href = s?.url || s?.id || '#'
                  const label = s?.id || s?.url || 'Source'
                  return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`
                })
                .join(' | ')
            : ''
          content.innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">${props.title || 'Wildfire'}</div>
            <div style="margin-bottom:6px;">${props.date ? new Date(props.date).toLocaleString() : ''}</div>
            <div style="margin-bottom:6px;opacity:.8;">Status: ${props.closed ? 'Closed' : 'Open'}</div>
            ${sourcesHtml ? `<div style="margin-top:6px;">Sources: ${sourcesHtml}</div>` : ''}
            ${props.link ? `<div style="margin-top:6px;"><a href="${props.link}" target="_blank" rel="noopener">View on EONET</a></div>` : ''}
          `

          const info = new g.InfoWindow({ content })
          const listenerTarget = marker.addListener ? marker : null
          listenerTarget?.addListener('click', () => info.open({ anchor: marker, map }))
          markers.push(marker)
        }
      }

      if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
        const ring = geom.coordinates[0] || []
        const path = ring
          .map(coord => {
            const [lon, lat] = coord || []
            return Number.isFinite(lat) && Number.isFinite(lon)
              ? { lat, lng: lon }
              : null
          })
          .filter(Boolean)
        if (path.length) {
          const poly = new g.Polygon({
            map,
            paths: path,
            strokeWeight: 1,
            strokeOpacity: WILDFIRE_STROKE_OPACITY,
            fillOpacity: WILDFIRE_FILL_OPACITY,
            strokeColor: '#d35400',
            fillColor: '#e67e22',
          })
          polys.push(poly)
        }
      }
    })

    setFireMarkers(markers)
    setFirePolys(polys)
  }

  return (
    <div className="map-inner" style={{ position: 'relative' }}>
      <div ref={mapElRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
      {/* Quick control to ingest a TEMPO PNG URL and overlay it using current map bbox */}
      <button
        onClick={async () => {
          if (!mapRef.current) return
          const imageUrl = window.prompt('Enter TEMPO PNG URL (from Harmony):')
          if (!imageUrl) return
          const b = mapRef.current.getBounds()
          if (!b) return
          const sw = b.getSouthWest(); const ne = b.getNorthEast()
          const bbox = `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`
          try {
            const base = apiBase()
            const res = await fetch(`${base}/api/nasa/tempo/no2?imageUrl=${encodeURIComponent(imageUrl)}&bbox=${encodeURIComponent(bbox)}`)
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            const { url, bounds } = data || {}
            if (!url || !bounds) return
            const overlayBounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(bounds.south, bounds.west),
              new google.maps.LatLng(bounds.north, bounds.east)
            )
            if (!tempoOverlayRef.current) {
              tempoOverlayRef.current = new google.maps.GroundOverlay(`${apiBase()}${url}`, overlayBounds, { opacity: 0.5 })
            } else {
              tempoOverlayRef.current.setMap(null)
              tempoOverlayRef.current = new google.maps.GroundOverlay(`${apiBase()}${url}`, overlayBounds, { opacity: 0.5 })
            }
            tempoOverlayRef.current.setMap(mapRef.current)
          } catch (e) {
            console.warn('TEMPO overlay failed', e)
          }
        }}
        style={{ position: 'absolute', right: 12, top: 12, zIndex: 2, padding: '6px 10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, cursor: 'pointer' }}
        title="Overlay a TEMPO PNG using current map bounds"
      >
        Add TEMPO Overlay
      </button>
    </div>
  )
}
