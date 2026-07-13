# App Flow — User Journey
## DICE by Sanyog

**Version:** 1.0.0  
**Date:** June 2025

---

## 1. First-Time User Journey

```
App Launch
    │
    ▼
[Splash Screen]
    │  Logo animation (1.25s)
    ▼
[Onboarding] ── 3 slides ──▶ [Get Started]
    │
    ▼
[Login Screen]
    │  Enter phone number
    ▼
[OTP Screen]
    │  6-digit OTP (5 min TTL)
    ▼
[User Type Screen]  ← "Tell us about your business"
    │  Select: Manufacturer / Importer / Exporter / Consultant
    ▼
[Onboarding Profile]
    │  Industries, Target Markets, Certifications of Interest, Goals
    ▼
[Home Screen] ◀──── App entry point (returning users go directly here)
```

---

## 2. Returning User Journey

```
App Launch
    │
    ▼
[Splash Screen]
    │  loadStoredAuth() restores token + user
    ▼
[Home Screen]
```

---

## 3. Home Screen Flow

```
[Home Screen]
    │
    ├── Tap RK Avatar ──────────────────▶ [Drawer Menu]
    │                                         ├── Profile
    │                                         ├── Documents
    │                                         ├── Payments
    │                                         ├── Shipment
    │                                         ├── Communication
    │                                         └── Settings
    │
    ├── Tap 🔔 Bell ───────────────────▶ [Notifications Screen]
    │
    ├── AI Search Bar ─────────────────▶ [AI Assistant / Chat]
    │
    ├── Quick Action: New Application ──▶ [New Application Screen]
    ├── Quick Action: Upload Document ──▶ [Documents Screen]
    ├── Quick Action: AI Assistant ─────▶ [AI Chat Screen]
    ├── Quick Action: Make Payment ─────▶ [Payments Screen]
    │
    ├── Hero "View All" ────────────────▶ [Applications Screen]
    │
    └── Feature Carousel
            ├── BIS Fast Track ─────────▶ [New Application (BIS)]
            ├── Live Updates ───────────▶ [AI Insights]
            ├── Certificate Finder ─────▶ [Certifications]
            └── CB Comparison ──────────▶ [CB Comparison Screen]
```

---

## 4. Certifications Flow

```
[Certifications Tab]
    │
    ├── Search / Filter (BIS / EPR / WPC / FSSAI / ISO / CE)
    │
    ├── Tap Certificate Card ───────────▶ [Certification Detail Screen]
    │       │
    │       ├── Share button ───────────▶ Native share sheet
    │       └── Tabs: Overview / Requirements / Timeline / Documents
    │
    ├── + Button ──────────────────────▶ [New Application Screen]
    │
    └── "Compare CBs" Banner ──────────▶ [CB Comparison Screen]
                                              │
                                              ├── "Go with Sanyog" card
                                              ├── Expandable sections: 
                                              │     Pricing / TAT / Services
                                              └── "Go With This CB" button
                                                    └──▶ [New Application (prefilled)]
```

---

## 5. Applications Flow

```
[Applications Tab]
    │
    ├── View Toggle: List / Kanban
    ├── Filter by status / search
    │
    ├── Tap Application Card ──────────▶ [Application Detail Screen]
    │       │
    │       ├── Tabs: Overview / Documents / Timeline / Notes
    │       │
    │       ├── Documents Tab
    │       │     ├── Upload button ────▶ Document picker
    │       │     └── Download button ──▶ File download
    │       │
    │       ├── "Technical Review" btn ▶ [Technical Review Screen]
    │       │       │
    │       │       ├── Tabs: Summary / Findings / Queries
    │       │       ├── Queries: respond to BIS committee
    │       │       └── "Contact Review Officer" ─▶ [Communication]
    │       │
    │       └── "Contact Support" btn ──▶ [Communication Screen]
    │
    └── + New Application ─────────────▶ [New Application Screen]
            │
            ├── Step 1: Cert Type selection
            ├── Step 2: Product details
            ├── Step 3: Document upload
            ├── Step 4: Lab selection
            └── Step 5: Submit ─────────▶ [Application Success Screen]
```

---

## 6. AI Insights Flow

