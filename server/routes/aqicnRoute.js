import express from "express";
import { getUsRankings } from "../controller/aqicnController.js";

const router = express.Router();

router.get("/api/aqicn/us-rankings", getUsRankings);

export default router;
