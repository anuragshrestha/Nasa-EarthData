# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# Nasa-EarthData

## Environment configuration

The server expects the following environment variables (see `server/env` for local defaults):

- `OPENAQ_API_KEY`
- `API_NINJAS_KEY`
- `AQICN_API_TOKEN`
- `API_NINJAS_KEY`

For the front-end, create a root `.env` with:

```bash
VITE_GOOGLE_MAPS_API_KEY=your-google-key
VITE_API_URL=http://localhost:4000
```

The server exposes helpers for the front-end at:

- `GET /api/news/wildfires` – curated wildfire headlines (API Ninjas news with NASA EONET fallback)
- `GET /api/aqicn/us-rankings` – US AQI rankings for best/worst air quality
