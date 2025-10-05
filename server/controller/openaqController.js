const API_BASE = "https://api.openaq.org/v3";
const DEFAULT_RADIUS_METERS = 25000;
const MIN_RADIUS_METERS = 1000;
const MAX_RADIUS_METERS = 100000;
const HISTORY_WINDOWS_HOURS = [24, 72, 14 * 24, 30 * 24];

function sanitizeRadius(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return DEFAULT_RADIUS_METERS;
  }
  return Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, value));
}

function buildUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchOnce(url, headers, label, attempts) {
  try {
    const response = await fetch(url, { headers });
    const text = await response.text();
    const attempt = { label, status: response.status, ok: response.ok };
    if (!response.ok) {
      console.error(`[OpenAQ] ${label} error`, response.status, text);
      attempts?.push(attempt);
      return { ok: false, status: response.status, text };
    }
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[OpenAQ] Failed to parse JSON for ${label}`, parseError);
        attempts?.push({ ...attempt, ok: false, status: 502, error: "invalid-json" });
        return { ok: false, status: 502, text: "Invalid JSON from OpenAQ" };
      }
    }
    attempts?.push(attempt);
    return { ok: true, status: response.status, json };
  } catch (error) {
    console.error(`[OpenAQ] Network error for ${label}:`, error);
    attempts?.push({ label, status: 500, ok: false, error: "network-error" });
    return { ok: false, status: 500, text: "Network error" };
  }
}

export const fetchAQI = async (req, res) => {
  console.log("---HITTING FETCH AQI---");
  const attempts = [];
  try {
    if (!process.env.OPENAQ_API_KEY) {
      return res.status(500).json({
        error: "Server misconfiguration: OPENAQ_API_KEY is not set.",
      });
    }

    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon are required" });
    }

    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return res.status(400).json({ error: "invalid lat/lon" });
    }
    console.log("[OpenAQ] coords (lat, lon):", latNum, lonNum);

    const radiusMeters = sanitizeRadius(req.query.radius);
    const maxHoursOverride = Number(req.query.maxHours ?? req.query.hours);
    const historyWindows = [...HISTORY_WINDOWS_HOURS];
    if (Number.isFinite(maxHoursOverride) && maxHoursOverride > historyWindows[historyWindows.length - 1]) {
      historyWindows.push(Math.min(maxHoursOverride, 90 * 24)); // cap at 90 days
    }
    const latestLimit = 100;
    const measurementLimit = 1000;

    const headers = {
      "X-API-Key": process.env.OPENAQ_API_KEY,
      Accept: "application/json",
    };
    if (process.env.OPENAQ_USER_AGENT) {
      headers["User-Agent"] = process.env.OPENAQ_USER_AGENT;
    }

    const coordsParam = `${latNum},${lonNum}`;

    const sendSuccess = (remote, metaExtras = {}) => {
      const remoteJson = remote?.json || {};
      const { meta: remoteMeta, ...rest } = remoteJson;
      return res.json({
        ...rest,
        meta: { ...(remoteMeta || {}), ...metaExtras, attempts },
      });
    };

    const latestCoordsUrl = buildUrl("/latest", {
      coordinates: coordsParam,
      radius: radiusMeters,
      limit: latestLimit,
    });
    const latestCoords = await fetchOnce(
      latestCoordsUrl,
      headers,
      "v3 latest by coordinates",
      attempts
    );
    if (latestCoords.ok) {
      return sendSuccess(latestCoords, {
        source: "v3-latest-coordinates",
        radius: radiusMeters,
      });
    }

    const locationsUrl = buildUrl("/locations", {
      coordinates: coordsParam,
      radius: radiusMeters,
      limit: 10,
      order_by: "distance",
    });
    const locations = await fetchOnce(
      locationsUrl,
      headers,
      "v3 locations by coordinates",
      attempts
    );
    const locs =
      locations.ok && Array.isArray(locations.json?.results)
        ? locations.json.results
        : [];
    locs.sort(
      (a, b) =>
        (a?.distance ?? Number.POSITIVE_INFINITY) -
        (b?.distance ?? Number.POSITIVE_INFINITY)
    );
    const nearest = locs.find(
      (item) => item && Number.isFinite(item.distance) && item.id
    );

    if (nearest?.id) {
      const latestNearestUrl = buildUrl("/latest", {
        location_id: nearest.id,
        limit: latestLimit,
      });
      const latestNearest = await fetchOnce(
        latestNearestUrl,
        headers,
        `v3 latest by location ${nearest.id}`,
        attempts
      );
      if (latestNearest.ok) {
        return sendSuccess(latestNearest, {
          source: "v3-latest-location",
          locationId: nearest.id,
          locationName: nearest.name ?? null,
          nearestDistance: nearest.distance ?? null,
        });
      }

      for (const hours of historyWindows) {
        const dateFrom = new Date(Date.now() - hours * 3600 * 1000).toISOString();
        const measurementsNearestUrl = buildUrl("/measurements", {
          location_id: nearest.id,
          date_from: dateFrom,
          limit: measurementLimit,
          order_by: "datetime",
          sort: "desc",
        });
        const measurementsNearest = await fetchOnce(
          measurementsNearestUrl,
          headers,
          `v3 measurements by location ${nearest.id} (${hours}h)` ,
          attempts
        );
        if (measurementsNearest.ok) {
          return sendSuccess(measurementsNearest, {
            source: "v3-measurements-location",
            locationId: nearest.id,
            locationName: nearest.name ?? null,
            nearestDistance: nearest.distance ?? null,
            lookbackHours: hours,
          });
        }
      }
    }

    for (const hours of historyWindows) {
      const dateFrom = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const measurementsCoordsUrl = buildUrl("/measurements", {
        coordinates: coordsParam,
        radius: radiusMeters,
        date_from: dateFrom,
        limit: measurementLimit,
        order_by: "datetime",
        sort: "desc",
      });
      const measurementsCoords = await fetchOnce(
        measurementsCoordsUrl,
        headers,
        `v3 measurements by coordinates (${hours}h)` ,
        attempts
      );
      if (measurementsCoords.ok) {
        return sendSuccess(measurementsCoords, {
          source: "v3-measurements-coordinates",
          radius: radiusMeters,
          lookbackHours: hours,
        });
      }
    }

    // Auto-escalate radius and retry once or twice before giving up
    if (radiusMeters < MAX_RADIUS_METERS) {
      const largerRadius = Math.min(MAX_RADIUS_METERS, Math.max(2 * radiusMeters, 50000));
      const nextReq = { ...req, query: { ...req.query, radius: String(largerRadius) } };
      console.log(`[OpenAQ] No data found, retrying with larger radius: ${largerRadius}m`);
      return await fetchAQI(nextReq, res);
    }

    return res.status(404).json({
      error: "No recent OpenAQ data found near these coordinates.",
      attempts,
    });
  } catch (error) {
    console.error("OpenAQ proxy failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};







