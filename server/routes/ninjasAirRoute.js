import express from "express";
import { getAirQualityNinjas } from "../controller/ninjasAirController.js";

const router = express.Router();

router.get("/api/airquality/ninjas", getAirQualityNinjas);

export default router;


