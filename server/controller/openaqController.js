const enc = encodeURIComponent;

async function fetchOnce(url, headers, label) {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[OpenAQ] ${label} error`, res.status, text);
      return { ok: false, status: res.status, text };
    }
    let json = null;
    if (text) json = JSON.parse(text);
    return { ok: true, status: res.status, json };
  } catch (e) {
    console.error(`[OpenAQ] Network error for ${label}:`, e);
    return { ok: false, status: 500, text: "Network error" };
  }
}

export const fetchAQI = async (req, res) => {
  console.log("---HITTING FETCH AQI---");
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "lat and lon are required" });

    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return res.status(400).json({ error: "invalid lat/lon" });
    }
    console.log("[OpenAQ] coords (lat,lon):", latNum, lonNum);

    const headers = {
      "X-API-Key": process.env.OPENAQ_API_KEY,
      "Accept": "application/json",
    };

    const coords = `${latNum},${lonNum}`;

   
    const latestCoordsUrl = `https://api.openaq.org/v3/latest?coordinates=${enc(coords)}&radius=25000&limit=100`;
    const latestCoords = await fetchOnce(latestCoordsUrl, headers, "v3 latest by coords");
    if (latestCoords.ok) {
      return res.json({ meta: { source: "v3-latest-coords", radius: 25000 }, ...latestCoords.json });
    }

    
    const locationsUrl = `https://api.openaq.org/v3/locations?coordinates=${enc(coords)}&radius=25000&limit=10`;
    const locations = await fetchOnce(locationsUrl, headers, "v3 locations by coords");
    const locs = locations.ok && Array.isArray(locations.json?.results) ? locations.json.results : [];
    locs.sort((a, b) => (a?.distance ?? Infinity) - (b?.distance ?? Infinity));
    const nearest = locs[0];

    if (nearest?.id) {
      const latestLocUrl = `https://api.openaq.org/v3/latest?location_id=${nearest.id}&limit=100`;
      const latestLoc = await fetchOnce(latestLocUrl, headers, `v3 latest by location_id=${nearest.id}`);
      if (latestLoc.ok) {
        return res.json({ meta: { source: "v3-latest-location", locationId: nearest.id, locationName: nearest.name, nearestDistance: nearest.distance }, ...latestLoc.json });
      }

     
      const hours = [24, 72, 14 * 24, 30 * 24];
      for (const h of hours) {
        const dateFrom = new Date(Date.now() - h * 3600 * 1000).toISOString();
        const measLocUrl = `https://api.openaq.org/v3/measurements?location_id=${nearest.id}&date_from=${enc(dateFrom)}&limit=1000&order_by=datetime&sort=desc`;
        const measLoc = await fetchOnce(measLocUrl, headers, `v3 measurements by location_id=${nearest.id} (${h}h)`);
        if (measLoc.ok) {
          return res.json({ meta: { source: "v3-measurements-location", hours: h, locationId: nearest.id, locationName: nearest.name, nearestDistance: nearest.distance }, ...measLoc.json });
        }
      }
    }

    
    const hours2 = [24, 72, 14 * 24, 30 * 24];
    for (const h of hours2) {
      const dateFrom = new Date(Date.now() - h * 3600 * 1000).toISOString();
      const measCoordsUrl = `https://api.openaq.org/v3/measurements?coordinates=${enc(coords)}&radius=25000&date_from=${enc(dateFrom)}&limit=1000&order_by=datetime&sort=desc`;
      const measCoords = await fetchOnce(measCoordsUrl, headers, `v3 measurements by coords (${h}h)`);
      if (measCoords.ok) {
        return res.json({ meta: { source: "v3-measurements-coords", hours: h, radius: 25000 }, ...measCoords.json });
      }
    }


    return res.status(404).json({
      error: "No recent OpenAQ data found near these coordinates.",
      attempted: [
        "latest by coords (25km)",
        "latest by nearest location_id",
        "measurements by location_id (24h→30d)",
        "measurements by coords (24h→30d)"
      ]
    });
  } catch (e) {
    console.error("OpenAQ proxy failed:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};
