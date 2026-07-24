/**
 * SES / Email delivery diagnostic.
 *
 * Pinpoints exactly why POST /auth/send-otp returns 502 in production. Run it
 * in the environment whose email you are debugging (i.e. with the production
 * AWS credentials and env), and it reports each failure mode independently:
 *
 *   npx ts-node src/scripts/diagnoseSes.ts               (checks + safe read-only calls)
 *   npx ts-node src/scripts/diagnoseSes.ts you@email.com (also attempts a real send)
 *
 * Checks, in order:
 *   1. Credentials     — are AWS_ACCESS_KEY_ID / SECRET set and non-placeholder?
 *   2. Region          — which region the SES client targets
 *   3. Sender identity — is EMAIL_FROM (and its domain) a verified SES identity?
 *   4. Sandbox status  — is the account in the SES sandbox (send quota == 200)?
 *   5. Send attempt    — the exact AWS error name if a real send fails
 *
 * Read-only except the optional send. Never sends unless a recipient is passed.
 */
import {
  SESClient,
  GetSendQuotaCommand,
  GetIdentityVerificationAttributesCommand,
  ListIdentitiesCommand,
  SendEmailCommand,
} from '@aws-sdk/client-ses';

const PLACEHOLDERS = new Set(['your', 'your-access-key', 'changeme', 'replace_me', 'xxxx']);

function mask(v?: string): string {
  if (!v) return '(unset)';
  if (PLACEHOLDERS.has(v.toLowerCase()) || v.toLowerCase().startsWith('your')) return `PLACEHOLDER ("${v}")`;
  return v.length <= 8 ? '(too short)' : `${v.slice(0, 4)}…${v.slice(-2)} (len ${v.length})`;
}

async function main() {
  const region = process.env.AWS_REGION ?? 'ap-south-1';
  const from = process.env.EMAIL_FROM ?? 'noreply@sanyogconformity.com';
  const recipient = process.argv[2];

  console.log('── SES diagnostic ─────────────────────────────────────────');
  console.log(`  AWS_REGION          : ${region}`);
  console.log(`  EMAIL_FROM          : ${from}`);
  console.log(`  AWS_ACCESS_KEY_ID   : ${mask(process.env.AWS_ACCESS_KEY_ID)}`);
  console.log(`  AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'set' : '(unset)'}`);
  console.log('───────────────────────────────────────────────────────────\n');

  const idLower = (process.env.AWS_ACCESS_KEY_ID ?? '').toLowerCase();
  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.log('⚠  No AWS_ACCESS_KEY_ID in env. The SDK will fall back to the');
    console.log('   default credential chain (shared config / instance role).');
  } else if (PLACEHOLDERS.has(idLower) || idLower.startsWith('your')) {
    console.log('✗  AWS_ACCESS_KEY_ID is a PLACEHOLDER. This alone causes every');
    console.log('   SES call to fail with InvalidClientTokenId and send-otp to 502.');
    console.log('   → Set real IAM credentials with ses:SendEmail permission.\n');
  }

  const ses = new SESClient({ region });

  // 1 & 4: quota also proves credentials work and reveals sandbox status.
  try {
    const quota = await ses.send(new GetSendQuotaCommand({}));
    const inSandbox = quota.Max24HourSend === 200; // classic sandbox cap
    console.log('✓  Credentials valid — SES responded to GetSendQuota.');
    console.log(`   Max24HourSend=${quota.Max24HourSend}, SentLast24Hours=${quota.SentLast24Hours}`);
    console.log(inSandbox
      ? '⚠  Account appears to be in the SES SANDBOX (200/day). In sandbox you can\n' +
        '   ONLY send to verified recipients. → Request production access in SES.\n'
      : '✓  Account is out of the sandbox (production sending enabled).\n');
  } catch (e: any) {
    console.log(`✗  GetSendQuota failed: ${e?.name ?? e?.Code} — ${e?.message}`);
    console.log('   This is a CREDENTIALS or REGION problem. If InvalidClientTokenId /');
    console.log('   SignatureDoesNotMatch → the keys are wrong. If the region has no SES');
    console.log('   → set AWS_REGION to where your identities are verified.\n');
  }

  // 3: sender verification.
  try {
    const domain = from.split('@')[1];
    const attrs = await ses.send(new GetIdentityVerificationAttributesCommand({ Identities: [from, domain] }));
    const fromStatus = attrs.VerificationAttributes?.[from]?.VerificationStatus;
    const domainStatus = attrs.VerificationAttributes?.[domain]?.VerificationStatus;
    console.log(`   Sender "${from}" verification : ${fromStatus ?? 'not an identity'}`);
    console.log(`   Domain "${domain}" verification: ${domainStatus ?? 'not an identity'}`);
    if (fromStatus !== 'Success' && domainStatus !== 'Success') {
      console.log('✗  Neither the sender address nor its domain is a verified SES identity.');
      console.log('   → Verify the domain (or address) in SES and add the DKIM/TXT records.\n');
    } else {
      console.log('✓  Sender identity is verified.\n');
    }

    const list = await ses.send(new ListIdentitiesCommand({}));
    console.log(`   All verified identities in ${region}: ${(list.Identities ?? []).join(', ') || '(none)'}\n`);
  } catch (e: any) {
    console.log(`✗  Identity check failed: ${e?.name ?? e?.Code} — ${e?.message}\n`);
  }

  // 5: optional real send.
  if (recipient) {
    console.log(`Attempting a real send to ${recipient} …`);
    try {
      const out = await ses.send(new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [recipient] },
        Message: {
          Subject: { Data: 'DICE SES diagnostic', Charset: 'UTF-8' },
          Body: { Text: { Data: 'If you received this, SES delivery works.', Charset: 'UTF-8' } },
        },
      }));
      console.log(`✓  Sent. MessageId=${out.MessageId}`);
    } catch (e: any) {
      console.log(`✗  Send failed: ${e?.name ?? e?.Code} — ${e?.message}`);
      console.log('   MessageRejected + "not verified" in sandbox → verify the recipient,');
      console.log('   or exit the sandbox. InvalidClientTokenId → bad credentials.');
    }
  } else {
    console.log('(No recipient passed — skipped the real-send test. Pass an email to test delivery.)');
  }
}

main().catch((e) => { console.error('Diagnostic crashed:', e); process.exit(1); });
