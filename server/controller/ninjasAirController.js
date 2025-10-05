const API_BASE = "https://api.api-ninjas.com/v1/airquality";

function buildUrl(params) {
  const url = new URL(API_BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
  });
  return url.toString();
}

export const getAirQualityNinjas = async (req, res) => {
  try {
    const apiKey = process.env.API_NINJAS_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server misconfiguration: API_NINJAS_KEY is not set." });
    }

    const { lat, lon, city, state, country } = req.query;
    let params = {};
    if (city) {
      params = { city, state, country };
    } else if (lat && lon) {
      const latNum = Number(lat);
      const lonNum = Number(lon);
      if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
        return res.status(400).json({ error: "invalid lat/lon" });
      }
      params = { lat: latNum, lon: lonNum };
    } else {
      return res.status(400).json({ error: "Provide either city or lat/lon" });
    }

    const url = buildUrl(params);
    const response = await fetch(url, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    });
    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({ error: "API Ninjas error", status: response.status, body: text });
    }
    const json = text ? JSON.parse(text) : {};

    const normalized = {
      overallAQI: json?.overall_aqi ?? null,
      pollutants: {
        co: json?.CO ?? null,
        no2: json?.NO2 ?? null,
        o3: json?.O3 ?? null,
        so2: json?.SO2 ?? null,
        pm25: json?.["PM2.5"] ?? null,
        pm10: json?.PM10 ?? null,
      },
    };

    return res.json({ normalized, raw: json });
  } catch (error) {
    console.error("API Ninjas Air Quality proxy failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


