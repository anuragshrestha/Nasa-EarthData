

function categoryFromAQI(aqi) {
  if (aqi == null) return { label: "Unknown", color: "#777" };
  if (aqi <= 50)   return { label: "Good", color: "#00e400" };
  if (aqi <= 100)  return { label: "Moderate", color: "#ffff00" };
  if (aqi <= 150)  return { label: "USG", color: "#ff7e00" };
  if (aqi <= 200)  return { label: "Unhealthy", color: "#ff0000" };
  if (aqi <= 300)  return { label: "Very Unhealthy", color: "#8f3f97" };
  return              { label: "Hazardous", color: "#7e0023" };
}

export async function getAirNowAQI(req, res) {
  try {
    const { lat, lon, radius = 25 } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "lat and lon are required" });

    const url =
      `https://www.airnowapi.org/aq/observation/latLong/current/` +
      `?format=application/json&latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}&distance=${encodeURIComponent(radius)}` +
      `&API_KEY=${process.env.AIRNOW_API_KEY}`;

    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return res.status(r.status).send(await r.text());

    const observations = await r.json(); 
    let dominant = null;
    for (const o of observations || []) {
      if (o?.AQI == null) continue;
      if (!dominant || Number(o.AQI) > Number(dominant.AQI)) dominant = o;
    }

    const overallAQI = dominant?.AQI ?? null;
    const cat = categoryFromAQI(overallAQI);

    return res.json({
      source: "airnow",
      overallAQI,
      dominantParameter: dominant?.ParameterName ?? null,
      category: cat.label,
      color: cat.color,
      station: dominant ? { lat: dominant.Latitude, lon: dominant.Longitude } : null,
      observations,
    });
  } catch (e) {
    console.error("AirNow proxy failed:", e);
    res.status(500).json({ error: "Internal server error" });
  }
}