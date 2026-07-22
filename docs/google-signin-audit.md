# Google Sign-In — Configuration Audit

Audit of every layer in the Google Sign-In chain, performed against the
repository. Values marked **verified** were extracted from the repo or the
keystores. Values marked **requires console access** cannot be checked from
source and must be confirmed in the Google Cloud Console.

---

## 1. Firebase

**Not used, and not required.**

- No `firebase` / `@react-native-firebase/*` dependency in `mobile-app/package.json`.
- No `google-services.json` anywhere in `mobile-app/android/`.
- No `com.google.gms.google-services` Gradle plugin applied.

This is correct for the current integration. `@react-native-google-signin/google-signin`
v16 only needs `google-services.json` when it is being driven through Firebase Auth.
In the standalone (Google Identity) mode this app uses, it needs:

1. an **Android OAuth client** registered with the package name + signing SHA-1, and
2. a **Web OAuth client** whose ID is passed as `webClientId` to mint the ID token.

Do not add `google-services.json` without also introducing Firebase — it would
be inert and misleading.

## 2. Package / bundle identifier — verified, consistent

| Location | Value |
|---|---|
| `app.json` → `android.package` | `com.sanyogconformity.app` |
| `app.json` → `ios.bundleIdentifier` | `com.sanyogconformity.app` |
| `android/app/build.gradle` → `namespace` | `com.sanyogconformity.app` |
| `android/app/build.gradle` → `applicationId` | `com.sanyogconformity.app` |

No mismatch.

## 3. Signing fingerprints — verified

Extracted with `keytool` and cross-checked against `./gradlew :app:signingReport`.

### Debug (`android/app/debug.keystore`, alias `androiddebugkey`)

```
SHA-1:   5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
SHA-256: FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

Note: this is the **React Native template debug keystore** (`CN=Android Debug`,
valid from 2014) that ships checked into the repo. It is shared by every project
using that template, so this fingerprint is public. Acceptable for debug; it must
never be used for a release.

### Release / upload (`android/app/dice-release-key.jks`, alias `dice-release`)

```
SHA-1:   EA:24:44:24:2E:3E:51:BD:F5:B7:8F:E8:18:ED:4C:EC:8F:90:9C:E9
SHA-256: B5:B0:FA:72:90:CE:65:4A:C9:10:99:DB:FD:10:0F:2D:B3:E8:4C:8F:C8:1F:AD:AA:7A:CE:22:17:65:93:40:84
```

Owner: `CN=Sanyog, O=Sanyog Conformity Solutions Pvt Ltd, L=Noida, C=IN`.

## 4. OAuth clients — partially verified

Four client IDs are accepted by the backend (`GOOGLE_CLIENT_IDS`), all under
project `630266247798`:

| Type | Client ID prefix | Used by |
|---|---|---|
| Web | `…-1o3aqgfe7ej0fn4e7f0369etpub0vou0` | `webClientId` — mints the ID token. Also the backend's primary audience. |
| Android | `…-qv71igsmsr93qp499akq7se5amn9finv` | Authorises the app by package + SHA-1. Never referenced in client code by design. |
| iOS | `…-h5o7hfqtact2r4ciok4b9ai3tm93jgrb` | `iosClientId`; its reversed form is the `iosUrlScheme` in `app.json`. **Verified matching.** |
| Fourth | `…-51om14…` | Unidentified — audit and remove if unused. |

**Requires console access:** confirm the Android OAuth client has *both* the debug
and release SHA-1 above registered against `com.sanyogconformity.app`. A missing
SHA-1 produces `DEVELOPER_ERROR` (status code 10) on the device — now visible in
the dev console after the logging fix.

## 5. Play App Signing — the highest-risk unverified item

If the app is distributed through Play with **Play App Signing enabled** (the
default for new apps), Google re-signs the upload with a *different* key. The
fingerprint that matters at runtime is then the **app signing key**, not the
upload key above.

This is the classic cause of "Google Sign-In works in debug and in internal
testing, but fails in production".

**Action:** in Play Console → *Release → Setup → App signing*, copy the
**app signing key SHA-1** and register it on the Android OAuth client alongside
the two fingerprints above. Registering the upload key alone is not sufficient.

## 6. Expo configuration — verified, fixed

`app.json` declares the google-signin plugin with
`iosUrlScheme: com.googleusercontent.apps.630266247798-h5o7hfqtact2r4ciok4b9ai3tm93jgrb`,
which correctly matches the iOS client ID.

**Defect found and fixed:** the web client ID reached the app only through
`mobile-app/.env`, which is gitignored, and `eas.json` declares no `env` block.
Every CI build therefore bundled `webClientId: undefined`. Android then completes
the account picker but returns a **null ID token**, and the backend rejects the
request as a validation error — masking the real cause.

Client IDs are public identifiers (the confidential *secret* stays in the backend
env), so they now live in committed `app.json` → `extra`, with `EXPO_PUBLIC_*`
still taking precedence for local overrides. Reads are centralised in
`src/config/env.ts`.

## 7. Native Android configuration — verified

- No manifest entries are required for this library; none are present. Correct.
- `minSdk 24`, `compileSdk 36`, `targetSdk 36` — all above the library's floor.
- **Defect found and fixed:** release signing credentials were being added to
  `android/gradle.properties`, which is **tracked by git**. They now live in
  `android/keystore.properties` (gitignored), with an environment-variable path
  for CI and the original property path retained as a fallback so existing local
  setups keep working. Verified via `signingReport`: the release variant still
  resolves to `dice-release-key.jks` / alias `dice-release`.
- `android/local.properties` was absent, so Gradle could not locate the SDK and
  **no Android build could run at all** on a fresh checkout. Created (gitignored).

## 8. Backend validation — verified, no defect

`POST /api/v2/auth/google` (`backend/src/routes/v2/auth.ts`):

- Verifies the ID token via `google-auth-library`'s `verifyIdToken`, with
  `audience` set to the full `GOOGLE_CLIENT_IDS` list — so tokens minted by the
  web, Android, or iOS client are all accepted. Correct.
- Requires a verified `email` claim to be present, else 401.
- Creates the account on first sign-in with `email_verified_at` stamped, and
  back-fills `email_verified_at` for pre-existing OTP accounts. Correct.
- Issues the same access/refresh pair as the OTP path via `issueTokens`, so
  refresh-token rotation and denylisting behave identically. Correct.
- Writes an audit record.

The `{ idToken }` body key sent by `authService.googleSignIn` matches the zod
schema exactly. **The backend was never the fault.**

---

## Remaining actions (console access required)

1. Register the **release SHA-1** `EA:24:44:…:9C:E9` on the Android OAuth client.
2. Register the **Play app signing SHA-1** (see §5) — most likely still missing.
3. Confirm the debug SHA-1 `5E:8F:16:…:F6:25` is registered for local development.
4. Identify or remove the unaccounted-for `…-51om14…` client ID.
5. Confirm the OAuth consent screen is **published**, not in Testing — in Testing
   mode only explicitly listed test users can sign in.
