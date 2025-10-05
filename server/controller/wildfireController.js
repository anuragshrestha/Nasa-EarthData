
function distKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI/180;
  const dLon = (b.lon - a.lon) * Math.PI/180;
  const la1 = a.lat * Math.PI/180;
  const la2 = b.lat * Math.PI/180;
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function getWildfiresNear(req, res) {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const radiusKm = Number(req.query.radius_km ?? 150); 

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "valid lat & lon required" });
    }
    // Fetch active wildfire events
    const url = "https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires";
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      return res.status(r.status).send(await r.text());
    }
    const json = await r.json();
    const events = Array.isArray(json?.events) ? json.events : [];

    const fires = [];
    for (const ev of events) {
      const geoms = Array.isArray(ev.geometry) ? ev.geometry : [];
      const latest = [...geoms].reverse().find(g => 
        Array.isArray(g.coordinates) &&
        typeof g.coordinates[0] === "number" &&
        typeof g.coordinates[1] === "number"
      );
      if (!latest) continue;

      const [lonEv, latEv] = latest.coordinates;
      const d = distKm({ lat, lon }, { lat: latEv, lon: lonEv });
      if (d <= radiusKm) {
        fires.push({
          id: ev.id,
          title: ev.title,
          date: latest.date,
          lat: latEv,
          lon: lonEv,
          distance_km: Math.round(d),
        });
      }
    }


    fires.sort((a, b) => a.distance_km - b.distance_km);
    return res.json({ count: fires.length, fires });
  } catch (e) {
    console.error("Wildfires proxy failed:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}