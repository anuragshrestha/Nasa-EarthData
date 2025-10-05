
import express from "express";
import { fetchAQI } from "../controller/openaqController.js";

const router = express.Router();

router.get("/api/openaq/latest", fetchAQI);

export default router;
