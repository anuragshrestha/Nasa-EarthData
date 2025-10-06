import React from "react";


//Latest Wildfire news
export default function WildfireUpdates() {


  const FIRMS_OVERRIDES = {
    "Firefighters battle large fire at Chevron refinery in Southern California":
      {
        sourceName: "ABC News",
        sourceUrl:
          "https://abcnews.go.com/US/video/firefighters-battle-large-fire-chevron-refinery-southern-california-126173959",
      },
    "Lake Creek Fire burns near popular recreation area 6 miles north of Ketchum":
      {
        sourceName: "KIVI-TV (Idaho News 6)",
        sourceUrl:
          "https://www.kivitv.com/news/magic-valley/lake-creek-fire-continues-to-burn-near-popular-recreation-area-6-miles-north-of-ketchum",
      },

    "Heat Wave and Rocky Top fires burn in Callahan County": {
      sourceName: "KTXS News",
      sourceUrl:
        "https://ktxs.com/news/local/heat-wave-and-rocky-top-fires-burn-in-callahan-county",
    },
  };

  const entries = Object.entries(FIRMS_OVERRIDES);

  return (
    <section id="wildfires" className="section">
      <div className="panel">
        <h3>Wildfire Updates</h3>
        {entries.length === 0 ? (
          <p className="muted">No wildfire updates available.</p>
        ) : (
          <div className="fire-list">
            {entries.map(([title, info]) => (
              <div className="fire-item" key={title}>
                <h4>{title}</h4>
                <p>
                  Source: {""}
                  <a
                    href={info.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {info.sourceName}
                  </a>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
