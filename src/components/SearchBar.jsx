import React, { useEffect, useRef, useState } from "react";
import AutocompleteAddress from "./AutoCompleteAddress";
import WeatherSummary from "./WeatherSummary";
import AirQualitySummary from "./AirQualitySummary";

export default function SearchBar({ onSearchLocation }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [address, setAddress] = useState("");
  const [weather, setWeather] = useState(null);
  const [aqi, setAqi] = useState(null);

  const API_URL =
    import.meta.env.MODE === "development"
      ? "http://localhost:4000"
      : import.meta.env.VITE_API_URL;

  const onPressSearch = async () => {
    console.log("pressed search");

    if (!location) {
      alert("Please select a location first!");
      return;
    }
    setLoading(true);
    const { lat, lng } = location;

    onSearchLocation?.({ lat, lng });
    try {
      const res = await fetch(
        `${API_URL}/api/weather/current?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=summary`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setWeather(data);
    } catch (e) {
      console.error("Weather fetch failed", e);
      setToast({ type: "error", text: "Failed to fetch weather" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setLoading(false);
    }

    // Fetch API Ninjas AQI (optional; requires API_NINJAS_KEY on server)
    try {
      const res = await fetch(
        `${API_URL}/api/airquality/ninjas?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAqi(data?.normalized || null);
    } catch (e) {
      console.warn("AQI (API Ninjas) fetch failed", e);
      setAqi(null);
    }

    // try {
    //   setLoading(true);

    //   const comps = encodeURIComponent(JSON.stringify(location.components));
    //   const res = await fetch(
    //     `${API_URL}/api/openaq/latest?lat=${lat}&lon=${lng}&components=${comps}`
    //   );

    //   if (!res.ok) {
    //     const error = await res.text();
    //     throw new Error(error || "Failed to fetch OpenAQ data");
    //   }

    //   const data = await res.json();
    //   console.log("OpenAQ latest data:", data);
    //   setToast({ type: "success", text: "Navigating to the location..." });
    //   setTimeout(() => setToast(null), 5000);
    // } catch (error) {
    //   console.error(error);
    // } finally {
    //   setLoading(false);
    // }

    
    console.log("Selected location:", location);

    console.log(lat, " ", lng);
  };

  return (
    <header className="hero">
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 18px",
            borderRadius: "8px",
            background:
              toast.type === "success"
                ? "rgba(34,197,94,.9)"
                : "rgba(239,68,68,.9)",
            color: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            transition: "opacity 0.3s",
            zIndex: 1000,
          }}
        >
          {toast.text}
        </div>
      )}
      <div className="search-wrap">
        <AutocompleteAddress
          className="input"
          value={address}
          onValueChange={setAddress}
          onPlaceSelected={setLocation}
          countryRestriction="us"
        />
        <button className="search-btn" onClick={onPressSearch}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
      <WeatherSummary data={weather} />
      <AirQualitySummary data={aqi} />
    </header>
  );
}
