import { useState } from "react";

export default function CityRankings() {
  const [tab, setTab] = useState("polluted");

  // Helper to classify AQI into category label
  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  };

  // Polluted cities (with state names)
  const MOST_POLLUTED = [
    { city: "Yakima", state: "WA", aqi: 170 },
    { city: "Wenatchee", state: "WA", aqi: 119 },
    { city: "East Wenatchee", state: "WA", aqi: 94 },
  ];

  // Cleanest cities (with state names)
  const CLEANEST = [
    { city: "Eagle Butte", state: "SD", aqi: 2 },
    { city: "Albion", state: "ID", aqi: 3 },
    { city: "Bolinas", state: "CA", aqi: 3 },
  ];

  const items = tab === "polluted" ? MOST_POLLUTED : CLEANEST;
  const sources = [{ name: "AirNow.gov", url: "https://www.airnow.gov/" }];

  const handleClick = (url) => {
    window.open(url, "_blank");
  };

  return (
    <section id="rankings" className="section">
      <div className="panel">
        <h3>City Rankings</h3>

        <div className="toggle">
          <button
            className={tab === "polluted" ? "active" : ""}
            onClick={() => setTab("polluted")}
          >
            Most Polluted
          </button>
          <button
            className={tab === "cleanest" ? "active" : ""}
            onClick={() => setTab("cleanest")}
          >
            Cleanest
          </button>
        </div>

        <div className="rank-list">
          {items.map((it) => {
            const status = getAQIStatus(it.aqi);
            const isCleanest = status === "Good";
            return (
              <div className="rank-item" key={`${it.city}-${it.state}`}>
                <div>
                  <div>
                    {it.city}, {it.state}
                  </div>
                  <div className="muted">{status}</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "4px",
                      fontSize: "12px",
                      color: "#a9b4cc",
                      cursor: "pointer",
                    }}
                    onClick={() => handleClick(sources[0].url)}
                  >
                    <span>Source: {sources[0].name}</span>
                  </div>
                </div>

                {/* AQI Pill */}
                <span
                  className="aq-pill"
                  style={{
                    background: isCleanest
                      ? "rgba(34,197,94,0.3)" 
                      : "rgba(239,68,68,0.18)", 
                    color: isCleanest ? "#bbf7d0" : "#fecaca", 
                    border: isCleanest
                      ? "1px solid rgba(34,197,94,0.5)"
                      : "1px solid rgba(239,68,68,0.35)",
                  }}
                >
                  AQI {it.aqi}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}