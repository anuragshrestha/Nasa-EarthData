# NASA Inhale — Real‑Time US AQI and Wildfires

Live Website: https://nasainhale.netlify.app/

## This Project is for the 2025 Nasa Space Apps Challenge Hackathon

## Project Challenge
- From EarthData to Action: Cloud Computing with Earth Observation Data for Predicting Cleaner, Safer Skies
- Challenge link: https://www.spaceappschallenge.org/2025/challenges/from-earthdata-to-action-cloud-computing-with-earth-observation-data-for-predicting-cleaner-safer-skies/?tab=resources


## Project Details
NASA Inhale helps people quickly understand current air quality and wildfire activity across the United States:
- Provides current Air Quality Index (AQI) based on a street address, city, or ZIP code, color‑coded by EPA categories.
- Visualizes nearby AQI hotspots on a satellite basemap using Google Maps.
- Shows live wildfire events around the US using NASA EONET, overlaid on the map.
- Lets users create email alerts for a location and AQI threshold, so you get notified when local air quality worsens.
- Surfaces the most polluted and cleanest US cities at the moment (approximate, based on available observations).

## Key Features
- Address/ZIP search with autocomplete (Google Places) and satellite view.
- Live AQI at and around the selected location, with category colors (Good → Hazardous).
- Live wildfires from NASA EONET, drawn directly on the map with event titles and timestamps.
- Email alert creation: provide email, location, and AQI threshold; alerts are stored for checking and emails can be sent when thresholds are exceeded.
- US city rankings: top polluted and top cleanest cities computed from current AirNow observations. Results are cached and approximate.

## Data Sources
- AirNow.gov — current AQI observations : https://www.airnow.gov
- NASA EONET — latest wildfire events: https://eonet.gsfc.nasa.gov/
- Google Maps Platform — Places Autocomplete and Maps (satellite basemap)

## Architecture Overview
- Frontend (React + Vite): search UI, Google Maps overlays for AQI and wildfires, rankings and alert setup screens.
- Backend (Node.js + Express): API proxy and aggregation for AirNow/EONET, alert storage and email utility.
- Storage: AWS DynamoDB table for alert subscriptions (id, email, threshold, location, timestamps).
- Email: Nodemailer with a configured mailbox for sending alerts.
- Scheduling: AWS Lambda.

## Tech Stack
- Frontend: React + Vite (JavaScript)
- Maps/Search: Google Maps JavaScript API + Places
- Backend: Node.js + Express
- Cloud: AWS (DynamoDB for alerts storage; Lambda for scheduled checks)
- Data APIs: AirNow (AQI), NASA EONET (wildfires)
- Deploy: Netlify (frontend), Render (server)

## API Endpoints (Server)
- `GET /api/airnow/aqi?lat=..&lon=..&radius=..` — Current AQI near a point; returns dominant pollutant and category.
- `GET /api/airnow/nearby?lat=..&lon=..&radius=..&spread=..&limit=..` — Regional AQI dots around a point for map overlay.
- `GET /api/airnow/rankings/us?limit=3` — Aggregated “most polluted” and “cleanest” US cities right now.
- `GET /api/wildfires?lat=..&lon=..&radius_km=..` — Wildfires near a point from NASA EONET.


## Step to run Run Locally

### Prerequisites
- Node.js 18+ and npm
- API keys and credentials:
  - AirNow API key
  - Google Maps JavaScript API key (with Places)
  - An email account for sending alerts (e.g., Gmail app password)
  - AWS credentials for DynamoDB (or equivalent local setup)

### 1) Clone
```
git clone https://github.com/anuragshrestha/Nasa-EarthData.git
cd EarthData
```

### 2) Install dependencies
- Frontend (root):
```
npm install
```
- Backend (server):
```
cd server
npm install
cd ..
```

### 3) Configure environment

Create `.env.local` on project root  for the frontend:
```
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

Create `server/.env` for the backend (do not commit secrets):
```
PORT=4000

# AirNow
AIRNOW_API_KEY=YOUR_AIRNOW_API_KEY

# Email (Nodemailer)
FEEDBACK_EMAIL=youraddress@example.com
FEEDBACK_EMAIL_PASSWORD=your_app_password
MY_EMAIL=yourfallback@example.com

# AWS DynamoDB (for alert storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_DYNAMODB_TABLE_NAME=YOUR_DYNAMODB_TABLENAME
```

Provision a DynamoDB table named in `AWS_DYNAMODB_TABLE_NAME` with:
- Partition key: `alertId` (String)
- Other attributes are stored schemalessly (email, threshold Number, location Map { lat, lng, label }, createdAt).

### 4) Start the servers
- API server:
```
cd server
npm run dev
```
- Frontend (in another terminal):
```
npm run dev
```
Open http://localhost:5173 (or the URL shown by Vite).

## Deployment
- Frontend: Netlify — set `VITE_API_URL` to your API base URL and `VITE_GOOGLE_MAPS_API_KEY` in Netlify env vars.
- Backend: Render (or similar) — set all `server/.env` variables in the service settings.

## Notes & Limitations
- US “cleanest/most polluted” rankings are aggregated from available AirNow observations via a coarse grid scan and deduped by reporting area. They are approximate and may vary with station coverage and API rate limits.
- Wildfire markers and AQI overlays are live; first loads may take a few seconds while data fetches complete.
- Keep API keys and credentials out of version control. Use environment variables in deployment.
