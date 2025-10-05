import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import alertRoute from './routes/alertRoute.js';
import airnowRoute from './routes/airnowRoute.js';
import airnowNearbyRoute from './routes/airnowNearbyRoute.js';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/alerts", alertRoute);
app.use("/", airnowRoute);
app.use('/', airnowNearbyRoute);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));