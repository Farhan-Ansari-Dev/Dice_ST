# DICE — AWS SNS Push Notification Readiness (Phase 5 Audit)

> Evidence-based readiness audit. **No external changes were made.** `PUSH_PROVIDER=off`
> and `enable_push_notifications=false` remain in force. This document does not modify
> `docs/SYSTEM_DESIGN.md` (reserved for Phase 13).

Region: `ap-south-1` · AWS account: `066756667240` · Bundle/package: `com.sanyogconformity.app`

---

## A. Current architecture

```
Mobile (expo-notifications, getDevicePushTokenAsync)
   → POST /notifications/push-tokens {token, platform, appVersion}
       → Backend notify() (single send path)
            ├── MongoDB Notification (in-app inbox — always)
            └── snsService.publishToUser() → AWS SNS → APNs / FCM v1 → device
Delivery gated by: backend PUSH_PROVIDER (off) AND mobile enable_push_notifications (false)
```

- Backend auth to AWS: **static IAM-user keys** (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) — `validateEnv.ts:16-17` makes them **required in prod**, and `invoiceService.ts:9-12` reads them explicitly. Identity = IAM user `Dice_Backend`. An **EC2 instance role also exists** (`infra/terraform/main.tf:136` `aws_iam_role.ec2` / `dice-ec2-profile`, attached at `main.tf:192`) with CloudWatch + S3 policies only — but the app's env keys take precedence in the SDK default chain, so the role is not the effective identity today.
- SNS client (`sns.ts`) uses the **default credential chain** (no explicit keys) → works with either env keys or the instance role.

## B. What Phase 3 implemented (backend)

- `models/Device.ts` — endpoint model (`user_id, platform, device_token[unique], sns_endpoint_arn, enabled, app_version, device_name, last_seen, timestamps`); indexes `{user_id,enabled}`, `{sns_endpoint_arn}`.
- `services/notifications/sns.ts` — endpoint lifecycle (`CreatePlatformEndpoint`, `GetEndpointAttributes`, `SetEndpointAttributes`, `DeleteEndpoint`, `Publish`), payload shaping (APNS + FCM v1), masked logging, `PUSH_PROVIDER` gate.
- `notify()` push transport switched Expo→SNS; legacy `notificationService` consolidated to a thin adapter over `notify()`.
- `routes/v2/notifications.ts` — `POST/DELETE /push-tokens` accept native `{token, platform, appVersion}` (Expo validation removed; delete = soft-disable).
- `validateEnv.ts` — requires SNS ARNs only when `PUSH_PROVIDER=sns`.
- Tests: `notifications.sns.test.ts` (16, green). Full suite 254 pass (1 pre-existing unrelated failure).

## C. What Phase 4 implemented (mobile)

- `App.tsx` — `getDevicePushTokenAsync()` (native APNs/FCM); Android channels at startup; `addPushTokenListener` (rotation); `getLastNotificationResponseAsync` (cold-start); `AppState` resume re-register; tap→centralized nav; **all gated by `enable_push_notifications`**.
- `services/notificationRouter.ts` — `navigationRef` + single `handleNotificationData/Response`.
- `notificationsService.registerPushToken(token, platform, appVersion)`; `authStore.logout()` → `unregisterPushToken()` before clearing auth.
- Dead modules migrated off Expo token; `ios/.../Info.plist` gained `UIBackgroundModes: remote-notification`.
- Builds: Android `assembleDebug` SUCCESSFUL; iOS `xcodebuild` SUCCEEDED; JS bundle (expo export) clean; `tsc` clean.

## D. Missing AWS resources

No SNS **platform applications** for mobile push exist (Terraform declares only an ops-alerts `aws_sns_topic`, `main.tf:335` — unrelated). Required:

| Platform app | Type | Credential | Env / build | Backend variable | Used by |
|---|---|---|---|---|---|
| `DICE_Production_iOS` | APNS | APNs `.p8` key (Key ID + Team ID) | production | `SNS_PLATFORM_APP_ARN_IOS` | `sns.ts` prod iOS |
| `DICE_Dev_iOS` | APNS_SANDBOX | same `.p8` | sandbox | `SNS_PLATFORM_APP_ARN_IOS_SANDBOX` | `sns.ts` when `NODE_ENV≠production` |
| `DICE_Production_Android` | GCM (FCM v1) | FCM service-account JSON | production | `SNS_PLATFORM_APP_ARN_ANDROID` | `sns.ts` Android |

`APNS_SANDBOX` **is required** for on-device testing before the production build (dev/EAS-development builds mint sandbox APNs tokens; `sns.ts:useApnsSandbox()` selects it in non-prod).

## E. Missing Android resources (before FCM works)

