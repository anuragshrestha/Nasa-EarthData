import React from "react";

export default function AirQualitySummary({ data }) {
  if (!data) return null;
  const pol = data?.pollutants || {};
  const rows = [
    ["Overall AQI", data.overallAQI ?? "-"],
    ["O3 AQI", pol.o3?.aqi ?? "-"],
    ["PM2.5 AQI", pol.pm25?.aqi ?? "-"],
    ["PM10 AQI", pol.pm10?.aqi ?? "-"],
    ["NO2 AQI", pol.no2?.aqi ?? "-"],
    ["SO2 AQI", pol.so2?.aqi ?? "-"],
    ["CO AQI", pol.co?.aqi ?? "-"],
  ];

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h3>Air Quality (API Ninjas)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: "contents" }}>
            <div style={{ opacity: 0.8 }}>{label}</div>
            <div style={{ fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


