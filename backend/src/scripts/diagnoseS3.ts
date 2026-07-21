/**
 * S3 finalize diagnostic — run in the SAME environment/credentials as the API
 * (e.g. on the EC2/server where uploads fail), NOT locally with placeholder keys.
 *
 * Read-only. Uses only @aws-sdk/client-s3 (already a dependency) and performs
 * exactly the calls finalizeUpload depends on, printing the precise AWS exception
 * so the root cause is identified, not guessed.
 *
 *   Usage:
 *     npx ts-node src/scripts/diagnoseS3.ts <s3_key_that_was_just_uploaded>
 *
 *   <s3_key> should be a key the browser just PUT successfully (copy it from the
 *   presign response / network tab). If omitted, only bucket reachability is checked.
 */
import 'dotenv/config';
import { S3Client, HeadObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION ?? 'ap-south-1';
const BUCKET = process.env.AWS_S3_BUCKET ?? 'sanyog-conformity-docs';
const KEY = process.argv[2];

function dump(label: string, e: any) {
  console.log(`\n❌ ${label} FAILED`);
  console.log('   name            :', e?.name);
  console.log('   Code            :', e?.Code ?? e?.code);
  console.log('   httpStatusCode  :', e?.$metadata?.httpStatusCode);
  console.log('   message         :', e?.message);
  if (e?.$metadata?.requestId) console.log('   requestId       :', e.$metadata.requestId);
}

(async () => {
  console.log('=== S3 finalize diagnostic ===');
  console.log('Region :', REGION);
  console.log('Bucket :', BUCKET);
  console.log('Key    :', KEY ?? '(none passed)');
  console.log('AccessKeyId prefix:', (process.env.AWS_ACCESS_KEY_ID ?? '').slice(0, 4) + '…');

  const s3 = new S3Client({ region: REGION });

  // 1) Bucket reachability. A signed call here also validates the credentials,
  //    so invalid keys / wrong region / wrong bucket all surface at this step.
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log('\n✅ HeadBucket OK — credentials valid, bucket reachable in', REGION);
  } catch (e: any) {
    dump('HeadBucket', e);
    const name = e?.name;
    const code = e?.$metadata?.httpStatusCode;
    let cause = '→ CAUSE: caller cannot reach the bucket (likely missing s3:ListBucket or a bucket policy denial).';
    if (name === 'InvalidAccessKeyId')       cause = '→ CAUSE (#3): InvalidAccessKeyId — AWS_ACCESS_KEY_ID is wrong/rotated/deleted. Fix the key.';
    else if (name === 'SignatureDoesNotMatch') cause = '→ CAUSE (#4): SignatureDoesNotMatch — AWS_SECRET_ACCESS_KEY is wrong. Fix the secret.';
    else if (name === 'PermanentRedirect' || code === 301) cause = '→ CAUSE (#5/#7): PermanentRedirect — bucket is in a DIFFERENT region than AWS_REGION. Set AWS_REGION to the bucket\'s real region.';
    else if (name === 'NoSuchBucket' || code === 404) cause = '→ CAUSE (#6): NoSuchBucket — AWS_S3_BUCKET name is wrong / bucket does not exist.';
    else if (name === 'AccessDenied' || code === 403) cause = '→ CAUSE: AccessDenied at bucket level — creds valid but bucket policy / IAM denies. See fields above.';
    console.log('\n' + cause);
    process.exit(1);
  }

  // 2) The exact call finalizeUpload makes — distinguishes AccessDenied vs NoSuchKey.
  if (!KEY) {
    console.log('\nℹ️  No <s3_key> passed — re-run with the key the browser just uploaded to test HeadObject.');
    return;
  }
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: KEY }));
    console.log('\n✅ HeadObject OK — object exists AND caller has permission.');
    console.log('   ContentLength :', head.ContentLength);
    console.log('   ETag          :', head.ETag);
    console.log('\n→ finalize should NOT fail on this key. If it does, the API runtime uses different creds/env than this script.');
  } catch (e: any) {
    dump('HeadObject', e);
    const code = e?.$metadata?.httpStatusCode;
    if (e?.name === 'AccessDenied' || code === 403) {
      console.log('\n→ CAUSE (#1/#8): AccessDenied. The browser PUT works (presigning is local signing), but this IAM identity lacks s3:GetObject on the object. HeadObject requires s3:GetObject. Fix = add s3:GetObject for this key prefix (IAM diff below).');
    } else if (e?.name === 'NotFound' || e?.name === 'NoSuchKey' || code === 404) {
      console.log('\n→ CAUSE (#2): NoSuchKey. Object is not at this exact key — key/prefix mismatch between presign and finalize, or the PUT did not persist. Compare presign s3_key vs the key sent to /finalize.');
    } else {
      console.log('\n→ CAUSE: unexpected — report name/Code/httpStatusCode above.');
    }
  }
})();
