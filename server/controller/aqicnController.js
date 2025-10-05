const API_BASE = "https://api.waqi.info";
const DEFAULT_CITIES = [
  { id: "los-angeles", query: "Los Angeles", name: "Los Angeles, CA", coords: { lat: 34.0522, lon: -118.2437 } },
  { id: "new-york", query: "New York", name: "New York, NY", coords: { lat: 40.7128, lon: -74.006 } },
  { id: "chicago", query: "Chicago", name: "Chicago, IL", coords: { lat: 41.8781, lon: -87.6298 } },
  { id: "houston", query: "Houston", name: "Houston, TX", coords: { lat: 29.7604, lon: -95.3698 } },
  { id: "phoenix", query: "Phoenix", name: "Phoenix, AZ", coords: { lat: 33.4484, lon: -112.074 } },
  { id: "seattle", query: "Seattle", name: "Seattle, WA", coords: { lat: 47.6062, lon: -122.3321 } },
  { id: "denver", query: "Denver", name: "Denver, CO", coords: { lat: 39.7392, lon: -104.9903 } },
  { id: "atlanta", query: "Atlanta", name: "Atlanta, GA", coords: { lat: 33.749, lon: -84.388 } },
  { id: "miami", query: "Miami", name: "Miami, FL", coords: { lat: 25.7617, lon: -80.1918 } },
  { id: "boston", query: "Boston", name: "Boston, MA", coords: { lat: 42.3601, lon: -71.0589 } },
  { id: "minneapolis", query: "Minneapolis", name: "Minneapolis, MN", coords: { lat: 44.9778, lon: -93.265 } },
  { id: "san-francisco", query: "San Francisco", name: "San Francisco, CA", coords: { lat: 37.7749, lon: -122.4194 } },
  { id: "philadelphia", query: "Philadelphia", name: "Philadelphia, PA", coords: { lat: 39.9526, lon: -75.1652 } },
  { id: "detroit", query: "Detroit", name: "Detroit, MI", coords: { lat: 42.3314, lon: -83.0458 } },
];

function buildUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function categoryFromAqi(aqi) {
  if (!Number.isFinite(aqi)) return { label: "Unknown", band: "unknown" };
  if (aqi <= 50) return { label: "Good", band: "good" };
  if (aqi <= 100) return { label: "Moderate", band: "moderate" };
  if (aqi <= 150) return { label: "Unhealthy for SG", band: "usg" };
  if (aqi <= 200) return { label: "Unhealthy", band: "unhealthy" };
  if (aqi <= 300) return { label: "Very Unhealthy", band: "very-unhealthy" };
  return { label: "Hazardous", band: "hazardous" };
}

function pm25ToAqi(pm25) {
  if (!Number.isFinite(pm25) || pm25 < 0) return null;
  const ranges = [
    { Cl: 0.0, Ch: 12.0, Il: 0, Ih: 50 },
    { Cl: 12.1, Ch: 35.4, Il: 51, Ih: 100 },
    { Cl: 35.5, Ch: 55.4, Il: 101, Ih: 150 },
    { Cl: 55.5, Ch: 150.4, Il: 151, Ih: 200 },
    { Cl: 150.5, Ch: 250.4, Il: 201, Ih: 300 },
    { Cl: 250.5, Ch: 500.4, Il: 301, Ih: 500 },
  ];
  for (const range of ranges) {
    if (pm25 >= range.Cl && pm25 <= range.Ch) {
      return Math.round(((range.Ih - range.Il) / (range.Ch - range.Cl)) * (pm25 - range.Cl) + range.Il);
    }
  }
  return 500;
}

