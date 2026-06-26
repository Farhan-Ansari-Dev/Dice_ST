import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { IPayment } from '../models/Payment';
import { IUser } from '../models/User';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const generateInvoicePDF = async (payment: IPayment, user: IUser): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(buffers);
        
        // Upload to S3
        const bucketName = process.env.S3_UPLOAD_BUCKET || 'sanyog-admin-prod-panel-9x2b';
        const fileName = `invoices/${payment._id}_${Date.now()}.pdf`;
        
        try {
          await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            ACL: 'public-read' // Make it accessible so user can download
          }));
          
          const url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileName}`;
          resolve(url);
        } catch (uploadError) {
          reject(uploadError);
        }
      });

      // Build PDF
      doc.fontSize(20).text('INVOICE', { align: 'right' });
      doc.fontSize(10).text(`Invoice Number: ${payment.invoice_number || payment._id.toString().slice(0, 8).toUpperCase()}`, { align: 'right' });
      doc.text(`Date: ${new Date(payment.created_at).toLocaleDateString()}`, { align: 'right' });
      doc.moveDown();

      doc.fontSize(16).text('Sanyog Conformity Solutions');
      doc.fontSize(10).text('New Delhi, India');
      doc.text('Email: billing@sanyogconformity.com');
      doc.moveDown();

      doc.fontSize(12).text('Bill To:');
      doc.fontSize(10).text(user.name);
      doc.text(user.email);
      doc.moveDown(2);

      // Line items
      const symbol = payment.currency === 'INR' ? 'INR' : 'USD';
      
      const drawRow = (y: number, item: string, amount: string) => {
        doc.fontSize(10).text(item, 50, y);
        doc.text(amount, 400, y, { width: 100, align: 'right' });
      };

      let y = doc.y;
      doc.font('Helvetica-Bold');
      drawRow(y, 'Description', 'Amount');
      doc.font('Helvetica');
      doc.moveTo(50, y + 15).lineTo(500, y + 15).stroke();
      y += 25;

      if (payment.gov_fee_paise) {
        drawRow(y, 'Government Fee', `${symbol} ${(payment.gov_fee_paise / 100).toFixed(2)}`);
        y += 20;
      }
      if (payment.lab_fee_paise) {
        drawRow(y, 'Lab Testing Fee', `${symbol} ${(payment.lab_fee_paise / 100).toFixed(2)}`);
        y += 20;
      }
      if (payment.consultancy_fee_paise) {
        drawRow(y, 'Sanyog Consultancy Fee', `${symbol} ${(payment.consultancy_fee_paise / 100).toFixed(2)}`);
        y += 20;
      }

      doc.moveTo(50, y + 5).lineTo(500, y + 5).stroke();
      y += 15;

      drawRow(y, 'Subtotal', `${symbol} ${((payment.amount_paise) / 100).toFixed(2)}`);
      y += 20;

      if (payment.tax_rate) {
        drawRow(y, `Tax (GST ${payment.tax_rate}%)`, `${symbol} ${(payment.tax_amount_paise / 100).toFixed(2)}`);
        y += 20;
      }

      doc.moveTo(250, y + 5).lineTo(500, y + 5).stroke();
      y += 15;
      
      doc.font('Helvetica-Bold');
      drawRow(y, 'Total Amount', `${symbol} ${(payment.total_paise / 100).toFixed(2)}`);
      doc.font('Helvetica');
      y += 30;

      // TDS Note for International
      if (payment.currency !== 'INR' && (!payment.tax_rate || payment.tax_rate === 0)) {
        doc.fontSize(9).fillColor('gray');
        doc.text('* Subject to applicable TDS deductions as per local laws.', 50, y);
        doc.fillColor('black');
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};
