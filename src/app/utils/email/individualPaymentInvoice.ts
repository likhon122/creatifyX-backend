import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';
import sendEmail from '../sendEmail';

type WatermarkAsset = {
  dataUri: string | null;
  filePath: string | null;
};

let watermarkAssetCache: WatermarkAsset | null = null;

const resolveWatermarkAsset = async (): Promise<WatermarkAsset> => {
  if (watermarkAssetCache) {
    return watermarkAssetCache;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), 'src', 'app', 'asset', 'watermark.png'),
    path.resolve(process.cwd(), 'dist', 'app', 'asset', 'watermark.png'),
  ];

  for (const candidate of candidatePaths) {
    try {
      const fileBuffer = await fs.readFile(candidate);
      watermarkAssetCache = {
        dataUri: `data:image/png;base64,${fileBuffer.toString('base64')}`,
        filePath: candidate,
      };
      return watermarkAssetCache;
    } catch {
      // try next path
    }
  }

  watermarkAssetCache = { dataUri: null, filePath: null };
  return watermarkAssetCache;
};

const formatCurrency = (amount: number) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} USD`;
  }
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

const buildInvoiceHtml = (context: InvoiceContext) => {
  const {
    assetTitle,
    assetType,
    amountDue,
    invoiceDate,
    invoiceNumber,
    originalPrice,
    discountAmount,
    isPremiumUser,
  } = context;

  const hasDiscount = discountAmount > 0;
  const subtotalDisplay = hasDiscount
    ? formatCurrency(originalPrice)
    : amountDue;
  const discountDisplay = hasDiscount ? formatCurrency(discountAmount) : null;

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Your CreatifyX Invoice</title>
    </head>
    <body style="margin:0;padding:20px;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
      <div style="max-width:700px;margin:0 auto;">
        <!-- Header -->
        <div style="padding:24px 0;">
          <div style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:6px 16px;border-radius:8px;">
            <span style="font-size:20px;font-weight:700;color:#000;letter-spacing:-0.02em;">CreatifyX</span><span style="font-size:20px;font-weight:400;color:#000;">, Inc.</span>
          </div>
        </div>

        <!-- Main Receipt Card -->
        <div style="background:#0f1419;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;margin-bottom:20px;">
          <p style="margin:0 0 12px;color:#9ca3af;font-size:14px;font-weight:500;">Receipt from CreatifyX, Inc.</p>
          
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
            <div>
              <p style="margin:0;font-size:42px;font-weight:700;color:#fff;line-height:1.1;">${amountDue}</p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:14px;">Paid ${invoiceDate}</p>
            </div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px;width:64px;height:64px;display:flex;align-items:center;justify-content:center;">
              <img src="cid:logo" alt="CreatifyX Logo" style="width:48px;height:48px;object-fit:contain;">
            </div>
          </div>

          <div style="display:flex;gap:6px;align-items:center;margin-bottom:20px;">
            <span style="color:#fbbf24;font-size:14px;">↓</span>
            <span style="color:#fbbf24;font-size:14px;font-weight:600;">Download invoice</span>
            <span style="color:#9ca3af;font-size:14px;margin-left:12px;">↓</span>
            <span style="color:#9ca3af;font-size:14px;font-weight:600;">Download receipt</span>
          </div>

          <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:18px;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
              <div>
                <p style="margin:0 0 6px;color:#9ca3af;font-size:13px;">Receipt number</p>
                <p style="margin:0;color:#fff;font-weight:600;font-size:15px;">${invoiceNumber.replace(
                  'INV',
                  'REC'
                )}</p>
              </div>
              <div>
                <p style="margin:0 0 6px;color:#9ca3af;font-size:13px;">Invoice number</p>
                <p style="margin:0;color:#fff;font-weight:600;font-size:15px;">${invoiceNumber}</p>
              </div>
              <div>
                <p style="margin:0 0 6px;color:#9ca3af;font-size:13px;">Payment method</p>
                <p style="margin:0;color:#fff;font-weight:600;font-size:15px;"><strong>VISA</strong> - 3531</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Receipt Details Card -->
        <div style="background:#0f1419;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;margin-bottom:20px;">
          <h3 style="margin:0 0 18px;color:#fff;font-size:18px;font-weight:700;">Receipt #${invoiceNumber.replace(
            'INV',
            'REC'
          )}</h3>
          
          <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">INDIVIDUAL ASSET PURCHASE</p>
          
          <div style="margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div>
                <p style="margin:0;color:#fff;font-size:16px;font-weight:600;">${assetTitle}</p>
                <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">${assetType} Asset · Qty 1</p>
              </div>
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">${
                hasDiscount ? formatCurrency(originalPrice) : amountDue
              }</p>
            </div>
          </div>

          <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="color:#e5e7eb;font-size:14px;">Subtotal</span>
              <span style="color:#fff;font-size:14px;font-weight:600;">${subtotalDisplay}</span>
            </div>
            ${
              hasDiscount && isPremiumUser
                ? `<div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="color:#10b981;font-size:14px;">Premium Discount (30%)</span>
              <span style="color:#10b981;font-size:14px;font-weight:600;">-${discountDisplay}</span>
            </div>`
                : ''
            }
          </div>

          <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
              <span style="color:#fff;font-size:16px;font-weight:700;">Total</span>
              <span style="color:#fff;font-size:16px;font-weight:700;">${amountDue}</span>
            </div>
          </div>

          <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:16px;">
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#fff;font-size:16px;font-weight:700;">Amount paid</span>
              <span style="color:#fff;font-size:16px;font-weight:700;">${amountDue}</span>
            </div>
          </div>

          <!-- View Asset Button -->
          <div style="margin-top:24px;">
            <a href="#" style="display:block;background:#000;color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;border:1px solid rgba(255,255,255,0.1);">View purchased asset</a>
          </div>

          <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;text-align:center;">
            Questions? Contact us at <a href="mailto:help@creatifyx.ai" style="color:#f59e0b;text-decoration:none;font-weight:600;">help@creatifyx.ai</a>
          </p>
        </div>
      </div>
    </body>
  </html>`;
};

