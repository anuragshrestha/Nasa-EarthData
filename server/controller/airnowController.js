import AdmZip from "adm-zip";

const API_BASE = "https://www.airnowapi.org/aq/data/";
const DEFAULT_PARAMETERS = "PM25,OZONE";
const DEFAULT_DATA_TYPE = "A";
const MAX_HOURS = 24;

function pad(num) {
  return num.toString().padStart(2, "0");
}

function clampHours(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.min(Math.max(1, Math.floor(num)), MAX_HOURS);
}

function formatHourUtc(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}`;
}

function parseBbox(raw) {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4) return null;
  const [west, south, east, north] = parts;
  if (![west, south, east, north].every(Number.isFinite)) return null;
  return { west, south, east, north };
}

function buildUrl({ start, end, bbox, parameters, dataType, verbose, monitorType }) {
  const url = new URL(API_BASE);
  url.searchParams.set("startDate", start);
  url.searchParams.set("endDate", end);
  url.searchParams.set("parameters", parameters);
  url.searchParams.set("BBOX", `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`);
  url.searchParams.set("dataType", dataType);
  url.searchParams.set("format", "application/json");
  if (verbose != null) {
    url.searchParams.set("verbose", String(verbose ? 1 : 0));
  }
  if (monitorType != null) {
    url.searchParams.set("monitorType", String(monitorType));
  }
  return url;
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const category = entry.Category || {};
  const parameterName = entry.Parameter || entry.ParameterName || entry.Pollutant || null;
  const lat = Number(entry.Latitude ?? entry.latitude);
  const lon = Number(entry.Longitude ?? entry.longitude);
  const aqi = Number(entry.AQI ?? entry.aqi);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(aqi)) {
    return null;
  }
  return {
    lat,
    lon,
    aqi,
    parameter: parameterName,
    reportingArea: entry.ReportingArea ?? null,
    stateCode: entry.StateCode ?? entry.State ?? null,
    categoryNumber: category.Number ?? category.CategoryNumber ?? null,
    categoryName: category.Name ?? category.CategoryName ?? null,
    dateObserved: entry.DateObserved ?? null,
    hourObserved: entry.HourObserved ?? null,
    localTimeZone: entry.LocalTimeZone ?? null,
    raw: entry,
  };
}

export const getAirNowData = async (req, res) => {
  try {
    const apiKey = process.env.AIRNOW_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server misconfiguration: AIRNOW_API_KEY is not set." });
    }

    const bbox = parseBbox(req.query.bbox);
    if (!bbox) {
      return res.status(400).json({ error: "bbox query parameter must be west,south,east,north" });
    }

    const hours = clampHours(req.query.hours ?? 1);
    const now = new Date();
    const endHourUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
    const startHourUtc = new Date(endHourUtc.getTime() - hours * 3600 * 1000);

    const parameters = (req.query.parameters || DEFAULT_PARAMETERS).toString();
    const dataType = (req.query.dataType || DEFAULT_DATA_TYPE).toString();
    const verbose = req.query.verbose === undefined ? 0 : Number(req.query.verbose) ? 1 : 0;
    const monitorType = req.query.monitorType ?? 0;

    const url = buildUrl({
      start: formatHourUtc(startHourUtc),
      end: formatHourUtc(endHourUtc),
      bbox,
      parameters,
      dataType,
      verbose,
      monitorType,
    });
    url.searchParams.set("API_KEY", apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: "AirNow API error",
        status: response.status,
        body: text,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return res.json({ points: [], meta: { count: 0, bbox, hours, parameters, dataType } });
    }

    const zip = new AdmZip(Buffer.from(arrayBuffer));
    const entries = zip.getEntries();
    if (!entries.length) {
      return res.json({ points: [], meta: { count: 0, bbox, hours, parameters, dataType } });
    }

    let jsonText = null;
    for (const entry of entries) {
      if (!entry?.entryName) continue;
      if (entry.entryName.toLowerCase().endsWith(".json")) {
        jsonText = entry.getData().toString("utf8");
        break;
      }
    }
    if (!jsonText) {
      // fallback: use first entry as text
      jsonText = entries[0].getData().toString("utf8");
    }

    let parsed = null;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      return res.status(502).json({ error: "AirNow JSON parse error", details: String(error) });
    }

    const points = Array.isArray(parsed)
      ? parsed.map((entry) => normalizeEntry(entry)).filter(Boolean)
      : [];

    return res.json({
      points,
      meta: {
        count: points.length,
        bbox,
        hours,
        parameters,
        dataType,
        source: "airnow",
      },
    });
  } catch (error) {
    console.error("AirNow proxy failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

