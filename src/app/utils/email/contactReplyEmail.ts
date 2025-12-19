import sendEmail from '../sendEmail';

interface IContactReplyEmailData {
  userName: string;
  userEmail: string;
  subject: string;
  originalMessage: string;
  adminReply: string;
  adminName: string;
  contactId: string;
}

/**
 * Send email notification when admin replies to a contact message
 */
export const sendContactReplyEmail = async (
  data: IContactReplyEmailData
): Promise<void> => {
  const {
    userName,
    userEmail,
    subject,
    originalMessage,
    adminReply,
    adminName,
    contactId,
  } = data;

  const emailHtml = buildContactReplyEmailHtml({
    userName,
    subject,
    originalMessage,
    adminReply,
    adminName,
    contactId,
    userEmail,
  });

  await sendEmail({
    to: userEmail,
    subject: `Re: ${subject} - CreatifyX Support`,
    html: emailHtml,
  });

  console.warn(
    `[Contact Reply Email] Sent to ${userEmail} for contact ${contactId}`
  );
};

/**
 * Build professional HTML email template for contact reply
 */
const buildContactReplyEmailHtml = (data: {
  userName: string;
  subject: string;
  originalMessage: string;
  adminReply: string;
  adminName: string;
  contactId: string;
  userEmail: string;
}): string => {
  const {
    userName,
    subject,
    originalMessage,
    adminReply,
    adminName,
    userEmail,
  } = data;
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Reply - CreatifyX</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    .header-subtitle {
      color: #e0e7ff;
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #1a202c;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .intro-text {
      color: #4a5568;
      margin-bottom: 30px;
      font-size: 15px;
      line-height: 1.7;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .message-box {
      background-color: #f7fafc;
      border-left: 4px solid #cbd5e0;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .message-header {
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 10px;
    }
    .message-text {
      color: #4a5568;
      font-size: 14px;
      line-height: 1.7;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .reply-box {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      border-left: 4px solid #667eea;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .reply-header {
      font-size: 14px;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
    }
    .admin-badge {
      background-color: #667eea;
      color: white;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 12px;
      margin-left: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .reply-text {
      color: #2d3748;
      font-size: 15px;
      line-height: 1.8;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .info-box {
      background-color: #ebf8ff;
      border: 1px solid #bee3f8;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 25px;
    }
    .info-text {
      color: #2c5282;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
    }
    .cta-section {
      text-align: center;
      margin: 35px 0;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 0.5px;
      transition: transform 0.2s;
      box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #cbd5e0, transparent);
      margin: 30px 0;
    }
    .footer {
      background-color: #f7fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      color: #718096;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .footer-links {
      margin: 15px 0;
    }
    .footer-link {
      color: #667eea;
      text-decoration: none;
      font-size: 13px;
      margin: 0 12px;
      font-weight: 500;
    }
    .footer-link:hover {
      text-decoration: underline;
    }
    .social-links {
      margin-top: 20px;
    }
    .social-link {
      display: inline-block;
      margin: 0 8px;
      color: #718096;
      text-decoration: none;
      font-size: 13px;
    }
    .copyright {
      color: #a0aec0;
      font-size: 12px;
      margin-top: 20px;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .logo {
        font-size: 26px;
      }
      .greeting {
        font-size: 16px;
      }
      .cta-button {
        padding: 12px 28px;
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">CreatifyX</div>
      <div class="header-subtitle">Support Team</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">Hello ${userName},</div>
      
      <p class="intro-text">
        Thank you for contacting CreatifyX Support. We have reviewed your inquiry and our team has prepared a response for you.
      </p>

      <!-- Subject -->
      <div class="section">
        <div class="section-title">📋 Subject</div>
        <div style="color: #2d3748; font-size: 15px; font-weight: 600; padding: 8px 0;">
          ${subject}
        </div>
      </div>

      <!-- Admin Reply -->
      <div class="section">
        <div class="section-title">💬 Our Response</div>
        <div class="reply-box">
          <div class="reply-header">
            ${adminName}
            <span class="admin-badge">Support Team</span>
          </div>
          <div class="reply-text">${adminReply}</div>
        </div>
      </div>

      <!-- Original Message -->
      <div class="section">
        <div class="section-title">📝 Your Original Message</div>
        <div class="message-box">
          <div class="message-text">${originalMessage}</div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Info Box -->
      <div class="info-box">
        <p class="info-text">
          <strong>Need further assistance?</strong><br>
          If you have additional questions or need more help, please don't hesitate to submit a new contact request through your dashboard.
        </p>
      </div>

      <!-- CTA -->
      <div class="cta-section">
        <a href="${process.env.CLIENT_URL}/dashboard" class="cta-button">
          Go to Dashboard
        </a>
      </div>

      <p class="intro-text" style="margin-top: 30px; text-align: center;">
        We're here to help you succeed. Thank you for being a valued member of CreatifyX!
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        <strong>CreatifyX Support Team</strong><br>
        Your trusted partner in digital assets
      </p>
      
      <div class="footer-links">
        <a href="${process.env.CLIENT_URL}/support" class="footer-link">Help Center</a>
        <a href="${process.env.CLIENT_URL}/terms" class="footer-link">Terms</a>
        <a href="${process.env.CLIENT_URL}/privacy" class="footer-link">Privacy</a>
      </div>

      <div class="social-links">
        <a href="#" class="social-link">Twitter</a>
        <span style="color: #cbd5e0;">•</span>
        <a href="#" class="social-link">Facebook</a>
        <span style="color: #cbd5e0;">•</span>
        <a href="#" class="social-link">LinkedIn</a>
      </div>

      <div class="copyright">
        © ${currentYear} CreatifyX. All rights reserved.
      </div>

      <p class="footer-text" style="margin-top: 20px; font-size: 12px;">
        This email was sent to ${userEmail} because you contacted our support team.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export default sendContactReplyEmail;
