/**
 * Email via AWS SES.
 *
 * SES Free Tier: 62,000 emails/month if sent from EC2.
 * Otherwise: $0.10 per 1000 emails.
 *
 * Setup:
 *   1. Verify your domain in SES (Mumbai region)
 *   2. Add TXT + MX records as instructed by SES
 *   3. Request production access (exit sandbox) — takes ~24h
 *   4. EC2 IAM role already has SES send permission (via Terraform)
 */
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '../../utils/logger';

const ses = new SESClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });
const FROM = process.env.EMAIL_FROM ?? 'noreply@sanyogconformity.com';

export interface EmailInput {
  to: string;
  subject: string;
  body: string;                              // plain-text fallback
  template?: string;                         // logical name → HTML template lookup
  data?: Record<string, any>;
  reply_to?: string;
}

export async function sendEmail(input: EmailInput): Promise<boolean> {
  const html = renderTemplate(input.template ?? 'generic', {
    title: input.subject,
    body: input.body,
    ...input.data,
  });

  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM,
        Destination: { ToAddresses: [input.to] },
        ReplyToAddresses: input.reply_to ? [input.reply_to] : undefined,
        Message: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: input.body, Charset: 'UTF-8' },
            Html: { Data: html, Charset: 'UTF-8' },
          },
        },
        // Tags for SES analytics (open rate, bounces by category)
        Tags: input.template
          ? [{ Name: 'template', Value: input.template }]
          : undefined,
      })
    );
    return true;
  } catch (err: any) {
    logger.error(`[email] send to ${input.to} failed: ${err.message}`);
    return false;
  }
}

/**
 * Minimal HTML template renderer.
 * For richer templates, swap to mjml + handlebars later.
 */
function renderTemplate(name: string, data: Record<string, any>): string {
  const base = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>${esc(data.title ?? 'DICE')}</title></head>
    <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #333;">
      <div style="background: linear-gradient(135deg, #6C63FF, #4D45CC); padding: 24px; border-radius: 12px; color: white; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 24px;">${esc(data.title ?? '')}</h1>
      </div>
      <div style="background: #f7f8fa; padding: 24px; border-radius: 12px;">
        <p style="line-height: 1.6; margin: 0 0 16px;">${esc(data.body ?? '')}</p>
        ${data.cta_url ? `<a href="${esc(data.cta_url)}" style="display: inline-block; background: #6C63FF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">${esc(data.cta_label ?? 'View')}</a>` : ''}
      </div>
      <p style="text-align: center; color: #888; font-size: 12px; margin-top: 32px;">
        Sanyog Conformity Solutions · ${new Date().getFullYear()}<br>
        <a href="${process.env.FRONTEND_URL}/settings/notifications" style="color: #6C63FF;">Manage notification preferences</a>
      </p>
    </body></html>`;
  return base;
}

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
