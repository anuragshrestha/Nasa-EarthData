import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import alertRoute from './routes/alertRoute.js';
import openaqRoute from './routes/openaqRoute.js';
import weatherRoute from './routes/weatherRoute.js';
import ninjasAirRoute from './routes/ninjasAirRoute.js';
import tempoRoute from './routes/tempoRoute.js';

dotenv.config();
// Fallback to a non-dot env file if .env isn't available
dotenv.config({ path: './env' });

const app = express();
app.use(cors());
app.use(express.json());
// Serve static outputs (e.g., TEMPO overlays)
app.use('/static', express.static('static'));

app.use("/alerts", alertRoute);
app.use("/", openaqRoute);
app.use("/", weatherRoute);
app.use("/", ninjasAirRoute);
app.use("/", tempoRoute);

// Simple health/help route
app.get("/", (_req, res) => {
  res.type("text/plain").send(
    "API is running. Try:\n" +
    "- /api/weather/current?lat=37.7749&lon=-122.4194\n" +
    "- /api/weather/current?lat=37.7749&lon=-122.4194&format=summary\n" +
    "- /api/weather/by-address?address=Seattle%2C%20WA&format=summary\n" +
    "- /api/openaq/latest?lat=37.7749&lon=-122.4194\n" +
    "- /api/airquality/ninjas?city=London\n" +
    "- /api/airquality/ninjas?lat=37.7749&lon=-122.4194\n" +
    "- /api/nasa/tempo/no2?imageUrl=<pngUrl>&bbox=-123.3,37.3,-121.8,38.1\n"
  );
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));