type PaymentForInvoice = {
  _id: Types.ObjectId;
  user: {
    name?: string;
    email: string;
  };
  asset: {
    title: string;
    assetType: string;
  };
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  isPremiumUser: boolean;
  transactionDate?: Date;
  paymentStatus: string;
};

type InvoiceContext = {
  userName: string;
  userEmail: string;
  country?: string;
  assetTitle: string;
  assetType: string;
  originalPrice: number;
  discountAmount: number;
  amountDue: string;
  isPremiumUser: boolean;
  invoiceDate: string;
  invoiceNumber: string;
  watermarkUri: string | null;
  watermarkFilePath: string | null;
};

const buildInvoiceContext = async (payment: PaymentForInvoice) => {
  const watermarkAsset = await resolveWatermarkAsset();
  const amountDue = formatCurrency(payment.finalPrice);
  const invoiceDate = formatDate(payment.transactionDate ?? new Date());
  const invoiceNumber = `INV-${payment._id.toString().slice(-6).toUpperCase()}`;

  const context: InvoiceContext = {
    userName: payment.user?.name || 'CreatifyX Member',
    userEmail: payment.user?.email ?? 'N/A',
    assetTitle: payment.asset.title,
    assetType: payment.asset.assetType,
    originalPrice: payment.originalPrice,
    discountAmount: payment.discountAmount,
    amountDue,
    isPremiumUser: payment.isPremiumUser,
    invoiceDate,
    invoiceNumber,
    watermarkUri: watermarkAsset.dataUri,
    watermarkFilePath: watermarkAsset.filePath,
  };

  return context;
};