Evidence — Expo `~54`, RN `~0.81`; **no** `google-services.json`, **no** `com.google.gms.google-services` plugin in `android/build.gradle`/`android/app/build.gradle`; `AndroidManifest.xml:26` sets `firebase_messaging_auto_init_enabled=false`; `app.json` has no `googleServicesFile`. Required (Phase 9):
1. Firebase project + Android app `com.sanyogconformity.app` → **`google-services.json`** (client config; safe to commit).
2. `google-services` Gradle plugin wired (classpath + apply) — **[Claude can automate]**.
3. Flip `firebase_messaging_auto_init_enabled` → `true` (keep Analytics disabled) — **[Claude]**.
4. `app.json` `android.googleServicesFile` pointer — **[Claude]**.
5. **FCM service-account JSON** for the SNS Android platform app (server-side only; never in the app).
> Firebase is used **only** as the FCM transport — no Auth/Firestore/Analytics/Storage.

## F. Missing iOS resources (before APNs works)

Evidence — `DicebySanyog.entitlements` has `aps-environment=development`; `Info.plist` now has `UIBackgroundModes: remote-notification`; bundle `com.sanyogconformity.app`; push capability present. Required (Phase 8):
1. **APNs Auth Key (`.p8`)** + Key ID + Team ID (Apple Developer → Keys). First check whether EAS already manages a reusable push key.
2. `aps-environment` → `production` for the production build (EAS-managed) — **[Claude/EAS]**.
3. Register the `.p8` on the SNS iOS platform app(s) — **[Claude via CLI, given the file path]**.

## G. IAM policy required (least privilege)