async function fetchAqicnCity(city, token) {
  const url = buildUrl(`/feed/${encodeURIComponent(city.query)}/`, { token });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`AQICN HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload?.status !== "ok") {
    throw new Error(payload?.data ?? "AQICN error");
  }
  const data = payload.data || {};
  const aqi = Number(data.aqi);
  const category = categoryFromAqi(aqi);
  const cityName = data?.city?.name || city.name;
  const dominant = data?.dominentpol || null;
  const station = data?.city?.url || null;
  return {
    id: city.id,
    name: cityName,
    aqi,
    category,
    dominant,
    station,
    source: "aqicn",
    raw: {
      attribution: data?.attributions || [],
      time: data?.time || null,
    },
  };
}

async function fetchOpenAqCity(city, openaqKey) {
  if (!openaqKey || !city?.coords) return null;
  const { lat, lon } = city.coords;
  const url = new URL("https://api.openaq.org/v3/latest");
  url.searchParams.set("coordinates", `${lat},${lon}`);
  url.searchParams.set("radius", "25000");
  url.searchParams.set("limit", "5");
  url.searchParams.set("parameter", "pm25");

  const response = await fetch(url, {
    headers: {
      "X-API-Key": openaqKey,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`OpenAQ HTTP ${response.status}`);
  }
  const payload = await response.json();
  const result = Array.isArray(payload?.results) ? payload.results[0] : null;
  if (!result) {
    throw new Error("OpenAQ no results");
  }
  const measurement = Array.isArray(result?.measurements) ? result.measurements.find((m) => (m?.parameter || '').toLowerCase() === 'pm25') : null;
  const pm25 = Number(measurement?.value);
  const aqi = pm25ToAqi(pm25);
  if (!Number.isFinite(aqi)) {
    throw new Error("OpenAQ missing PM2.5 value");
  }
  const category = categoryFromAqi(aqi);
  return {
    id: city.id,
    name: city.name,
    aqi,
    category,
    dominant: 'PM2.5',
    station: result?.location || null,
    source: "openaq",
    raw: {
      pm25,
      unit: measurement?.unit || null,
      fetched: result?.date?.utc || null,
    },
  };
}

let cache = { data: null, expiresAt: 0 };

export async function getUsRankings(req, res) {
  const token = process.env.AQICN_API_TOKEN;
  const openaqKey = process.env.OPENAQ_API_KEY;
  if (!token) {
    return res.status(500).json({ error: "Server misconfiguration: AQICN_API_TOKEN missing" });
  }

  const now = Date.now();
  if (cache.data && cache.expiresAt > now) {
    return res.json({ ...cache.data, meta: { cached: true, expiresAt: cache.expiresAt } });
  }

  const cities = Array.isArray(req.query.cities)
    ? req.query.cities
        .map((id) => DEFAULT_CITIES.find((item) => item.id === id))
        .filter(Boolean)
    : DEFAULT_CITIES;

  const limit = Math.max(1, Math.min(10, Number(req.query.limit) || 5));

  const results = await Promise.allSettled(
    cities.map(async (city) => {
      try {
        const primary = await fetchAqicnCity(city, token);
        return primary;
      } catch (primaryError) {
        console.warn(`AQICN fetch failed for ${city.id}:`, primaryError?.message);
        try {
          const fallback = await fetchOpenAqCity(city, openaqKey);
          if (fallback) return fallback;
        } catch (fallbackError) {
          console.warn(`OpenAQ fallback failed for ${city.id}:`, fallbackError?.message);
        }
        throw primaryError;
      }
    })
  );

  const successful = results
    .filter((entry) => entry.status === "fulfilled")
    .map((entry) => entry.value)
    .filter((item) => Number.isFinite(item.aqi));

  if (!successful.length) {
    console.warn("AQICN: no successful city fetches", results);
    return res.status(502).json({ error: "Unable to retrieve AQI rankings from AQICN" });
  }

  successful.sort((a, b) => b.aqi - a.aqi);
  const worst = successful.slice(0, limit);
  const best = [...successful].sort((a, b) => a.aqi - b.aqi).slice(0, limit);

  const data = {
    worst,
    best,
    fetchedAt: now,
    source: "aqicn",
  };

  cache = {
    data,
    expiresAt: now + 10 * 60 * 1000,
  };

  return res.json({ ...data, meta: { cached: false, expiresAt: cache.expiresAt } });
}

export function clearAqicnCache() {
  cache = { data: null, expiresAt: 0 };
}