```
[AI Insights Tab]
    │
    ├── Category chips (BIS / EPR / WPC / FSSAI / All)
    ├── Search with debounce (300ms)
    │
    ├── Tap Article Card ───────────────▶ [Insight Detail Screen]
    │       └── Bookmark (persisted via bookmarkStore)
    │
    ├── 🔖 Bookmark icon ───────────────▶ [Saved Articles Screen]
    │
    ├── AI Recommendations ─────────────▶ [AI Recommendations Feed]
    │
    ├── Import/Export Alerts ───────────▶ [Import Export Alerts Screen]
    │
    └── AI Summarized Circulars ────────▶ [AI Circulars Screen]
```

---

## 7. Profile Flow

```
[Profile Tab]
    │
    ├── Tap avatar / edit ─────────────▶ [Edit Profile Screen]
    │
    ├── Company Details ───────────────▶ [Company Profile Screen]
    │
    ├── Security Settings ─────────────▶ [Security Settings Screen]
    │       ├── Change PIN
    │       ├── Biometric toggle
    │       └── 2FA setup
    │
    ├── Notifications ─────────────────▶ [Notification Settings Screen]
    │       ├── Push toggle
    │       ├── Expiry alerts (30/60/90 days)
    │       └── Status update alerts
    │
    ├── Language ──────────────────────▶ [Language Settings Screen]
    │       └── English / Hindi / Tamil
    │
    ├── Appearance ────────────────────▶ [Theme Settings Screen]
    │       └── Light / Dark / System
    │
    ├── Help Center ───────────────────▶ [Communication Screen]
    │
    └── Sign Out ──────────────────────▶ [Login Screen]
```

---

## 8. Certificate Center Flow

```
[Certificate Center]  (via Drawer / Certifications stack)
    │
    ├── Active Certificates
    │     ├── View button ──────────────▶ [Certificate Details Screen]
    │     │       ├── QR Verify ────────▶ [QR Verification Screen]
    │     │       └── Share ────────────▶ [Share Certificate Screen]
    │     │
    │     ├── Download button ──────────▶ [Download Certificate Screen]
    │     └── Share / QR Code buttons
    │
    └── Expired / Inactive Certificates
          └── Renew button ─────────────▶ [Renewal Applications Screen]
```

---

## 9. Notification Flow

```
Background push received
    │
    ├── App in foreground: in-app banner + unreadCount++
    └── App in background: system notification → tap opens app
                                                      │
                                                      └──▶ Deep link to
                                                           relevant screen
```

---

## 10. Dark / Light Mode Flow

```
App Launch
    │
    ├── No saved preference → follow system (useColorScheme)
    │         ├── System = Light → Light theme
    │         └── System = Dark  → Dark theme
    │
    └── Saved preference (scs_theme in SecureStore)
              ├── 'light'  → force Light
              ├── 'dark'   → force Dark
              └── 'system' → follow system

Profile → Appearance → Change mode
    → persists to SecureStore
    → ThemeStore updates
    → entire app re-renders
```

---

## 11. Screen Inventory

| Screen | Stack | Route Name |
|---|---|---|
| Home | HomeStack | Home |
| Certifications | CertStack | Certifications |
| Certification Detail | CertStack | CertificationDetail |
| CB Comparison | CertStack | CBComparison |
| Certificate Center | CertStack | CertificateCenter |
| Certificate Details | CertStack | CertificateDetails |
| Applications | AppStack | ApplicationsList |
| Application Detail | AppStack | ApplicationDetail |
| New Application | AppStack | NewApplication |
| Technical Review | AppStack | TechnicalReview |
| Approval Workflow | AppStack | ApprovalWorkflow |
| Govt Queries | AppStack | ApplicationGovtQueries |
| AI Insights | InsightsStack | Insights |
| Insight Detail | InsightsStack | InsightDetail |
| AI Feed | InsightsStack | AIInsightFeed |
| Circulars | InsightsStack | AISummarizedCirculars |
| Saved Articles | InsightsStack | SavedArticles |
| Profile | ProfileStack | Profile |
| Edit Profile | ProfileStack | EditProfile |
| Security Settings | ProfileStack | SecuritySettings |
| Theme Settings | ProfileStack | ThemeSettings |
| Notification Settings | ProfileStack | NotificationSettings |
| Language Settings | ProfileStack | LanguageSettings |
| Documents | DocumentsStack | Documents |
| Payments | PaymentsStack | Payments |
| Shipment Tracking | ShipmentStack | Shipment |
| Communication | CommunicationStack | Communication |
| AI Chat | AIStack | AIChat |
| Notifications | Modal | Notifications |
| Login | Auth | Login |
| OTP | Auth | OTP |
| Onboarding | Auth | Onboarding |
| User Type | Auth | UserType |
