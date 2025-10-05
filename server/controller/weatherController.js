const GOOGLE_WEATHER_BASE = process.env.GOOGLE_WEATHER_BASE || "https://weather.googleapis.com";
const GOOGLE_GEOCODE_BASE = process.env.GOOGLE_GEOCODE_BASE || "https://maps.googleapis.com/maps/api/geocode/json";

// Compute Heat Index using the NWS (Rothfusz/Steadman) algorithm.
// Expects temperature in Celsius and relative humidity in percent (0-100).
// Returns Heat Index in Celsius. If undefined per NWS (< 26.7C/80F), returns the input temperature.
function computeHeatIndexC(tempC, humidityPercent) {
  if (tempC == null || humidityPercent == null) return null;
  const tF = (tempC * 9) / 5 + 32; // convert to Fahrenheit for the formula
  const rh = Number(humidityPercent);
  // If below threshold, many implementations return the original temperature
  if (tF < 80) return tempC;

  const HI =
    -42.379 +
    2.04901523 * tF +
    10.14333127 * rh +
    -0.22475541 * tF * rh +
    -0.00683783 * tF * tF +
    -0.05481717 * rh * rh +
    0.00122874 * tF * tF * rh +
    0.00085282 * tF * rh * rh +
    -0.00000199 * tF * tF * rh * rh;

  // Adjustments per NWS
  let adjustedHI = HI;
  if (rh < 13 && tF >= 80 && tF <= 112) {
    adjustedHI -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tF - 95)) / 17);
  } else if (rh > 85 && tF >= 80 && tF <= 87) {
    adjustedHI += ((rh - 85) / 10) * ((87 - tF) / 5);
  }

  // Convert back to Celsius
  const hiC = ((adjustedHI - 32) * 5) / 9;
  return Math.round(hiC * 10) / 10;
}

function buildSummary(json, units) {
  const cToF = (c) => (c * 9) / 5 + 32;
  const kmhToMph = (v) => v * 0.621371;
  const useImperial = String(units).toLowerCase() === "imperial";
  const cc = json || {};
  const tempC = cc?.temperature?.degrees ?? null;
  const feelsC = cc?.feelsLikeTemperature?.degrees ?? null;
  const windKmh = cc?.wind?.speed?.value ?? null;
  const gustKmh = cc?.wind?.gust?.value ?? null;
  const visibilityKm = cc?.visibility?.distance ?? null;
  const humidityPercent = cc?.relativeHumidity ?? null;

  const heatIndexC =
    tempC != null && humidityPercent != null
      ? computeHeatIndexC(Number(tempC), Number(humidityPercent))
      : null;

  return {
    time: cc?.currentTime ?? null,
    timeZone: cc?.timeZone?.id ?? null,
    isDaytime: cc?.isDaytime ?? null,
    description: cc?.weatherCondition?.description?.text ?? null,
    type: cc?.weatherCondition?.type ?? null,
    icon: cc?.weatherCondition?.iconBaseUri ?? null,
    temperature: useImperial && tempC != null ? Math.round(cToF(tempC) * 10) / 10 : tempC,
    temperatureUnit: useImperial ? "FAHRENHEIT" : (cc?.temperature?.unit ?? "CELSIUS"),
    feelsLike: useImperial && feelsC != null ? Math.round(cToF(feelsC) * 10) / 10 : feelsC,
    humidityPercent,
    heatIndex: useImperial && heatIndexC != null ? Math.round(cToF(heatIndexC) * 10) / 10 : heatIndexC,
    heatIndexUnit: useImperial ? "FAHRENHEIT" : "CELSIUS",
    wind: {
      direction: cc?.wind?.direction?.cardinal ?? null,
      degrees: cc?.wind?.direction?.degrees ?? null,
      speed: useImperial && windKmh != null ? Math.round(kmhToMph(windKmh) * 10) / 10 : windKmh,
      speedUnit: useImperial ? "MILES_PER_HOUR" : (cc?.wind?.speed?.unit ?? "KILOMETERS_PER_HOUR"),
      gust: useImperial && gustKmh != null ? Math.round(kmhToMph(gustKmh) * 10) / 10 : gustKmh,
    },
    visibility: useImperial && visibilityKm != null ? Math.round(visibilityKm * 0.621371 * 10) / 10 : visibilityKm,
    visibilityUnit: useImperial ? "MILES" : (cc?.visibility?.unit ?? "KILOMETERS"),
    pressureMillibars: cc?.airPressure?.meanSeaLevelMillibars ?? null,
    cloudCoverPercent: cc?.cloudCover ?? null,
    precipitationProbPercent: cc?.precipitation?.probability?.percent ?? null,
  };
}

export const getCurrentWeather = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon are required" });
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: "Server misconfiguration: GOOGLE_MAPS_API_KEY is not set." });
    }

    const params = new URLSearchParams({
      "location.latitude": String(lat),
      "location.longitude": String(lon),
      key: process.env.GOOGLE_MAPS_API_KEY,
    });
    const url = `${GOOGLE_WEATHER_BASE}/v1/currentConditions:lookup?${params.toString()}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Google Weather error", status: response.status, body: text });
    }

    let json = null;
    if (text) json = JSON.parse(text);
    const { format, units } = req.query;
    if (String(format).toLowerCase() === "summary") {
      return res.json(buildSummary(json, units));
    }

    return res.json(json);
  } catch (error) {
    console.error("Weather proxy failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getWeatherByAddress = async (req, res) => {
  try {
    const { address, format, units } = req.query;
    if (!address) return res.status(400).json({ error: "address is required" });
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: "Server misconfiguration: GOOGLE_MAPS_API_KEY is not set." });
    }

    const geoParams = new URLSearchParams({ address: String(address), key: process.env.GOOGLE_MAPS_API_KEY });
    const geoUrl = `${GOOGLE_GEOCODE_BASE}?${geoParams.toString()}`;
    const geoResp = await fetch(geoUrl);
    const geoJson = await geoResp.json();
    if (!geoResp.ok || !Array.isArray(geoJson.results) || geoJson.results.length === 0) {
      return res.status(404).json({ error: "address not found", providerStatus: geoJson?.status || geoResp.status });
    }
    const best = geoJson.results[0];
    const loc = best.geometry?.location;
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
      return res.status(404).json({ error: "no lat/lng for this address" });
    }

    const params = new URLSearchParams({
      "location.latitude": String(loc.lat),
      "location.longitude": String(loc.lng),
      key: process.env.GOOGLE_MAPS_API_KEY,
    });
    const url = `${GOOGLE_WEATHER_BASE}/v1/currentConditions:lookup?${params.toString()}`;
    const wxResp = await fetch(url, { headers: { Accept: "application/json" } });
    const wxText = await wxResp.text();
    if (!wxResp.ok) {
      return res.status(wxResp.status).json({ error: "Google Weather error", status: wxResp.status, body: wxText });
    }
    const wxJson = wxText ? JSON.parse(wxText) : {};

    if (String(format).toLowerCase() === "summary") {
      return res.json({
        address: best.formatted_address ?? address,
        location: { lat: loc.lat, lon: loc.lng },
        ...buildSummary(wxJson, units),
      });
    }

    return res.json({ address: best.formatted_address ?? address, location: { lat: loc.lat, lon: loc.lng }, raw: wxJson });
  } catch (error) {
    console.error("Weather by address failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
