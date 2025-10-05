const NINJA_NEWS_URL = "https://api.api-ninjas.com/v1/news";
const NINJA_GEOCODE_URL = "https://api.api-ninjas.com/v1/geocoding";
const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events/geojson";

function clampLimit(raw, fallback = 6) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(10, Math.max(1, Math.floor(value)));
}

function badgeFromMagnitude(magnitude) {
  if (!Number.isFinite(magnitude)) {
    return { label: "Active", className: "badge" };
  }
  if (magnitude >= 100000) return { label: "Extreme", className: "badge warn" };
  if (magnitude >= 25000) return { label: "High", className: "badge bad" };
  if (magnitude >= 5000) return { label: "Elevated", className: "badge" };
  return { label: "Active", className: "badge" };
}

function normalizeNinjaArticle(article) {
  if (!article || typeof article !== "object") return null;
  const title = article.title || article.headline || article.summary || null;
  if (!title) return null;
  const link = article.link || article.url || article.article_url || null;
  const sourceName = article.source || article.author || article.clean_url || null;
  const published = article.published_date || article.pub_date || article.date || article.published_at || null;
  const locationParts = [];
  const city = article.city || article.location_city || null;
  const state = article.state || article.location_state || null;
  const country = article.country || article.location_country || article.locale || null;
  if (city) locationParts.push(city);
  if (state) locationParts.push(state);
  if (country) locationParts.push(country);
  const location = locationParts.join(", ") || article.location || null;

  return {
    id: article.id || article.uuid || link || title,
    title,
    summary: article.summary || article.description || "",
    link,
    sourceName: sourceName || "News Feed",
    publishedAt: published,
    location,
    badge: { label: "Update", className: "badge" },
    rawLocation: { city, state, country, original: article.location || null },
  };
}

async function geocodeWithNinjas(article, apiKey) {
  if (!article) return null;
  const params = new URLSearchParams();
  if (article.rawLocation?.city) params.set("city", article.rawLocation.city);
  const stateOrRegion = article.rawLocation?.state || null;
  if (stateOrRegion) params.set("state", stateOrRegion);
  const country = article.rawLocation?.country || (stateOrRegion ? "US" : null);
  if (country) params.set("country", country);

  if (!params.has("city") && article.location) {
    params.set("city", article.location);
  }

  if (!params.has("city")) return null;

  const geoUrl = `${NINJA_GEOCODE_URL}?${params.toString()}`;
  const response = await fetch(geoUrl, {
    headers: {
      "X-Api-Key": apiKey,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Geocoding HTTP ${response.status}`);
  }
  const json = await response.json();
  if (!Array.isArray(json) || !json.length) return null;
  const result = json[0];
  const lat = Number(result.latitude);
  const lon = Number(result.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function fetchNinjaNews(apiKey, { keyword, country, limit }) {
  const params = new URLSearchParams();
  params.set("keyword", keyword || "wildfire");
  if (country) params.set("country", country);
  params.set("language", "en");
  params.set("limit", String(limit));

  const url = `${NINJA_NEWS_URL}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      "X-Api-Key": apiKey,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`API Ninjas news HTTP ${response.status}`);
  }
  const payload = await response.json();
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.articles)
      ? payload.articles
      : [];
  return items
    .map(normalizeNinjaArticle)
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeEonetFeature(feature) {
  const props = feature?.properties || {};
  const geom = feature?.geometry || {};
  const badge = badgeFromMagnitude(Number(props.magnitudeValue));
  const sources = Array.isArray(props.sources) ? props.sources : [];
  const primarySource = sources.find((s) => s?.url) || sources[0] || null;
  const link = primarySource?.url || props.link || null;
  const location = props.title || null;
  const coords = geom.type === "Point" && Array.isArray(geom.coordinates)
    ? { lat: Number(geom.coordinates[1]), lon: Number(geom.coordinates[0]) }
    : null;

  return {
    id: props.id || feature?.id,
    title: props.title || "Wildfire Event",
    summary: props.description || "",
    link,
    sourceName: primarySource?.id || primarySource?.url || "EONET",
    publishedAt: props.date || null,
    location,
    badge,
    coordinates: coords,
  };
}

async function fetchEonetFallback(limit) {
  const url = new URL(EONET_URL);
  url.searchParams.set("category", "wildfires");
  url.searchParams.set("status", "open");
  url.searchParams.set("days", "14");
  url.searchParams.set("limit", String(Math.min(limit * 2, 20)));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`EONET HTTP ${response.status}`);
  }
  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];
  return features
    .map(normalizeEonetFeature)
    .filter(Boolean)
    .slice(0, limit);
}

const newsCache = { data: null, expiresAt: 0 };

export async function getWildfireNews(req, res) {
  try {
    const apiKey = process.env.API_NINJAS_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server misconfiguration: API_NINJAS_KEY is missing." });
    }

    const limit = clampLimit(req.query.limit, 6);
    const keyword = req.query.keyword || "wildfire";
    const country = req.query.country || "us";

    const now = Date.now();
    if (newsCache.data && newsCache.expiresAt > now && keyword === newsCache.data.keyword) {
      return res.json({ ...newsCache.data.payload, meta: { cached: true, expiresAt: newsCache.expiresAt } });
    }

    let articles = [];
    let source = "api-ninjas";
    try {
      articles = await fetchNinjaNews(apiKey, { keyword, country, limit });
    } catch (error) {
      console.warn("API Ninjas news fetch failed:", error?.message || error);
    }

    if (articles.length) {
      const enriched = [];
      for (const article of articles) {
        let coordinates = null;
        try {
          coordinates = await geocodeWithNinjas(article, apiKey);
        } catch (geoError) {
          console.warn("Geocoding failed for", article.location, geoError?.message || geoError);
        }
        enriched.push({
          ...article,
          coordinates,
        });
      }
      articles = enriched;
    }

    if (!articles.length) {
      try {
        articles = await fetchEonetFallback(limit);
        source = "eonet";
      } catch (fallbackError) {
        console.error("EONET fallback failed:", fallbackError);
        return res.status(502).json({ error: "Unable to retrieve wildfire updates at this time." });
      }
    }

    const payload = {
      articles,
      meta: {
        source,
        fetchedAt: now,
      },
    };

    newsCache.data = { keyword, payload };
    newsCache.expiresAt = now + 5 * 60 * 1000;

    return res.json({ ...payload, meta: { ...payload.meta, cached: false, expiresAt: newsCache.expiresAt } });
  } catch (error) {
    console.error("Wildfire news endpoint failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export function clearWildfireNewsCache() {
  newsCache.data = null;
  newsCache.expiresAt = 0;
}
