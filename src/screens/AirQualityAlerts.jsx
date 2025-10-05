import React, { useState } from "react";
import AutocompleteAddress from "../components/AutoCompleteAddress";

export default function AirQualityAlerts() {
  const [email, setEmail] = useState("");
  const [threshold, setThreshold] = useState("");
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(""); 
  const [toast, setToast] = useState(null);


  const API_URL =
    import.meta.env.MODE === "development"
      ? "http://localhost:4000"
      : import.meta.env.VITE_API_URL;

  //calls api to store the alert data
  const handleAlert = async () => {
    if (!email || !threshold || !location) {
      alert("Please fill email, location and AQI threshold");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          threshold: Number(threshold),
          location: {
            label: location.label,
            lat: location.lat,
            lng: location.lng,
            placeId: location.placeId,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setEmail("");
      setThreshold("");
      setLocation(null);
        setAddress("");   
      console.log("Saved alert:", data);
      setToast({ type: "success", text: "Alert saved successfully!" });
      setTimeout(() => setToast(null), 5000);
    } catch (e) {
      console.error(e);
      alert("Failed to save alert");
    }
  };

  return (
    <section id="alerts" className="section">
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
            value={address}
            onValueChange={setAddress}
            onPlaceSelected={setLocation}
            countryRestriction="us"
          />
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

        <button className="btn" onClick={handleAlert}>
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
