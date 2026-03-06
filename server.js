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
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post(["/send-emails", "/send-email"], async (req, res) => {
  const { emails, subject, html } = req.body;
  const recipients = Array.isArray(emails)
    ? emails.map((email) => String(email).trim()).filter(Boolean)
    : [];

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({
      success: false,
      message: "Missing EMAIL_USER or EMAIL_PASS in .env"
    });
  }

  if (!recipients.length || !subject || !html) {
    return res.status(400).json({
      success: false,
      message: "emails, subject and html are required"
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    for (const email of recipients) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        html
      });
    }

    res.json({
      success: true,
      message: "Emails sent successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Email sending failed"
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
