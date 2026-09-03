# DICE — App Store Review Readiness (AI privacy / consent)

Status: engineering hardening for Apple 5.1.1 / 5.1.2 (AI data sharing). Prepared from code + verified production config. **No unverified privacy/security/legal claim is made here.** Items needing a human/legal/ASC action are marked **DECISION** or **BLOCKED**.

Verified production AI provider (live `GET /api/v2/remote-config`, 2026-09-03): `aiSettings.provider = "openai"`, `baseUrl = ""` (OpenAI's own endpoint), models `gpt-4.1-mini` / `gpt-4o-mini`. **The third party is OpenAI.** No failover to another vendor exists in code (missing key → `AIUnavailableError`).

---

## 1. App Privacy data matrix (code → Apple questionnaire)

Only data actually handled by the code is listed. "Shared with OpenAI" = only for optional AI features, only after explicit consent.

| Data | Where collected | Stored | Purpose | Linked to user | Shared w/ OpenAI | Tracking |
|---|---|---|---|---|---|---|
| Name | Onboarding/profile | MongoDB | Account, service | Yes | No | No |
| Email | Auth/profile | MongoDB | Account, login, notices | Yes | No | No |
| Phone | Profile (OTP verify) | MongoDB | Account, SMS OTP | Yes | No | No |
| User ID | System | MongoDB | Operate app | Yes | No | No |
| Business profile (company name, role, size, industries, target markets, certs of interest, country) | Onboarding | MongoDB | Tailor compliance guidance | Yes | **Yes** (AI context) | No |
| GST/IEC | Profile | MongoDB | Compliance workflows | Yes | No (sent to AI only as a boolean "registered" flag, not the number) | No |
| Product / application / certification data | In-app entry | MongoDB | Core service | Yes | **Yes** when used in an AI feature | No |
| Uploaded documents | Document upload | S3 (SSE-AES256) | Certification processing | Yes | Document **text** only if submitted to AI analysis | No |
| Product photos | AI Quality Analyzer | In-memory → not persisted by that route | AI image analysis | Yes | **Yes** (image sent to OpenAI) | No |
| AI prompts / questions | AI features | Some stored in `AIConversation` | Provide AI result | Yes | **Yes** | No |
| Push token | Device registration | MongoDB (`Device`) | Push notifications (AWS SNS) | Yes | No | No |
| Auth/session tokens | Login | Client SecureStore; refresh jti denylist server-side | Session | Yes | No | No |
| Payment/order records | Razorpay checkout | MongoDB (`Payment`) | Purchases, invoices | Yes | No | No |
| Audit logs | System actions | MongoDB (`AuditLog`) | Security/operations | Yes | No | No |

**No third-party analytics, crash-reporting, ads, or tracking SDKs are present** (dependency audit). App Privacy "Tracking" should be **No**. Notification/email infra is **AWS SNS/SES** — **not Firebase**.

## 2. Third-party SDKs (mobile) and disclosure impact
| SDK | Purpose | Data | Apple disclosure |
|---|---|---|---|
| `@react-native-google-signin/google-signin` | Google login | Email/profile at sign-in | Contact info (already collected) |
| `expo-apple-authentication` | Apple login | Apple relay id/email | Contact info |
| `expo-auth-session` | OAuth flow | — | — |
| `expo-local-authentication` | Biometric unlock (on-device) | Biometric stays on device | None |
| `expo-notifications` | Push token | Device push token | Diagnostics/identifiers as applicable |
| Razorpay (key id `rzp_live_…`, publishable) | Payments | Handled by Razorpay | Purchases |

No SDK here performs tracking as Apple defines it.

## 3. Privacy Policy — corrections applied (in `PrivacyPolicyScreen.tsx`)
- **Removed** "end-to-end encryption" (no E2EE exists). Replaced with verified wording: HTTPS/TLS in transit; encrypted cloud storage (S3 SSE-AES256) for files; credentials encrypted at rest (AES-256-GCM); honest "no method is 100% secure" caveat.
- **Removed** "ISO 27001 certified data centers in India / data localization" (unverifiable as DICE's own claim, and contradicted by AI data going to OpenAI/US). Also removed the "ISO27001 Certified" UI badge in `ProfileScreen`.
- **Added** an accurate "AI-Powered Features" section naming **OpenAI**, the features, categories, purpose, consent-before-sharing, and withdrawal path.
- **Added** a "Data Retention & Deletion" section describing in-app account deletion and anonymization, with **no invented retention periods**.
- Expanded "Data Collection" to reflect real categories.

## 4. Reviewer notes (draft — paste into App Store Connect)
> DICE (Sanyog Conformity Solutions) is a B2B product-certification and export-compliance assistant for Indian manufacturers/exporters. Users manage certification applications, documents, and product compliance.
>
> **AI features (optional):** Some features use AI (compliance chat, product-image quality analysis, HS-code/risk/certification analysis). When used, relevant user-provided information is sent to **OpenAI** (third-party AI provider) to generate the result. This is disclosed and requires explicit in-app consent before any data is sent; the disclosure identifies OpenAI, the data categories, and the purpose. Consent can be reviewed/withdrawn at **Settings → Profile → AI Features & Privacy**.
> **Account deletion:** In-app at **Profile → Delete Account** (removes personal content and anonymizes the profile).
> **Privacy Policy:** In-app at **Profile → About / AI Features & Privacy → Read the Privacy Policy**.
> **Demo account:** Provided separately via App Store Connect (OTP login; a reviewer bypass code is configured server-side so the emailed OTP is not needed).
> **Payments:** Razorpay (India). **Notifications/email:** AWS SNS/SES.

## 5. Retention/deletion — DECISIONS required (not invented)
Account deletion now removes: `AIConversation`, `Notification`, `SavedItem`, `Device`, and anonymizes `User`. The following need an explicit **business/legal retention decision** before the policy can state periods:
- Applications, Certifications, Documents (+S3 objects), Payments — currently **retained** (business/compliance). Confirm: retain vs. delete-on-request, and the S3 object lifecycle for a deleted user's documents.
- Whether a specific retention duration must be published.

## 6. Known blockers (require your action)
- **Visual/device QA (iPhone + iPad): BLOCKED.** The simulator integration reports "Xcode installed but not selected" and the fix needs sudo: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`. After you run it, the full on-device QA can be performed. **Not yet performed — not claimed.**
- **App Store Connect items** (App Privacy questionnaire submission, screenshots, metadata, demo-account entry, reviewer notes upload) cannot be done from code — require your ASC access.
- **Not yet deployed:** Phase-1 consent endpoints/enforcement are not on production (health reports backend `2.0.0`). The mobile consent UX depends on them; they must be deployed before submitting a build that relies on them.

## 7. Explicitly NOT claimed (unverified)
- OpenAI retention, deletion timelines, training-on-data, storage location, or certifications.
- Any DICE/Sanyog security certification (ISO 27001 etc.).
- Data localization / "all data stays in India".
- MongoDB Atlas encryption/region specifics (not verifiable from repo).
