export const accountBlockedEmailTemplate = (
  userName: string,
  adminMessage?: string
): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Blocked</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: #ffffff;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          color: #333333;
          line-height: 1.6;
        }
        .content h2 {
          color: #dc2626;
          font-size: 22px;
          margin-top: 0;
        }
        .alert-box {
          background-color: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .alert-box p {
          margin: 0;
          color: #991b1b;
        }
        .admin-message-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 25px;
          margin: 25px 0;
          box-shadow: 0 4px 6px rgba(245, 158, 11, 0.1);
        }
        .admin-message-box .header {
          background: none;
          padding: 0;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-message-box .header h3 {
          margin: 0;
          color: #92400e;
          font-size: 18px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .admin-message-box .message-content {
          background-color: #fffbeb;
          padding: 18px;
          border-radius: 6px;
          border-left: 4px solid #f59e0b;
          font-size: 15px;
          line-height: 1.7;
          color: #78350f;
          font-weight: 500;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .info-section {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .info-section h3 {
          margin-top: 0;
          color: #374151;
          font-size: 18px;
        }
        .info-section ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .info-section li {
          margin: 8px 0;
          color: #6b7280;
        }
        .contact-info {
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .contact-info p {
          margin: 5px 0;
          color: #1e40af;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #3b82f6;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⛔ Account Access Blocked</h1>
        </div>
        
        <div class="content">
          <h2>Hello ${userName},</h2>
          
          <div class="alert-box">
            <p><strong>Your CreatifyX account has been blocked by our administration team.</strong></p>
          </div>
          
          <p>We regret to inform you that your account access has been temporarily blocked due to a violation of our Terms of Service or Community Guidelines.</p>
          
          ${
            adminMessage
              ? `
          <div class="admin-message-box">
            <div class="header">
              <h3>💬 Message from Administration Team</h3>
            </div>
            <div class="message-content">
              ${adminMessage}
            </div>
          </div>
          `
              : ''
          }
          
          <div class="info-section">
            <h3>Common Reasons for Account Blocks:</h3>
            <ul>
              <li>Violation of Terms of Service or Community Guidelines</li>
              <li>Uploading copyrighted or inappropriate content</li>
              <li>Suspicious or fraudulent activity detected</li>
              <li>Multiple reports from other users</li>
              <li>Spamming or abusive behavior</li>
              <li>Failure to respond to previous warnings</li>
            </ul>
          </div>
          
          <p><strong>What this means:</strong></p>
          <ul>
            <li>You cannot log in to your account</li>
            <li>Your uploaded assets are no longer visible to other users</li>
            <li>You cannot upload new content or interact with the platform</li>
            <li>Any active subscriptions will be suspended</li>
          </ul>
          
          <div class="contact-info">
            <p><strong>📧 Need to Appeal or Have Questions?</strong></p>
            <p>If you believe this action was taken in error or would like to appeal this decision, please contact our support team immediately.</p>
            <p><strong>Email:</strong> support@creatifyx.com</p>
            <p><strong>Subject:</strong> Account Block Appeal - [Your Account Email]</p>
          </div>
          
          <p>Please provide detailed information about your situation, and our team will review your case within 2-3 business days.</p>
          
          <center>
            <a href="mailto:support@creatifyx.com?subject=Account%20Block%20Appeal" class="button">Contact Support</a>
          </center>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            <strong>Note:</strong> This is an automated notification. Please do not reply directly to this email.
          </p>
        </div>
        
        <div class="footer">
          <p><strong>CreatifyX Platform</strong></p>
          <p>© ${new Date().getFullYear()} CreatifyX. All rights reserved.</p>
          <p style="font-size: 12px; margin-top: 10px;">
            This email was sent regarding your account security and status.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const accountInactiveEmailTemplate = (
  userName: string,
  adminMessage?: string
): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Deactivated</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          color: #333333;
          line-height: 1.6;
        }
        .content h2 {
          color: #d97706;
          font-size: 22px;
          margin-top: 0;
        }
        .warning-box {
          background-color: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-box p {
          margin: 0;
          color: #92400e;
        }
        .admin-message-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 25px;
          margin: 25px 0;
          box-shadow: 0 4px 6px rgba(245, 158, 11, 0.1);
        }
        .admin-message-box .header {
          background: none;
          padding: 0;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-message-box .header h3 {
          margin: 0;
          color: #92400e;
          font-size: 18px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .admin-message-box .message-content {
          background-color: #fffbeb;
          padding: 18px;
          border-radius: 6px;
          border-left: 4px solid #f59e0b;
          font-size: 15px;
          line-height: 1.7;
          color: #78350f;
          font-weight: 500;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .info-section {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .info-section h3 {
          margin-top: 0;
          color: #374151;
          font-size: 18px;
        }
        .info-section ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .info-section li {
          margin: 8px 0;
          color: #6b7280;
        }
        .contact-info {
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .contact-info p {
          margin: 5px 0;
          color: #1e40af;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #3b82f6;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Account Deactivated</h1>
        </div>
        
        <div class="content">
          <h2>Hello ${userName},</h2>
          
          <div class="warning-box">
            <p><strong>Your CreatifyX account has been temporarily deactivated.</strong></p>
          </div>
          
          <p>We're writing to inform you that your account has been set to inactive status by our administration team. This is typically a temporary measure taken for account review or minor policy concerns.</p>
          
          ${
            adminMessage
              ? `
          <div class="admin-message-box">
            <div class="header">
              <h3>💬 Message from Administration Team</h3>
            </div>
            <div class="message-content">
              ${adminMessage}
            </div>
          </div>
          `
              : ''
          }
          
          <div class="info-section">
            <h3>Common Reasons for Account Deactivation:</h3>
            <ul>
              <li>Account under review for compliance verification</li>
              <li>Pending documentation or identity verification</li>
              <li>Minor policy violations requiring attention</li>
              <li>Incomplete account setup or profile information</li>
              <li>Suspected security concerns for your protection</li>
              <li>Temporary suspension pending investigation</li>
            </ul>
          </div>
          
          <p><strong>What this means for your account:</strong></p>
          <ul>
            <li>Your account access is temporarily suspended</li>
            <li>Your uploaded content remains in our system but may not be publicly visible</li>
            <li>You cannot upload new assets or make purchases until reactivated</li>
            <li>Your account data and history are preserved</li>
          </ul>
          
          <div class="info-section">
            <h3>🔄 How to Reactivate Your Account:</h3>
            <ul>
              <li>Contact our support team to discuss the reason for deactivation</li>
              <li>Complete any required verification or documentation</li>
              <li>Address any policy concerns raised by our team</li>
              <li>Wait for admin approval to restore full access</li>
            </ul>
          </div>
          
          <div class="contact-info">
            <p><strong>📧 Get Your Account Back:</strong></p>
            <p>To reactivate your account or learn more about why it was deactivated, please reach out to our support team.</p>
            <p><strong>Email:</strong> support@creatifyx.com</p>
            <p><strong>Subject:</strong> Account Reactivation Request - [Your Account Email]</p>
          </div>
          
          <p>Our support team typically responds within 24-48 hours during business days. Please include your account email and any relevant details to expedite the process.</p>
          
          <center>
            <a href="mailto:support@creatifyx.com?subject=Account%20Reactivation%20Request" class="button">Contact Support</a>
          </center>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            <strong>Note:</strong> Unlike a permanent block, inactive accounts can typically be reactivated once any issues are resolved. We're here to help you get back on track!
          </p>
        </div>
        
        <div class="footer">
          <p><strong>CreatifyX Platform</strong></p>
          <p>© ${new Date().getFullYear()} CreatifyX. All rights reserved.</p>
          <p style="font-size: 12px; margin-top: 10px;">
            This email was sent regarding your account status.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const accountReactivatedEmailTemplate = (
  userName: string,
  adminMessage?: string
): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Reactivated</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          color: #333333;
          line-height: 1.6;
        }
        .content h2 {
          color: #059669;
          font-size: 22px;
          margin-top: 0;
        }
        .success-box {
          background-color: #d1fae5;
          border-left: 4px solid #10b981;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .success-box p {
          margin: 0;
          color: #065f46;
          font-weight: 600;
        }
        .admin-message-box {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 25px;
          margin: 25px 0;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
        }
        .admin-message-box .header {
          background: none;
          padding: 0;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-message-box .header h3 {
          margin: 0;
          color: #1e40af;
          font-size: 18px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .admin-message-box .message-content {
          background-color: #eff6ff;
          padding: 18px;
          border-radius: 6px;
          border-left: 4px solid #3b82f6;
          font-size: 15px;
          line-height: 1.7;
          color: #1e3a8a;
          font-weight: 500;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .info-section {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .info-section h3 {
          margin-top: 0;
          color: #374151;
          font-size: 18px;
        }
        .info-section ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .info-section li {
          margin: 8px 0;
          color: #6b7280;
        }
        .highlight-box {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .highlight-box p {
          margin: 5px 0;
          color: #92400e;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #10b981;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Account Successfully Reactivated</h1>
        </div>
        
        <div class="content">
          <h2>Welcome Back, ${userName}!</h2>
          
          <div class="success-box">
            <p>🎉 Great news! Your CreatifyX account has been successfully reactivated and is now fully operational.</p>
          </div>
          
          <p>We're delighted to inform you that your account status has been restored to <strong>Active</strong> by our administration team. You now have complete access to all platform features and services.</p>
          
          ${
            adminMessage
              ? `
          <div class="admin-message-box">
            <div class="header">
              <h3>💬 Message from Administration Team</h3>
            </div>
            <div class="message-content">
              ${adminMessage}
            </div>
          </div>
          `
              : ''
          }
          
          <div class="info-section">
            <h3>🔓 What You Can Do Now:</h3>
            <ul>
              <li>✓ Full access to your account dashboard</li>
              <li>✓ Upload and manage your assets</li>
              <li>✓ Browse and download content from our library</li>
              <li>✓ Interact with the community</li>
              <li>✓ Access premium features (if subscribed)</li>
              <li>✓ Manage your profile and settings</li>
            </ul>
          </div>
          
          <div class="highlight-box">
            <p><strong>📌 Important Reminder:</strong></p>
            <p>Please ensure you continue to follow our Community Guidelines and Terms of Service to maintain your account in good standing.</p>
          </div>
          
          <p>Thank you for your patience and cooperation during the review process. We're committed to maintaining a safe, professional, and creative environment for all our users.</p>
          
          <center>
            <a href="${
              process.env.FRONTEND_URL || 'https://creatifyx.com'
            }/login" class="button">Login to Your Account</a>
          </center>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            If you have any questions or need assistance, our support team is here to help!
          </p>
        </div>
        
        <div class="footer">
          <p><strong>CreatifyX Platform</strong></p>
          <p>© ${new Date().getFullYear()} CreatifyX. All rights reserved.</p>
          <p style="font-size: 12px; margin-top: 10px;">
            This email was sent regarding your account status update.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};
