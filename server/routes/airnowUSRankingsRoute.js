import express from "express";
import { getAirNowUSRankings } from "../controller/airnowUSRankingsController.js";

const router = express.Router();

// GET /api/airnow/rankings/us?limit=3
router.get("/api/airnow/rankings/us", getAirNowUSRankings);

export default router;

