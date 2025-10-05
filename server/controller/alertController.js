import { PutCommand, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from '../model/db.js';
import nodemailer from "nodemailer";
import { nanoid } from "nanoid";

// Stores alert data in AWS DynamoDB
export const createAlert = async (req, res) => {

  console.log("----SAVING POST ALERT---");
  
  try {
    const { email, threshold, location } = req.body;

    if (!email || !threshold || !location?.lat || !location?.lng) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const alertId = nanoid();
    const item = {
      alertId,
      email,
      threshold: Number(threshold),
      location,
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: process.env.AWS_DYNAMODB_TABLE_NAME, Item: item }));

    res.status(200).json({
      success: true,
      message: "Alert created successfully",
      alertId,
    });
  } catch (error) {
    console.error("Create alert failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

//Fetch alerts based on AQI + location
export const getAlertByAQI = async (req, res) => {

   console.log("---FETCHING AQI---");
   

  try {
    const { lat, lng, aqi } = req.body;

    if (!lat || !lng || aqi === undefined) {
      return res.status(400).json({ success: false, message: "lat, lng, and aqi are required" });
    }

    const scan = await ddb.send(new ScanCommand({ TableName: process.env.AWS_DYNAMODB_TABLE_NAME }));

    // Find all alerts for the same approximate location (±0.1°)
    const nearbyAlerts = (scan.Items || []).filter(
      (a) =>
        Math.abs(a.location.lat - lat) < 0.1 &&
        Math.abs(a.location.lng - lng) < 0.1 &&
        aqi >= a.threshold
    );

    res.status(200).json({ success: true, alerts: nearbyAlerts });
  } catch (error) {
    console.error("Fetch alerts failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Sends alert email
export const sendEmail = async (req, res) => {

  console.log('---SENDING ALERT EMAIL---');
  
  try {
    const { alertId } = req.params;

    if (!alertId) {
      return res.status(400).json({ success: false, error: "Alert ID is required" });
    }

    const result = await ddb.send(
      new GetCommand({
        TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
        Key: { alertId },
      })
    );

    const alert = result.Item;
    if (!alert) {
      return res.status(404).json({ success: false, error: "Alert not found" });
    }

    const { email, threshold, location } = alert;
    const locationLabel = location?.label || "Unknown location";

    const currentAqi = 150;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.FEEDBACK_EMAIL,
        pass: process.env.FEEDBACK_EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.FEEDBACK_EMAIL,
      to: email || process.env.MY_EMAIL,
      subject: "Air Quality Alert - NASA Inhale",
      text: `⚠️ The Air Quality Index for ${locationLabel} is now ${currentAqi}, exceeding your threshold of ${threshold}.`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");

    res.status(200).json({ success: true, message: "Alert email sent successfully" });
  } catch (error) {
    console.error("Send email failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};