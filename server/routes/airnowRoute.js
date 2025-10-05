import express from "express";
import { getAirNowAQI } from "../controller/airnowController.js";
const router = express.Router();

router.get("/api/airnow/aqi", getAirNowAQI);

export default router;