const generateInvoicePdf = async (
  payment: PaymentForInvoice,
  context: InvoiceContext
) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: false,
    autoFirstPage: true,
  });
  const buffers: Buffer[] = [];

  doc.on('data', chunk => buffers.push(chunk));

  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Add logo in top right if available
  if (context.watermarkFilePath) {
    try {
      doc.image(context.watermarkFilePath, pageWidth - 110, 40, {
        fit: [60, 60],
        align: 'center',
        valign: 'center',
      });
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  // Header
  doc.fillColor('#000000');
  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('Receipt', 50, 50, { continued: false });

  // Top metadata section
  const metaTop = 90;
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#000000')
    .text('Invoice number', 50, metaTop, { continued: false, width: 100 });
  doc.font('Helvetica').fontSize(10).text(context.invoiceNumber, 150, metaTop, {
    continued: false,
    width: 200,
  });

  doc
    .font('Helvetica-Bold')
    .text('Receipt number', 50, metaTop + 16, { continued: false, width: 100 });
  doc
    .font('Helvetica')
    .text(context.invoiceNumber.replace('INV', 'REC'), 150, metaTop + 16, {
      continued: false,
      width: 200,
    });

  doc
    .font('Helvetica-Bold')
    .text('Date paid', 50, metaTop + 32, { continued: false, width: 100 });
  doc.font('Helvetica').text(context.invoiceDate, 150, metaTop + 32, {
    continued: false,
    width: 200,
  });

  doc
    .font('Helvetica-Bold')
    .text('Payment method', 50, metaTop + 48, { continued: false, width: 100 });
  doc
    .font('Helvetica')
    .text('Visa - 3531', 150, metaTop + 48, { continued: false, width: 200 });

  // Company and billing addresses
  const addressTop = metaTop + 90;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#000000')
    .text('CreatifyX, Inc.', 50, addressTop, { continued: false, width: 200 });
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(
      '450 Townsend St, Ste 100\nSan Francisco, California 94107\nUnited States\nhelp@creatifyx.ai',
      50,
      addressTop + 16,
      { continued: false, width: 200 }
    );

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Bill to', pageWidth / 2, addressTop, {
      continued: false,
      width: 200,
    });
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(
      `${context.userName}\n-\n${context.country ?? 'Bangladesh'}\n${
        context.userEmail
      }`,
      pageWidth / 2,
      addressTop + 16,
      { continued: false, width: pageWidth / 2 - 70 }
    );

  // Large amount paid
  const amountTop = addressTop + 110;
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#000000')
    .text(
      `${context.amountDue} paid on ${context.invoiceDate}`,
      50,
      amountTop,
      { continued: false, width: pageWidth - 100 }
    );

  // Table header
  const tableTop = amountTop + 50;
  doc
    .moveTo(50, tableTop)
    .lineTo(pageWidth - 50, tableTop)
    .strokeColor('#E5E7EB')
    .lineWidth(1)
    .stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#000000')
    .text('Description', 50, tableTop + 10, { continued: false, width: 150 });
  doc.text('Qty', pageWidth - 250, tableTop + 10, {
    continued: false,
    width: 50,
  });
  doc.text('Unit price', pageWidth - 170, tableTop + 10, {
    continued: false,
    width: 80,
  });
  doc.text('Amount', pageWidth - 90, tableTop + 10, {
    align: 'right',
    continued: false,
    width: 80,
  });

  // Table row
  const rowTop = tableTop + 32;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(context.assetTitle, 50, rowTop, { continued: false, width: 200 });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#666666')
    .text(`${context.assetType} Asset Purchase`, 50, rowTop + 16, {
      continued: false,
      width: 300,
    });

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#000000')
    .text('1', pageWidth - 250, rowTop, { continued: false, width: 50 });
  doc.text(context.amountDue, pageWidth - 170, rowTop, {
    continued: false,
    width: 80,
  });
  doc.font('Helvetica-Bold').text(context.amountDue, pageWidth - 90, rowTop, {
    align: 'right',
    continued: false,
    width: 80,
  });

  // Summary section
  let summaryTop = rowTop + 50;
  const summaryX = pageWidth / 2 + 50;

  const hasDiscount = context.discountAmount > 0;
  const subtotal = hasDiscount
    ? formatCurrency(context.originalPrice)
    : context.amountDue;

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#000000')
    .text('Subtotal', summaryX, summaryTop, { continued: false, width: 150 });
  doc.text(subtotal, pageWidth - 90, summaryTop, {
    align: 'right',
    continued: false,
    width: 80,
  });

  if (hasDiscount && context.isPremiumUser) {
    summaryTop += 18;
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#10b981')
      .text('Premium Discount (30%)', summaryX, summaryTop, {
        continued: false,
        width: 150,
      });
    doc.text(
      `-${formatCurrency(context.discountAmount)}`,
      pageWidth - 90,
      summaryTop,
      {
        align: 'right',
        continued: false,
        width: 80,
      }
    );
  }

  const firstDividerY = summaryTop + 22;
  doc
    .moveTo(summaryX, firstDividerY)
    .lineTo(pageWidth - 50, firstDividerY)
    .strokeColor('#E5E7EB')
    .lineWidth(1)
    .stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#000000')
    .text('Total', summaryX, firstDividerY + 8, {
      continued: false,
      width: 150,
    });
  doc.text(context.amountDue, pageWidth - 90, firstDividerY + 8, {
    align: 'right',
    continued: false,
    width: 80,
  });

  const secondDividerY = firstDividerY + 28;
  doc
    .moveTo(summaryX, secondDividerY)
    .lineTo(pageWidth - 50, secondDividerY)
    .strokeColor('#E5E7EB')
    .lineWidth(1)
    .stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Amount paid', summaryX, secondDividerY + 8, {
      continued: false,
      width: 150,
    });
  doc.text(context.amountDue, pageWidth - 90, secondDividerY + 8, {
    align: 'right',
    continued: false,
    width: 80,
  });

  // Footer - position it at the bottom of the page
  const footerY = pageHeight - 60;
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#666666')
    .text(
      `${context.invoiceNumber.replace('INV', 'REC')} - ${
        context.amountDue
      } paid on ${context.invoiceDate}`,
      50,
      footerY,
      { continued: false, width: 350, lineBreak: false }
    );
  doc.text('Page 1 of 1', pageWidth - 150, footerY, {
    continued: false,
    width: 100,
    lineBreak: false,
  });

  doc.end();
  return completed;
};

