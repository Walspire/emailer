import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* -------------------- Middleware -------------------- */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* -------------------- Health Routes -------------------- */

app.get("/", (req, res) => {
  res.send("Email Sender API Running 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/* -------------------- Timeout Helper -------------------- */

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/* -------------------- Email Route -------------------- */

app.post(["/send-emails", "/send-email"], async (req, res) => {
  const routeStart = Date.now();

  const { emails, subject, html } = req.body;

  const recipients = Array.isArray(emails)
    ? emails.map((email) => String(email).trim()).filter(Boolean)
    : [];

  /* Validate ENV */

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({
      success: false,
      message: "Missing EMAIL_USER or EMAIL_PASS environment variables"
    });
  }

  /* Validate Request */

  if (!recipients.length || !subject || !html) {
    return res.status(400).json({
      success: false,
      message: "emails, subject and html are required"
    });
  }

  if (recipients.length > 25) {
    return res.status(400).json({
      success: false,
      message: "Maximum 25 recipients allowed per request"
    });
  }

  try {

    /* Create Transporter */

    const transporter = nodemailer.createTransport({
      // service: "gmail",
      // connectionTimeout: 5000,
      // greetingTimeout: 5000,
      // socketTimeout: 10000,
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        family: 4, // force IPv4
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
await transporter.verify();
console.log("SMTP connection successful");

    /* Send Emails */

    const sendJobs = recipients.map((email) =>
      withTimeout(
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject,
          html
        }),
        12000,
        `Send to ${email}`
      )
    );

    await withTimeout(Promise.all(sendJobs), 15000, "Bulk send");

    res.json({
      success: true,
      message: "Emails sent successfully",
      recipients: recipients.length,
      durationMs: Date.now() - routeStart
    });

  } catch (error) {

    console.error("Email Error:", error);

    res.status(500).json({
      success: false,
      message: error?.message || "Email sending failed",
      durationMs: Date.now() - routeStart
    });

  }
});

/* -------------------- Start Server -------------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});