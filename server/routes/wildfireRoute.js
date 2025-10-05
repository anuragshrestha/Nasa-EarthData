import express from "express";
import { getWildfiresNear } from "../controller/wildfireController.js";
const router = express.Router();

router.get("/api/wildfires", getWildfiresNear);

export default router;