const sendIndividualPaymentInvoiceEmail = async (
  payment: PaymentForInvoice
) => {
  console.warn('sendIndividualPaymentInvoiceEmail called');
  console.warn('Payment status:', payment.paymentStatus);
  console.warn('User email:', payment.user?.email);

  if (!payment.user?.email) {
    console.warn('No user email found, skipping invoice email');
    return;
  }

  if (payment.paymentStatus !== 'completed') {
    console.warn('Payment status is not completed, skipping invoice email');
    return;
  }

  console.warn('Building invoice context...');
  const context = await buildInvoiceContext(payment);

  console.warn('Generating HTML and PDF...');
  const [html, pdfBuffer] = await Promise.all([
    Promise.resolve(buildInvoiceHtml(context)),
    generateInvoicePdf(payment, context),
  ]);

  const attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    cid?: string;
  }> = [
    {
      filename: `${context.invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    },
  ];

  // Add logo as inline attachment if available
  if (context.watermarkFilePath) {
    try {
      const logoBuffer = await fs.readFile(context.watermarkFilePath);
      attachments.push({
        filename: 'logo.png',
        content: logoBuffer,
        contentType: 'image/png',
        cid: 'logo',
      });
    } catch (error) {
      console.error('Error reading logo for email:', error);
    }
  }

  console.warn('Sending email to:', payment.user.email);
  console.warn('Subject:', `Your ${payment.asset.title} purchase invoice`);

  await sendEmail({
    to: payment.user.email,
    subject: `Your ${payment.asset.title} purchase invoice`,
    html,
    attachments,
  });

  console.warn('Email sent successfully!');
};

export type { PaymentForInvoice };
export { sendIndividualPaymentInvoiceEmail };
