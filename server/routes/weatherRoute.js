import express from "express";
import { getCurrentWeather, getWeatherByAddress } from "../controller/weatherController.js";

const router = express.Router();

router.get("/api/weather/current", getCurrentWeather);
router.get("/api/weather/by-address", getWeatherByAddress);

export default router;
