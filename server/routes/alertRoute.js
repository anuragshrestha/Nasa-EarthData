import express from "express";
import { createAlert, getAlertByAQI, sendEmail } from "../controller/alertController.js";

const router = express.Router();

router.post("/", createAlert);             
router.get("/check", getAlertByAQI);       
router.post("/send/:alertId", sendEmail);    

export default router;