**Runtime** (attach to the identity the backend authenticates as — today the `Dice_Backend` user; preferred target: the `dice-ec2-role` once the app drops static keys):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DicePushRuntime",
    "Effect": "Allow",
    "Action": [
      "sns:CreatePlatformEndpoint",
      "sns:GetEndpointAttributes",
      "sns:SetEndpointAttributes",
      "sns:DeleteEndpoint",
      "sns:Publish"
    ],
    "Resource": [
      "arn:aws:sns:ap-south-1:066756667240:app/APNS/DICE_Production_iOS",
      "arn:aws:sns:ap-south-1:066756667240:app/APNS_SANDBOX/DICE_Dev_iOS",
      "arn:aws:sns:ap-south-1:066756667240:app/GCM/DICE_Production_Android",
      "arn:aws:sns:ap-south-1:066756667240:endpoint/APNS/DICE_Production_iOS/*",
      "arn:aws:sns:ap-south-1:066756667240:endpoint/APNS_SANDBOX/DICE_Dev_iOS/*",
      "arn:aws:sns:ap-south-1:066756667240:endpoint/GCM/DICE_Production_Android/*"
    ]
  }]
}
```

- **Required** (used by `sns.ts`): `CreatePlatformEndpoint`, `GetEndpointAttributes`, `SetEndpointAttributes`, `DeleteEndpoint`, `Publish`.
- **Provisioning-only** (NOT for the runtime backend — for whoever creates the platform apps, i.e. Claude-CLI or Terraform): `sns:CreatePlatformApplication`, `sns:SetPlatformApplicationAttributes`, `sns:GetPlatformApplicationAttributes`, `sns:ListPlatformApplications`, `sns:DeletePlatformApplication`.
- **Unnecessary**: `sns:Subscribe`, topic actions, `sns:*` wildcard, account-wide `Resource: "*"`.

> **Preferred path (per policy):** attach the runtime policy to `dice-ec2-role`, remove static AWS keys from `/etc/dice/.env`, and relax `validateEnv` so the app uses the instance role (no long-lived keys). **Pragmatic path:** attach the runtime policy to the `Dice_Backend` user (zero code change) — acceptable but keeps static keys.

## H. Required environment variables

`PUSH_PROVIDER` (default `off`; set `sns` to enable), `SNS_PLATFORM_APP_ARN_IOS`, `SNS_PLATFORM_APP_ARN_IOS_SANDBOX`, `SNS_PLATFORM_APP_ARN_ANDROID`. Reuse existing `AWS_REGION`, and AWS creds (env keys today; instance role under the preferred path). Live values belong in `/etc/dice/.env` (prod) — **not** the repo. Current four vars are **sufficient**; no additional vars needed. (Mobile needs no new env; `appVersion` comes from `APP_VERSION` constant.)

## I. Exact manual actions you must perform (external accounts)

1. **Firebase/FCM** — create project → add Android app `com.sanyogconformity.app` → download `google-services.json`; then Service accounts → generate FCM **service-account JSON**. Give me: the `google-services.json` placed at `mobile-app/google-services.json`, and the **file path** of the service-account JSON (never paste its contents).
2. **Apple APNs** — Apple Developer → Keys → create an APNs Auth Key. Give me: **Key ID + Team ID** (safe) and the **file path** of the `.p8` (never paste its contents). I will first check EAS for a reusable key and tell you if this is even needed.
3. **AWS IAM** — attach the §G runtime policy to the chosen identity (or confirm I may create it via CLI). If you want the preferred role-based path, confirm I may relax `validateEnv` + drop static keys.

## J. Exact Claude actions that can be automated

- Create the 3 SNS platform applications via AWS CLI (once §I.1–2 credentials exist and IAM allows) and capture their ARNs.
- Wire Android `google-services` Gradle plugin, `app.json` pointer, flip auto-init; set iOS `aps-environment=production` via EAS.
- Populate `/etc/dice/.env` ARNs — **only when you authorize touching prod** (out of scope now).
- Build/verify both platforms; run backend tests; write the SNS section into `SYSTEM_DESIGN.md` (Phase 13).

## K. Test strategy

Backend (done, mocked SNS): endpoint create/reuse/rotate/reactivate, soft-disable, dead-endpoint cleanup, multi-device, provider-off no-op, inbox preservation, payload shaping. Live (after provisioning): CLI `aws sns publish` to a real endpoint per platform; then device matrix — foreground / background / **killed-cold-start** / multi-device / logout / token-rotation / disabled-endpoint / invalid-token / notifications-OS-disabled / preferences-off / deep-link nav. **No delivery claimed without on-device receipt evidence.**

## L. Production rollout strategy

`OFF` → create SNS platform apps + IAM → backend CLI publish test → **Android internal device** (sandbox/dev) → **iOS physical device** (sandbox) → set prod ARNs in `/etc/dice/.env`, deploy with `PUSH_PROVIDER` still `off` → flip `PUSH_PROVIDER=sns` (backend can publish, app not yet registering) → enable `enable_push_notifications` for a **test user**, then a **small cohort**, then **all** → monitor (SNS delivery metrics / CloudWatch, `[push:sns]` logs) → rollback = flip either flag.

## M. Security risks

- ✅ No secrets tracked: `backend/.env` untracked; no `.p8`/`google-services.json`/service-account committed; `sns.ts` never logs full tokens (masks ARNs).
- ⚠️ **Terraform `.gitignore` only excludes `.terraform/`** — `terraform.tfstate` (may contain sensitive attrs) is currently untracked but not explicitly ignored; add `*.tfstate*` to prevent accidental `git add`.
- ⚠️ **Static AWS keys** in prod env (invoiceService/validateEnv) — migrate to the instance role (§G preferred path) to eliminate long-lived credentials.
- ✅ IAM scoped to platform-app + endpoint ARNs (no `sns:*`, no `Resource:"*"`).
- Keep FCM service-account JSON & APNs `.p8` **server/EAS-side only**, never bundled in the app.

## N. Rollback strategy

Two independent kill-switches, neither touches the inbox: **`PUSH_PROVIDER=off`** (backend `publishToUser` no-ops; inbox/email/SMS unaffected) and **`enable_push_notifications=false`** (app never registers/handles push). `User.expo_push_tokens` retained for legacy fallback until SNS proven in prod.

## O. Final readiness score

| Area | Status |
|---|---|
| Backend SNS code | ✅ Ready (tested, mocked) |
| Mobile native-token code | ✅ Ready (builds green) |
| Payload/inbox/rollback | ✅ Ready |
| SNS platform apps | ❌ Not created (needs FCM + APNs creds) |
| IAM SNS permissions | ❌ Not attached |
| Android FCM (`google-services.json`) | ❌ Missing (hard blocker for Android delivery) |
| iOS APNs key + prod entitlement | ❌ Missing |

**Overall: code-complete, infrastructure-pending — ~6/10.** All remaining work is external provisioning behind 3 gates (Firebase/FCM, Apple APNs, AWS IAM+platform apps). No code blockers.

### Known gap to close in Phase 6 (navigation)
The end-to-end **`{screen, entityId}`** contract is implemented in `sns.ts`/`notificationRouter.ts`, but current `notify()` callers emit `type` + entity-specific keys (e.g. `leadId`, `ticketId`, `applicationId`) rather than normalized `screen`/`entityId`. Tap navigation works via `type`→route mapping and the raw data is delivered, but `params.id` won't populate from those keys until callers emit `entityId` (or the router maps the entity-specific keys). Also, `notify()` always uses `channel_id='default'` — the `compliance`/`applications` channels exist but are unused until callers pass a channel. Non-blocking; to normalize in Phase 6.
