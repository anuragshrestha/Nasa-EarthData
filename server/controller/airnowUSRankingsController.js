function categoryFromAQI(aqi) {
  if (aqi == null) return { label: "Unknown", color: "#777" };
  if (aqi <= 50)   return { label: "Good", color: "#00e400" };
  if (aqi <= 100)  return { label: "Moderate", color: "#ffff00" };
  if (aqi <= 150)  return { label: "USG", color: "#ff7e00" };
  if (aqi <= 200)  return { label: "Unhealthy", color: "#ff0000" };
  if (aqi <= 300)  return { label: "Very Unhealthy", color: "#8f3f97" };
  return              { label: "Hazardous", color: "#7e0023" };
}

async function fetchPointAreas(lat, lon, radiusMiles, apiKey) {
  const url = `https://www.airnowapi.org/aq/observation/latLong/current/` +
    `?format=application/json&latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}&distance=${encodeURIComponent(radiusMiles)}` +
    `&API_KEY=${apiKey}`;

  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await r.text();
  if (!r.ok) throw new Error(`AirNow ${r.status}: ${body}`);

  let observations;
  try { observations = JSON.parse(body); }
  catch (e) { throw new Error("AirNow JSON parse error"); }

  if (!Array.isArray(observations) || observations.length === 0) return [];

  // Deduplicate per ReportingArea|State; keep the max AQI among pollutants and stations
  const byArea = new Map();
  for (const o of observations) {
    if (o?.AQI == null) continue;
    const key = `${o.ReportingArea}|${o.StateCode}`;
    const prev = byArea.get(key);
    if (!prev || Number(o.AQI) > Number(prev.aqi)) {
      const cat = categoryFromAQI(o.AQI);
      byArea.set(key, {
        reportingArea: o.ReportingArea,
        state: o.StateCode,
        lat: o.Latitude,
        lon: o.Longitude,
        aqi: o.AQI,
        category: cat.label,
        color: cat.color,
        parameter: o.ParameterName,
      });
    }
  }
  return Array.from(byArea.values());
}

// Coarse grid covering contiguous US + AK + HI
function usGridPoints() {
  const pts = [];
  // Contiguous US bounding box approx (24.5..49.5, -124.8..-66.9)
  const latStart = 25, latEnd = 49; 
  const lonStart = -125, lonEnd = -67; 
  const latStep = 6;
  const lonStep = 6; 
  for (let lat = latStart; lat <= latEnd; lat += latStep) {
    for (let lon = lonStart; lon <= lonEnd; lon += lonStep) {
      pts.push({ lat, lon });
    }
  }
  // Alaska (major population centers)
  pts.push({ lat: 61.2181, lon: -149.9003 }); // Anchorage
  pts.push({ lat: 64.8378, lon: -147.7164 }); // Fairbanks
  pts.push({ lat: 58.3019, lon: -134.4197 }); // Juneau
  // Hawaii
  pts.push({ lat: 21.3069, lon: -157.8583 }); // Honolulu
  pts.push({ lat: 19.7074, lon: -155.0885 }); // Hilo
  return pts;
}

let CACHE = { ts: 0, data: null };
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getAirNowUSRankings(req, res) {
  try {
    const limit = Number(req.query.limit ?? 3);
    const radius = Number(req.query.radius ?? 180); 
    const now = Date.now();
    if (CACHE.data && now - CACHE.ts < TTL_MS) {
      return res.json({ cached: true, ...CACHE.data });
    }

    const apiKey = process.env.AIRNOW_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "AIRNOW_API_KEY missing" });

    const points = usGridPoints();
    const results = [];
    const concurrency = 8;

    // Simple pool for limited concurrency
    let i = 0;
    async function worker() {
      while (i < points.length) {
        const idx = i++;
        const p = points[idx];
        try {
          const areas = await fetchPointAreas(p.lat, p.lon, radius, apiKey);
          results.push(...areas);
        } catch (e) {
          // swallow to keep other workers going
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    // Dedupe by reportingArea|state taking the max AQI seen
    const byArea = new Map();
    for (const r of results) {
      const key = `${r.reportingArea}|${r.state}`;
      if (!byArea.has(key) || r.aqi > byArea.get(key).aqi) byArea.set(key, r);
    }
    const unique = Array.from(byArea.values());
    const sortedDesc = unique.slice().sort((a, b) => b.aqi - a.aqi);
    const sortedAsc = unique.slice().sort((a, b) => a.aqi - b.aqi);

    const payload = {
      source: "airnow",
      generatedAt: new Date().toISOString(),
      count: unique.length,
      mostPolluted: sortedDesc.slice(0, Math.max(0, limit)),
      cleanest: sortedAsc.slice(0, Math.max(0, limit)),
    };

    CACHE = { ts: now, data: payload };
    res.json(payload);
  } catch (e) {
    console.error("US rankings failed:", e);
    res.status(500).json({ error: "Internal server error" });
  }
}

