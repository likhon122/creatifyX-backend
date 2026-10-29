export const passwordResetEmailTemplate = (
  userName: string,
  resetUrl: string
): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your CreatifyX Password</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          color: #1e293b;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
          color: #ffffff;
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.025em;
        }
        .content {
          padding: 36px 32px;
          line-height: 1.6;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #0f172a;
        }
        .text {
          font-size: 15px;
          color: #475569;
          margin-bottom: 24px;
        }
        .button-wrapper {
          text-align: center;
          margin: 32px 0;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
          color: #ffffff !important;
          text-decoration: none;
          font-size: 16px;
          font-weight: 600;
          padding: 14px 36px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
        }
        .security-notice {
          background-color: #f1f5f9;
          border-left: 4px solid #0ea5e9;
          padding: 16px;
          border-radius: 4px;
          margin: 24px 0;
        }
        .security-notice p {
          margin: 0;
          font-size: 14px;
          color: #334155;
        }
        .alt-link {
          font-size: 13px;
          color: #64748b;
          word-break: break-all;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px;
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p class="greeting">Hello ${userName || 'there'},</p>
          <p class="text">We received a request to reset your password for your CreatifyX account. Click the button below to choose a new password.</p>
          
          <div class="button-wrapper">
            <a href="${resetUrl}" class="button" target="_blank" rel="noopener noreferrer">Reset My Password</a>
          </div>

          <div class="security-notice">
            <p><strong>Security Notice:</strong></p>
            <p>• This reset link is single-use and will expire in <strong>10 minutes</strong>.</p>
            <p>• If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>

          <div class="alt-link">
            <p>If the button above does not work, copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}" style="color: #0ea5e9;">${resetUrl}</a></p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CreatifyX. All rights reserved.</p>
          <p>This is an automated security message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const passwordResetSuccessEmailTemplate = (
  userName: string,
  ipAddress: string
): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          color: #1e293b;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
        }
        .content {
          padding: 36px 32px;
          line-height: 1.6;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #0f172a;
        }
        .text {
          font-size: 15px;
          color: #475569;
          margin-bottom: 20px;
        }
        .details-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
        }
        .details-box table {
          width: 100%;
          border-collapse: collapse;
        }
        .details-box td {
          padding: 8px 0;
          font-size: 14px;
        }
        .details-box td.label {
          color: #64748b;
          width: 120px;
          font-weight: 500;
        }
        .details-box td.value {
          color: #0f172a;
          font-weight: 600;
        }
        .warning-box {
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 16px;
          border-radius: 4px;
          margin: 24px 0;
        }
        .warning-box p {
          margin: 0;
          font-size: 14px;
          color: #991b1b;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px;
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Successful</h1>
        </div>
        <div class="content">
          <p class="greeting">Hello ${userName || 'there'},</p>
          <p class="text">Your CreatifyX account password was successfully reset. You can now use your new password to sign in.</p>

          <div class="details-box">
            <table>
              <tr>
                <td class="label">Date & Time:</td>
                <td class="value">${new Date().toUTCString()}</td>
              </tr>
              <tr>
                <td class="label">IP Address:</td>
                <td class="value">${ipAddress || 'Unknown'}</td>
              </tr>
            </table>
          </div>

          <div class="warning-box">
            <p><strong>Didn't make this change?</strong></p>
            <p>If you did not perform this password reset, please contact our support team immediately to protect your account.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CreatifyX. All rights reserved.</p>
          <p>This is an automated security message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
