export async function fetchWildfiresGeoJSON(
  { bbox, days = 14, limit = 200, status = "open" } = {},
  { signal } = {}
) {
  const url = new URL("https://eonet.gsfc.nasa.gov/api/v3/events/geojson");
  url.searchParams.set("category", "wildfires");
  url.searchParams.set("status", status);
  url.searchParams.set("days", String(days));
  url.searchParams.set("limit", String(limit));
  if (bbox) url.searchParams.set("bbox", bbox); // EONET bbox is minLon,maxLat,maxLon,minLat

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`EONET error ${res.status}`);
  return res.json(); // GeoJSON FeatureCollection
}
