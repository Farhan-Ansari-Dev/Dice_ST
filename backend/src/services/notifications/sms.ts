/**
 * SMS via MSG91 (India) — DLT-compliant template-based sending.
 *
 * Setup:
 *   1. Register at msg91.com
 *   2. Approve your DLT templates (TRAI requirement for Indian SMS)
 *   3. Set MSG91_AUTH_KEY, MSG91_SENDER_ID
 *
 * For non-Indian numbers, falls back to Twilio (configurable).
 *
 * Cost: ~₹0.16–0.25 per Indian SMS. Use sparingly (critical alerts only).
 */
import { logger } from '../../utils/logger';

export interface SMSInput {
  to: string;
  text: string;
  country_code?: string;
  template_id?: string;
  variables?: Record<string, string>;
}

export async function sendSMS(input: SMSInput): Promise<boolean> {
  const phone = normalizePhone(input.to, input.country_code);
  if (!phone) {
    logger.warn(`[sms] invalid number: ${input.to}`);
    return false;
  }

  // India → MSG91
  if (phone.startsWith('91') && process.env.MSG91_AUTH_KEY) {
    return sendMsg91({ ...input, to: phone });
  }

  // Non-India → Twilio (if configured)
  if (process.env.TWILIO_ACCOUNT_SID) {
    return sendTwilio({ ...input, to: phone });
  }

  logger.warn(`[sms] no provider configured for country (${input.country_code})`);
  return false;
}

async function sendMsg91(input: SMSInput): Promise<boolean> {
  try {
    const url = 'https://control.msg91.com/api/v5/flow/';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': process.env.MSG91_AUTH_KEY!,
      },
      body: JSON.stringify({
        template_id: input.template_id ?? process.env.MSG91_TEMPLATE_ID,
        sender: process.env.MSG91_SENDER_ID ?? 'SCSOLN',
        short_url: '1',
        mobiles: input.to,
        ...(input.variables ?? { var1: input.text.slice(0, 100) }),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error(`[sms:msg91] ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error(`[sms:msg91] ${err.message}`);
    return false;
  }
}

async function sendTwilio(input: SMSInput): Promise<boolean> {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_FROM!;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: '+' + input.to,
          From: from,
          Body: input.text,
        }),
      }
    );
    return res.ok;
  } catch (err: any) {
    logger.error(`[sms:twilio] ${err.message}`);
    return false;
  }
}

function normalizePhone(raw: string, country_code?: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && country_code === 'IN') return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}
