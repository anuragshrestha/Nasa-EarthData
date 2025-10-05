import React from "react";

export default function WeatherSummary({ data }) {
  if (!data) return null;
  const rows = [
    ["Condition", data.description ?? "-"],
    ["Temperature", data.temperature != null ? `${data.temperature}° ${data.temperatureUnit}` : "-"],
    ["Feels like", data.feelsLike != null ? `${data.feelsLike}°` : "-"],
    ["Heat Index", data.heatIndex != null ? `${data.heatIndex}° ${data.heatIndexUnit ?? ''}`.trim() : "-"],
    ["Humidity", data.humidityPercent != null ? `${data.humidityPercent}%` : "-"],
    [
      "Wind",
      data.wind
        ? `${data.wind.direction ?? ""} ${data.wind.speed ?? "-"} ${data.wind.speedUnit ?? ""}`.trim()
        : "-",
    ],
    ["Visibility", data.visibility != null ? `${data.visibility} ${data.visibilityUnit}` : "-"],
    ["Pressure", data.pressureMillibars != null ? `${data.pressureMillibars} mb` : "-"],
    ["Cloud cover", data.cloudCoverPercent != null ? `${data.cloudCoverPercent}%` : "-"],
    ["Precip prob", data.precipitationProbPercent != null ? `${data.precipitationProbPercent}%` : "-"],
  ];

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        Current Weather
        {data.icon ? (
          <img src={data.icon} alt="icon" style={{ height: 20 }} />
        ) : null}
      </h3>
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
