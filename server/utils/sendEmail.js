import nodemailer from "nodemailer";

let transporter = null;

export const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.EMAIL_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
};

// Sends an email. Returns true on success and false when email is not configured or fails.
const sendEmail = async ({ to, subject, html, attachments, replyTo }) => {
  const mailer = getTransporter();
  if (!mailer) return false;
  try {
    await mailer.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Snipe&Bite"}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
      replyTo,
    });
    return true;
  } catch (error) {
    console.error(`Email failed: ${error.message}`);
    return false;
  }
};

export default sendEmail;
