import express from "express";
import { getAirNowNearby } from "../controller/airnowNearbyController.js";
const router = express.Router();

router.get("/api/airnow/nearby", getAirNowNearby);

export default router;