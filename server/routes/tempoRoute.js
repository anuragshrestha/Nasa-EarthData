import express from "express";
import { ingestTempoImage } from "../controller/tempoController.js";

const router = express.Router();

// MVP: accept a pre-generated PNG URL (from Harmony) and a bbox, download it to static/tempo_out
router.get("/api/nasa/tempo/no2", ingestTempoImage);

export default router;


