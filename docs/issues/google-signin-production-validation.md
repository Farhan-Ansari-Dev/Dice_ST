# Google Sign-In Production Validation

**Status:** 🟡 PENDING — deferred by decision. Do not work on this until every
other production issue (#2–#14) is complete.
**Severity:** High — Google Sign-In is unusable in production; email OTP works.
**Affects:** Android release APK against `https://api.sanyogconformity.com`

---

## Summary

Google Sign-In fails at the final step. The **client half works end to end** —
the account picker opens, Google accepts the release signing certificate, and a
valid ID token is obtained and transmitted. The **backend rejects the request as
a validation error**, reporting that `idToken` is missing even though the client
demonstrably sent it.

An earlier hypothesis — that release builds shipped an undefined `webClientId` —
has been **disproven** (see Ruled Out).

---

## Evidence

### Client, from a signed release APK on a Pixel 10 Pro emulator

```
[auth] POST /auth/google idToken length: 1113
[GoogleSignIn] backend rejected token: 400 validation_error
```

The token is present and well-formed (1113 chars is a normal Google ID token).

No `DEVELOPER_ERROR` (code 10) at any point, and `SignInHubActivity` →
`com.google.android.gms/.auth.api.signin.ui.SignInActivity` displayed cleanly:

```
I ActivityTaskManager: START u0 {act=com.google.android.gms.auth.GOOGLE_SIGN_IN
  cmp=com.sanyogconformity.app/com.google.android.gms.auth.api.signin.internal.SignInHubActivity}
I ActivityTaskManager: Displayed com.google.android.gms/.auth.api.signin.ui.SignInActivity: +227ms
```

### Production endpoint, probed directly with curl

```bash
curl -X POST https://api.sanyogconformity.com/api/v2/auth/google \
  -H "Content-Type: application/json" -d '{"idToken":"dummy.jwt.value"}'
# {"error":"google_auth_failed","message":"Can't parse token envelope: dummy'..."}
#   → body WAS parsed; it reached verifyIdToken

curl -X POST https://api.sanyogconformity.com/api/v2/auth/google \
  -H "Content-Type: application/json" -d '{}'
# {"error":"validation_error","message":"Request validation failed",
#  "issues":[{"path":"idToken","message":"Required"}]}
#   → this is the shape the app receives
```

**Conclusion:** the server sees no `idToken` in the body on requests from the
app, while an identical-looking curl request works.

### Key control

`POST /auth/send-otp` from the **same axios client, same base URL, same release
build** works against production — it created an account and delivered a real
OTP email. So JSON request bodies are not broken in general; something is
specific to `/auth/google`.

---

## Ruled out

| Hypothesis | Status | Evidence |
|---|---|---|
| `webClientId` undefined in release builds | ❌ Disproven | Google button enabled at runtime; account picker opened; token obtained |
| Release SHA-1 not registered in Google Cloud | ❌ Disproven | No `DEVELOPER_ERROR`; picker would not display otherwise |
| Backend audience misconfiguration | ❌ Disproven | `GOOGLE_CLIENT_IDS` contains all four IDs; web/android/ios all verified accepted |
| Client sends the wrong body key | ❌ Disproven | `authService.googleSignIn` sends `{ idToken }`, matching the zod schema |
| Client obtains a null/empty token | ❌ Disproven | Measured length 1113 |
| JSON bodies broken app-wide | ❌ Disproven | `/auth/send-otp` works from the same client |

Note: `EXPO_PUBLIC_*` variables are genuinely **not** inlined into release
bundles — that part of the original diagnosis was correct. The committed
`app.json` → `extra.googleWebClientId` fallback is what makes the client work,
and it is verified present in `assets/app.config` inside the APK. That fix
should be kept regardless of the outcome here.

---

## Remaining hypotheses

1. **Deployed backend ≠ this repository.** The live build may predate the
   current `routes/v2/auth.ts`. *Highest prior — cheapest to check.*
2. **A proxy/CDN/WAF in front of `api.sanyogconformity.com`** stripping or
   buffering the body on this specific path. Google ID tokens are long and
   JWT-shaped; some WAFs treat that as a credential-leak pattern and strip it.
3. **Header difference between axios-on-Hermes and curl** — e.g. a
   `Transfer-Encoding: chunked` body that an upstream proxy does not forward,
   where `/auth/send-otp` (much smaller body) is unaffected.
4. **Middleware ordering on the deployed instance** — `compression()` or the
   `express.json({ verify })` raw-body capture interacting badly with this route.

Hypothesis 2 and 3 both predict a **size-dependent** failure, which fits: the
send-otp body is ~40 bytes, the google body is ~1130.

---

## Files investigated

| File | Finding |
|---|---|
| `mobile-app/src/screens/auth/LoginScreen.tsx` | Client flow correct; diagnostics added |
| `mobile-app/src/services/authService.ts` | Sends `{ idToken }`; length instrumented |
| `mobile-app/src/services/api.ts` | Shared axios client; `Content-Type: application/json` set at construction |
| `mobile-app/src/config/env.ts` | Client-ID resolution, `app.json` fallback |
| `mobile-app/app.json` | `extra.googleWebClientId` — verified present in APK |
| `backend/src/routes/v2/auth.ts` | `z.object({ idToken: z.string().min(1) }).passthrough()` |
| `backend/src/middleware/validate.ts` | Produces the observed `validation_error` shape |
| `backend/src/index.ts` | `express.json({ limit:'10mb', verify })`, `compression()` ordering |

Full configuration audit: [`docs/google-signin-audit.md`](../google-signin-audit.md)

---

## Next debugging steps, in order

1. **Confirm which commit is deployed** to `api.sanyogconformity.com`. If it
   predates the current `auth.ts`, stop here — that is likely the whole answer.
2. **Log the received request server-side** for one `/auth/google` call:
   `Content-Type`, `Content-Length`, `Object.keys(req.body)`, and
   `req.rawBody?.length`. This distinguishes "body never arrived" from "body
   arrived but was not parsed" in a single request.
3. **Test the size hypothesis** — POST a ~1100-character dummy `idToken` from
   the device (not curl). If curl succeeds and the device fails at the same
   size, the difference is transport/headers, not size alone.
4. **Bypass any proxy** — hit the origin directly, or check CDN/WAF rules for
   JWT-pattern request-body filtering on `/api/v2/auth/*`.
5. Only if 1–4 come back clean, instrument `validate()` to log the raw body on
   failure (temporarily, and never logging the token value itself).

---

## Workaround in place

Email OTP login is fully functional and is the supported path. The Google button
now fails with an actionable message rather than an opaque error, and
`DEVELOPER_ERROR` is called out specifically if it ever occurs.

## Related commits

- `6492325` — client ID moved into `app.json` extra (keep)
- `d706ae2` — release-visible diagnostics; **not** a fix
