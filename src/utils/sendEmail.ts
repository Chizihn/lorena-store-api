import nodemailer from "nodemailer";
import { config } from "../config/app.config";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
}

export const sendEmail = async (options: EmailOptions) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: config.SMTP.HOST,
    port: Number(config.SMTP.PORT),
    auth: {
      user: config.SMTP.USER,
      pass: config.SMTP.PASS,
    },
  });

  await transporter.sendMail({
    from: config.SMTP.FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
};
