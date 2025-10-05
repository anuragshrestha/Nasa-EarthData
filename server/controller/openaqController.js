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
    if (text) {
      json = JSON.parse(text);
    }
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
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon are required" });
    }
    console.log("[OpenAQ] coords (lat,lon):", lat, lon);

    const v3Headers = {
      "X-API-Key": process.env.OPENAQ_API_KEY,
    };

    const coordinates = `${lat},${lon}`;
    const locationsUrl =
      `https://api.openaq.org/v3/locations?coordinates=${enc(coordinates)}` +
      `&radius=25000&limit=10`;

    const locationsResult = await fetchOnce(
      locationsUrl,
      v3Headers,
      "v3 find nearby locations"
    );

    if (!locationsResult.ok || !locationsResult.json?.results?.length) {
      return res
        .status(404)
        .json({
          error:
            "Could not find any monitoring stations near these coordinates.",
        });
    }

    const sortedLocations = locationsResult.json.results.sort(
      (a, b) => a.distance - b.distance
    );
    const nearestLocation = sortedLocations[0];

    console.log(
      `[OpenAQ] Found nearest location: ${nearestLocation.name} (ID: ${nearestLocation.id}) at ${nearestLocation.distance}m`
    );

    const dateFrom = new Date(new Date().getTime() - 10 * 60 * 60 * 1000);

    console.log("Date from: ", dateFrom.toISOString());

    const measurementsUrl =
      `https://api.openaq.org/v3/measurements?location_id=${nearestLocation.id}` +
      `&date_from=${enc(dateFrom.toISOString())}` +
      `&limit=1000&order_by=datetime&sort=desc`;

    const measurementsResult = await fetchOnce(
      measurementsUrl,
      v3Headers,
      "v3 get measurements for location"
    );

    if (measurementsResult.ok) {
      return res.json({
        meta: {
          source: "v3-location-measurements-24h",
          locationId: nearestLocation.id,
          locationName: nearestLocation.name,
        },
        ...measurementsResult.json,
      });
    } else {
      return res.status(measurementsResult.status).json({
        error: "Found a station, but could not fetch its measurements.",
        message: measurementsResult.text,
      });
    }
  } catch (e) {
    console.error("OpenAQ proxy failed:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};
