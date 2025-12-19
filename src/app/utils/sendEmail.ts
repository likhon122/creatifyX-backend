import nodemailer from 'nodemailer';
import { envMode, mailEmail, mailPassword } from '../config';

type MailBody = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: nodemailer.SendMailOptions['attachments'];
};

const sendEmail = async (mailBody: MailBody) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: envMode === 'production' ? 465 : 587,
    secure: envMode === 'production', // true for 465, false for other ports
    auth: {
      user: mailEmail,
      pass: mailPassword,
    },
  });

  await transporter.sendMail({
    from: `"No Reply" <${mailEmail}>`,
    ...mailBody,
  });
};

export default sendEmail;
