import { useEffect, useState } from "react";

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

  const [polluted, setPolluted] = useState([]);
  const [cleanest, setCleanest] = useState([]);
  const [loading, setLoading] = useState(true);

  function apiBase() {
    return import.meta.env.MODE === "development"
      ? `http://localhost:4000`
      : import.meta.env.VITE_API_URL;
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const url = `${apiBase()}/api/airnow/rankings/us?limit=3`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const mp = Array.isArray(data?.mostPolluted) ? data.mostPolluted : [];
        const cl = Array.isArray(data?.cleanest) ? data.cleanest : [];
        if (!cancelled) {
          setPolluted(mp.map((d) => ({ city: d.reportingArea, state: d.state, aqi: d.aqi })));
          setCleanest(cl.map((d) => ({ city: d.reportingArea, state: d.state, aqi: d.aqi })));
        }
      } catch (e) {
        // fallback to simple placeholders on error
        if (!cancelled) {
          setPolluted([
            { city: "Yakima", state: "WA", aqi: 170 },
            { city: "Wenatchee", state: "WA", aqi: 119 },
            { city: "East Wenatchee", state: "WA", aqi: 94 },
          ]);
          setCleanest([
            { city: "Eagle Butte", state: "SD", aqi: 2 },
            { city: "Albion", state: "ID", aqi: 3 },
            { city: "Bolinas", state: "CA", aqi: 3 },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const items = tab === "polluted" ? polluted : cleanest;
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
          {loading && (
            <div className="muted">Loading latest rankings…</div>
          )}
          {!loading && items.map((it) => {
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
