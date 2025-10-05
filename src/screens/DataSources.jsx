
export default function DataSources() {
  const sources = [
    { name: "AirNow.gov", url: "https://www.airnow.gov/" },
    { name: "EONET (NASA)", url: "https://eonet.gsfc.nasa.gov/" },
    { name: "Google Satellite Map", url: "https://www.google.com/maps" },
  ];

  const handleClick = (url) => {
    window.open(url, "_blank"); 
  };

  return (
    <section id="sources" className="section">
      <div className="panel">
        <h3>Data Sources</h3>
        <ul className="source-list">
          {sources.map((src) => (
            <li
              key={src.name}
              className="source-item"
              onClick={() => handleClick(src.url)}
              style={{
                cursor: "pointer",
                transition: "background 0.2s",
                padding: "6px 0",
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              <span className="dot" /> {src.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}