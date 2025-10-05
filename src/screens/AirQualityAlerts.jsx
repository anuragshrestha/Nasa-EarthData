import React, { useState } from "react";
import AutocompleteAddress from "../components/AutoCompleteAddress";

export default function AirQualityAlerts() {
  const [email, setEmail] = useState("");
  const [threshold, setThreshold] = useState("");
  const [location, setLocation] = useState(null);

  const handleAlert = () => {
    //needs to call backend
    console.log("alert pressed");
  };

  return (
    <section id="alerts" className="section">
      <div className="panel alerts">
        <h3>
          <span className="emoji-icon" role="img" aria-label="Alert">
            🔔
          </span>
          Air Quality Alerts
        </h3>
        {/** Email address */}
        <div
          className="field"
          style={{ display: "grid", gap: 8, marginBottom: 10 }}
        >
          <input
            className="input"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/** Google Auto Address */}
        <div
          className="field"
          style={{ display: "grid", gap: 8, marginBottom: 10 }}
        >
          <label className="muted" htmlFor="alert-location">
            Choose a location
          </label>
          <AutocompleteAddress
            className="input"
            onPlaceSelected={setLocation}
            countryRestriction="us"
          />
          {location && (
            <span className="badge" title={location.placeId}>
              {location.label}
            </span>
          )}
        </div>

        {/** Air quality index */}
        <div
          className="field"
          style={{ display: "grid", gap: 8, marginBottom: 10 }}
        >
          <label className="muted" htmlFor="threshold">
            Alert when AQI exceeds:
          </label>
          <input
            id="threshold"
            className="input"
            placeholder="Enter the Air quality index"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>

        <button className="btn">
          <svg
            className="icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            <path d="m22 6-10 7L2 6" />
          </svg>
          Set Alert
        </button>
      </div>
    </section>
  );
}
