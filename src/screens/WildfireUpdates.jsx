import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const EONET_ENDPOINT = 'https://eonet.gsfc.nasa.gov/api/v3/events/geojson?category=wildfires&status=open&days=14&limit=20'

const FIRMS_OVERRIDES = {
  'Lake Creek Wildfire, Blaine, Idaho': 'https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@-115.0,43.5,7.5z',
  'Hayes Wildfire, Blaine, Montana': 'https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@-111.9,45.3,8.5z',
  'Heat Wave Wildfire, Callahan, Texas': 'https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@-98.7,32.4,8.3z',
}

function firmsLink(coords) {
  if (!coords) return null
  const lat = Number(coords.lat)
  const lon = Number(coords.lon ?? coords.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const zoom = 6
  return `https://firms.modaps.eosdis.nasa.gov/map/#t:firms;d:24hrs;@${lon.toFixed(2)},${lat.toFixed(2)},${zoom}z`
}

function magnitudeBadge(magnitudeValue) {
  if (!Number.isFinite(magnitudeValue)) {
    return { label: 'Active', className: 'badge' }
  }
  if (magnitudeValue >= 100000) return { label: 'Extreme', className: 'badge warn' }
  if (magnitudeValue >= 25000) return { label: 'High', className: 'badge bad' }
  if (magnitudeValue >= 5000) return { label: 'Elevated', className: 'badge' }
  return { label: 'Active', className: 'badge' }
}

function normalizeFeature(feature) {
  if (!feature) return null
  const props = feature.properties || {}
  const geom = feature.geometry || {}
  const coordinates = Array.isArray(geom.coordinates)
    ? { lat: Number(geom.coordinates[1]), lon: Number(geom.coordinates[0]) }
    : null

  const sources = Array.isArray(props.sources) ? props.sources : []
  const primarySource = sources.find(src => src?.url) || sources[0] || null
  const eonetLink = props.id ? `https://eonet.gsfc.nasa.gov/event/${props.id}` : null
  let sourceName = primarySource?.id || null
  if (!sourceName && primarySource?.url) {
    try {
      sourceName = new URL(primarySource.url).hostname.replace('www.', '')
    } catch (e) {
      sourceName = primarySource.url
    }
  }

  const title = (props.title || 'Wildfire Event').trim()
  const manualFirmsLink = FIRMS_OVERRIDES[title]
  if (!manualFirmsLink) {
    return null
  }

  return {
    id: props.id || feature.id || props.title,
    title,
    summary: props.description || '',
    location: props.title || null,
    publishedAt: props.date || null,
    sourceName: sourceName || 'EONET',
    link: primarySource?.url || props.link || eonetLink,
    eonetLink,
    sources,
    badge: magnitudeBadge(Number(props.magnitudeValue)),
    coordinates: coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lon)
      ? coordinates
      : null,
    firmsLink: manualFirmsLink,
  }
}

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WildfireUpdates({ onFocusLocation }) {
  const [articles, setArticles] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const controllerRef = useRef(null)

  const loadArticles = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setStatus('loading')
    setError(null)

    fetch(EONET_ENDPOINT, { signal: controller.signal })
      .then(res => {
        if (!res.ok) {
          return res.text().then(txt => { throw new Error(txt || 'Wildfire feed fetch failed') })
        }
        return res.json()
      })
      .then(payload => {
        const features = Array.isArray(payload?.features) ? payload.features : []
        const mapped = features
          .map(normalizeFeature)
          .filter(Boolean)
          .slice(0, 6)
        setArticles(mapped)
        setStatus('ready')
      })
      .catch(err => {
        if (controller.signal.aborted) return
        console.error('Wildfire feed fetch failed', err)
        setError('Unable to load wildfire updates right now.')
        setStatus('error')
        setArticles([])
      })
  }, [])

  useEffect(() => {
    loadArticles()
    return () => controllerRef.current?.abort()
  }, [loadArticles])

  useEffect(() => {
    const coords = articles
      .map(article => article?.coordinates ? { ...article.coordinates, id: article.id, title: article.title } : null)
      .filter(Boolean)

    window.dispatchEvent(new CustomEvent('wildfire-news-coords', { detail: coords }))

    return () => {
      window.dispatchEvent(new CustomEvent('wildfire-news-coords', { detail: [] }))
    }
  }, [articles])

  const content = useMemo(() => {
    if (status === 'loading' && !articles.length) {
      return (
        <div className="muted" style={{ padding: '12px 0' }}>
          Loading current wildfire coverage...
        </div>
      )
    }

    if (status === 'error' && !articles.length) {
      return (
        <div className="muted" style={{ padding: '12px 0' }}>
          {error}
          <button
            type="button"
            style={{ marginTop: 12 }}
            className="link-button"
            onClick={loadArticles}
          >
            Retry
          </button>
        </div>
      )
    }

    if (!articles.length) {
      return (
        <div className="muted" style={{ padding: '12px 0' }}>
          No wildfire headlines available right now.
        </div>
      )
    }

    return articles.map(article => (
      <div key={article.id} className="fire-item">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h4 style={{ margin: 0 }}>{article.title}</h4>
          {article.badge?.label ? (
            <span className={article.badge.className || 'badge'}>{article.badge.label}</span>
          ) : null}
        </div>
        {article.location ? (
          <div className="muted" style={{ marginTop: 4 }}>
            {article.location}
          </div>
        ) : null}
        {article.summary ? (
          <div className="muted" style={{ marginTop: 6 }}>
            {article.summary}
          </div>
        ) : null}
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          {article.publishedAt ? `Updated ${formatDate(article.publishedAt)}` : 'Updated recently'}
          {article.sourceName ? ` • Primary source: ${article.sourceName}` : ''}
        </div>
        {article.firmsLink ? (
          <div style={{ marginTop: 10 }}>
            <a
              href={article.firmsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="link-button"
            >
              View in FIRMS ↗
            </a>
          </div>
        ) : null}
      </div>
    ))
  }, [articles, status, error, loadArticles, onFocusLocation])

  return (
    <section id="wildfires" className="section">
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Wildfire Updates</h3>
          <button
            type="button"
            className="link-button"
            onClick={loadArticles}
            disabled={status === 'loading'}
            style={{ opacity: status === 'loading' ? 0.6 : 1 }}
          >
            {status === 'loading' ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="fire-list">
          {content}
        </div>
      </div>
    </section>
  )
}
