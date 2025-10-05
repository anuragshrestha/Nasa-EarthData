function categoryFromAQI(aqi) {
  if (aqi == null) return { label: "Unknown", color: "#777" };
  if (aqi <= 50)   return { label: "Good", color: "#00e400" };
  if (aqi <= 100)  return { label: "Moderate", color: "#ffff00" };
  if (aqi <= 150)  return { label: "USG", color: "#ff7e00" };
  if (aqi <= 200)  return { label: "Unhealthy", color: "#ff0000" };
  if (aqi <= 300)  return { label: "Very Unhealthy", color: "#8f3f97" };
  return              { label: "Hazardous", color: "#7e0023" };
}


// async function fetchPoint(lat, lon, radiusMiles, apiKey) {
    
//   console.log('-HITTING AIRNOW NEARBY API---');
  
//   const url = `https://www.airnowapi.org/aq/observation/latLong/current/` +
//     `?format=application/json&latitude=${encodeURIComponent(lat)}` +
//     `&longitude=${encodeURIComponent(lon)}&distance=${encodeURIComponent(radiusMiles)}` +
//     `&API_KEY=${apiKey}`;
    
//   const r = await fetch(url, { headers: { Accept: "application/json" } });
//   if (!r.ok) throw new Error(await r.text());
//   const observations = await r.json();
//   let dominant = null;
//   for (const o of observations || []) {
//     if (o?.AQI == null) continue;
//     if (!dominant || Number(o.AQI) > Number(dominant.AQI)) dominant = o;
//   }
//   if (!dominant) return null;
//   const cat = categoryFromAQI(dominant.AQI);
//   console.log("DOMINANT API");
  
//   return {
//     reportingArea: dominant.ReportingArea,
//     state: dominant.StateCode,
//     lat: dominant.Latitude,
//     lon: dominant.Longitude,
//     aqi: dominant.AQI,
//     category: cat.label,
//     color: cat.color,
//     parameter: dominant.ParameterName,
//   };
// }

async function fetchPoint(lat, lon, radiusMiles, apiKey) {
  const url = `https://www.airnowapi.org/aq/observation/latLong/current/` +
    `?format=application/json&latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}&distance=${encodeURIComponent(radiusMiles)}` +
    `&API_KEY=${apiKey}`;

  console.log("[AirNow] GET", url.replace(/API_KEY=.*$/, "API_KEY=****"));

  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await r.text(); // read once
  if (!r.ok) {
    console.error("[AirNow] HTTP", r.status, body);
    throw new Error(`AirNow ${r.status}`);
  }

  let observations;
  try { observations = JSON.parse(body); } 
  catch (e) { 
    console.error("[AirNow] JSON parse error", body); 
    throw e; 
  }

  if (!Array.isArray(observations) || observations.length === 0) {
    console.warn("[AirNow] empty observations for", lat, lon);
    return null;
  }

  let dominant = null;
  for (const o of observations) {
    if (o?.AQI == null) continue;
    if (!dominant || Number(o.AQI) > Number(dominant.AQI)) dominant = o;
  }
  if (!dominant) {
    console.warn("[AirNow] no AQI values in observations", observations);
    return null;
  }

  const cat = categoryFromAQI(dominant.AQI);
  return {
    reportingArea: dominant.ReportingArea,
    state: dominant.StateCode,
    lat: dominant.Latitude,
    lon: dominant.Longitude,
    aqi: dominant.AQI,
    category: cat.label,
    color: cat.color,
    parameter: dominant.ParameterName,
  };
}

// ~miles to lat/lon deltas around a center
function ringOffsetsMiles(latDeg, spreadMiles = 50) {
  const dLat = spreadMiles / 69.0;
  const dLng = spreadMiles / (69.0 * Math.cos((latDeg * Math.PI) / 180));
  return [
    [ 0,   0 ],   // center
    [ dLat,   0 ],   // N
    [ dLat,  dLng ], // NE
    [ 0,     dLng ], // E
    [-dLat,  dLng ], // SE
    [-dLat,   0 ],   // S
    [-dLat, -dLng ], // SW
    [ 0,    -dLng ], // W
    [ dLat, -dLng ], // NW
  ];
}

export async function getAirNowNearby(req, res) {
  try {
    const { lat, lon } = req.query;
    const radius = Number(req.query.radius ?? 250);     
    const spread = Number(req.query.spread ?? 150);      
    const limit  = Number(req.query.limit  ?? 25);     

    if (!lat || !lon) return res.status(400).json({ error: "lat and lon are required" });
    const latNum = Number(lat), lonNum = Number(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return res.status(400).json({ error: "invalid lat/lon" });
    }

    const apiKey = process.env.AIRNOW_API_KEY;
    const offsets = ringOffsetsMiles(latNum, spread);

    const promises = offsets.map(([dlat, dlng]) =>
      fetchPoint(latNum + dlat, lonNum + dlng, radius, apiKey).catch(() => null)
    );
    const results = (await Promise.all(promises)).filter(Boolean);

    // dedupe by ReportingArea
    const byArea = new Map();
    for (const r of results) {
      const key = `${r.reportingArea}|${r.state}`;
      if (!byArea.has(key) || r.aqi > byArea.get(key).aqi) byArea.set(key, r);
    }
    const unique = Array.from(byArea.values())
      .sort((a, b) => b.aqi - a.aqi)
      .slice(0, limit);

    res.json({ source: "airnow-nearby", count: unique.length, locations: unique });
  } catch (e) {
    console.error("AirNow nearby failed:", e);
    res.status(500).json({ error: "Internal server error" });
  }
}