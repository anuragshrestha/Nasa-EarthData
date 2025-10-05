import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";

export default function WorldMap({ center, zoomOnSelect = 11 }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const abortRef = useRef(null);

  const overlaysRef = useRef([]);
  const wildfireOverlaysRef = useRef([]);

  const USA_CENTROID = { lat: 39.8283, lng: -98.5795 };
  const NA_BOUNDS_COORDS = {
    sw: { lat: 5, lng: -168 },
    ne: { lat: 83, lng: -52 },
  };

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapElRef.current || !window.google?.maps) return;

        mapRef.current = new google.maps.Map(mapElRef.current, {
          mapTypeId: "hybrid",
          disableDefaultUI: true,
          gestureHandling: "greedy",
          backgroundColor: "#00132b",
        });

        // Default: show the whole North America
        if (!center) {
          const b = new google.maps.LatLngBounds(
            new google.maps.LatLng(
              NA_BOUNDS_COORDS.sw.lat,
              NA_BOUNDS_COORDS.sw.lng
            ),
            new google.maps.LatLng(
              NA_BOUNDS_COORDS.ne.lat,
              NA_BOUNDS_COORDS.ne.lng
            )
          );
          mapRef.current.fitBounds(b);
          fetchAndDrawNearby(USA_CENTROID);
          fetchAndDrawWildfires(USA_CENTROID, 800);
        } else {
          mapRef.current.setCenter(center);
          mapRef.current.setZoom(zoomOnSelect);
          fetchAndDrawWildfires({ lat, lng }, 200);
        }

        setReady(true);
      })
      .catch((err) => console.error("Maps JS failed to load:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Update marker + regional AQI dots when a user picks a location
  useEffect(() => {
    if (!ready || !center || !mapRef.current) return;

    const lat = parseFloat(center.lat);
    const lng = parseFloat(center.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn("WorldMap: invalid center", center);
      return;
    }

    const pos = new google.maps.LatLng(lat, lng);
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        title: "Selected location",
        animation: google.maps.Animation.DROP,
      });
    } else {
      markerRef.current.setPosition(pos);
      if (markerRef.current.getIcon()) markerRef.current.setIcon(null);
    }

    mapRef.current.panTo(pos);
    setTimeout(() => mapRef.current.setZoom(zoomOnSelect), 150);

    fetchAndDrawNearby({ lat, lng });
  }, [center, ready, zoomOnSelect]);

  function clearWildfires() {
    for (const m of wildfireOverlaysRef.current) m.setMap && m.setMap(null);
    wildfireOverlaysRef.current = [];
  }

  function apiBase() {
    return import.meta.env.MODE === "development"
      ? `http://localhost:4000`
      : import.meta.env.VITE_API_URL;
  }

  function clearOverlays() {
    for (const o of overlaysRef.current) o.setMap && o.setMap(null);
    overlaysRef.current = [];
  }

  async function fetchAndDrawNearby(pt) {
    try {
      if (abortRef.current) abortRef.current.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;

      const url =
        `${apiBase()}/api/airnow/nearby?` +
        `lat=${encodeURIComponent(pt.lat)}&lon=${encodeURIComponent(pt.lng)}` +
        `&radius=100&spread=150&limit=25`;

      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) {
        clearOverlays();
        return;
      }
      const data = await res.json();
      const locs = Array.isArray(data?.locations) ? data.locations : [];
      clearOverlays();

      for (const loc of locs) {
        const circle = new google.maps.Circle({
          map: mapRef.current,
          center: new google.maps.LatLng(loc.lat, loc.lon),
          radius: 8000,
          strokeOpacity: 0,
          fillColor: loc.color || "#777",
          fillOpacity: 0.35,
        });
        overlaysRef.current.push(circle);

        const labelMarker = new google.maps.Marker({
          position: { lat: loc.lat, lng: loc.lon },
          map: mapRef.current,
          title: `${loc.reportingArea}, ${loc.state} — AQI ${loc.aqi} (${loc.category})`,
          label: { text: String(loc.aqi ?? ""), className: "aqi-badge" },
        });
        overlaysRef.current.push(labelMarker);
      }

      if (markerRef.current && locs[0]) {
        markerRef.current.setLabel({
          text: String(locs[0].aqi ?? ""),
          className: "aqi-badge",
        });
        markerRef.current.setTitle(
          `${locs[0].reportingArea}, ${locs[0].state} — AQI ${locs[0].aqi} (${locs[0].category})`
        );
      }
    } catch (e) {
      console.warn("AQI nearby fetch failed", e);
      clearOverlays();
    }
  }

  //fetches and draws wildfire icon for every wildfires around
  async function fetchAndDrawWildfires(center, radiusKm = 150) {
    try {
      const url = `${apiBase()}/api/wildfires?lat=${encodeURIComponent(
        center.lat
      )}&lon=${encodeURIComponent(center.lng)}&radius_km=${radiusKm}`;
      const r = await fetch(url);
      if (!r.ok) {
        clearWildfires();
        return;
      }
      const data = await r.json();
      const fires = Array.isArray(data?.fires) ? data.fires : [];
      clearWildfires();

      const TRANSPARENT_ICON = {
        url: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
        size: new google.maps.Size(1, 1),
        scaledSize: new google.maps.Size(1, 1),
        anchor: new google.maps.Point(0, 0),
        labelOrigin: new google.maps.Point(0, 0),
      };

      for (const f of fires) {
        const marker = new google.maps.Marker({
          position: { lat: f.lat, lng: f.lon },
          map: mapRef.current,
          icon: TRANSPARENT_ICON,
          label: {
            text: "🔥",
            fontSize: "22px",
          },
          title: `${f.title} • ${f.distance_km} km • ${new Date(
            f.date
          ).toLocaleString()}`,
        });
        wildfireOverlaysRef.current.push(marker);
      }
    } catch (e) {
      console.warn("Wildfire fetch failed", e);
      clearWildfires();
    }
  }

  return (
    <div className="map-inner">
      <div
        ref={mapElRef}
        style={{ width: "100%", height: "100%", borderRadius: 12 }}
      />
    </div>
  );
}
