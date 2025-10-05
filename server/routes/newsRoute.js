import express from "express";
import { getWildfireNews } from "../controller/newsController.js";

const router = express.Router();

router.get("/api/news/wildfires", getWildfireNews);

export default router;
