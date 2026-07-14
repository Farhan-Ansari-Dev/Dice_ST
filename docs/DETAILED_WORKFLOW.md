# DICE — Detailed Workflow

> End-to-end business workflows for the Sanyog Conformity Solutions platform.

---

## 1. User Acquisition & Onboarding

### 1.1 App Install & First Launch

```
User installs app (Play Store / App Store)
        ↓
Splash screen + brand animation (1.25s)
        ↓
RootNavigator checks SecureStore:
    • token exists? → validate + proceed
    • no token? → Onboarding flow
        ↓
Onboarding slides (value prop: compliance made simple)
        ↓
Login / Sign-up screen
```

### 1.2 Authentication

```
LoginScreen
    ├── Google Sign-In (native SDK)
    │       ↓
    │   Google ID token → backend /auth/google
    │       ↓
    │   Backend verifies token → find/create User
    │       ↓
    │   Issue JWT access + refresh tokens
    │
    └── Email/Phone OTP
            ↓
        Enter email → /auth/send-otp
            ↓
        Backend generates 6-digit OTP, hashes it, sends via SES/SMS
            ↓
        User enters OTP → /auth/verify-otp
            ↓
        Backend validates → issues tokens
```

### 1.3 Profile Onboarding (6-step wizard)

```
UserTypeScreen
    Step 1: Business Role
        • Manufacturer, Importer, Exporter, Supplier/Trader,
          Logistics, Consultant, Individual, Freelancer
            ↓
    Step 2: Industry (multi-select)
        • Electronics, Medical, Chemicals, Toys, Textiles,
          Telecom, Automotive, Food, Cosmetics, Pharma, etc.
            ↓
    Step 3: Target Markets (multi-select)
        • India, UAE, Saudi, Europe, USA, Africa, UK, etc.
            ↓
    Step 4: Interested Certifications (multi-select)
        • BIS, CE, SABER, FDA, WPC, TEC, EPR
            ↓
    Step 5: Company Size
        • Solo, Startup, Small, Mid-size, Enterprise
            ↓
    Step 6: Business Goals (multi-select)
        • Faster certification, Global expansion, Shipment compliance,
          Reduce rejections, AI assistance, Compliance automation
            ↓
    PUT /users/me → save onboarding profile and keep the same backend user ID for tracking/login
            ↓
    Home dashboard
```

---

## 2. Certification Application Workflow

### 2.1 Discover & Select Certification

```
HomeScreen
    ↓
User taps "New Certification" or Certifications tab
    ↓
CertificationsScreen / CertificationCategoriesScreen
    ↓
User selects service (e.g., BIS CRS, SASO, CE Marking)
    ↓
NewCertificationScreen
    • Select product (from catalog or free text)
    • Select target market(s)
    • System recommends required certifications
```

### 2.2 Eligibility Check

```
CertificationEligibilityCheckerScreen
    • Product type
    • HS code (optional)
    • Target market
    • Company type
        ↓
Backend evaluates MarketRequirement rules
        ↓
Returns eligible certifications + required documents
```

### 2.3 Create Application

```
NewApplicationScreen
    • Product details
    • Certification type
    • Applicant/company info
    • Preferred lab/CB (optional)
        • Supporting documents optional at this stage
        ↓
POST /applications
        ↓
Backend creates Application document
    status: draft
        ↓
ApplicationDetailScreen
```

### 2.4 Document Upload

```
CertificationDocumentsScreen / UploadDocumentScreen
    • Camera / gallery / file picker
    • OCR extraction (future)
    • Document type tagging
        • Optional at submit time; missing files can be requested later
        ↓
POST /documents (presigned S3 URL)
        ↓
Backend links Document to Application
        ↓
Document status: pending_review
```

### 2.5 Quotation & Payment

```
Application submitted for review
        ↓
Admin/Sales reviews in admin-dashboard
        ↓
Generate quotation → POST /quotations
        ↓
User sees quotation in ApproveQuotationScreen
        ↓
User approves → POST /payments/create-order
        ↓
Razorpay checkout (PaymentGatewayScreen)
        ↓
Webhook /payments/razorpay-webhook confirms payment
        ↓
Application status: payment_received
```

### 2.6 Processing & Tracking

```
Application status lifecycle:
    draft → submitted → under_review → additional_docs_required → approved → cert_issued
        ↓
User tracks via ApplicationDetailScreen
    • Overview tab
    • Documents tab
    • Timeline tab
    • Notes tab
    • Tasks tab
        ↓
Backend pushes status updates via Socket.io + push notifications
```

### 2.7 Certificate Issuance

```
Certification approved
        ↓
Backend creates Certification record
        ↓
Certificate available in CertificateCenterScreen
        ↓
User can:
    • View (CertificateDetailsScreen)
    • Download PDF (DownloadCertificateScreen)
    • Share (ShareCertificateScreen)
    • Verify via QR (QRVerificationScreen)
    • Renew before expiry (RenewalCenterScreen)
```

---

## 3. Testing & Inspection Workflow

### 3.1 Book Lab Testing

```
TestingScreen → NewTestingScreen
    • Product name / model
    • Select tests (safety, EMC, RF, etc.)
    • Target standard / market
        ↓
UploadTestingDocumentsScreen
    • Technical specs, BOM, manuals, photos
        • Optional at submit time; missing files can be requested later
        ↓
ChooseLabScreen
    • Select accredited lab from backend list
        ↓
POST /testing
        ↓
Backend creates Testing job, assigns lab
        ↓
Track progress in TestingScreen
```

### 3.2 Book Inspection

```
NewInspectionScreen
    • Product category
    • Inspection type (pre-shipment, during production, etc.)
    • Factory details
    • Target country/market
        ↓
UploadInspectionDocumentsScreen
    • PO, packing list, invoice, specs, golden samples
        • Optional at submit time; missing files can be requested later
        ↓
ChooseInspectionBodyScreen
        ↓
POST /inspections
        ↓
Inspection scheduled & tracked
```

---

## 4. Shipment & Customs Workflow

### 4.1 Register Shipment

```
ShipmentScreen → Add Shipment
    • Tracking number / BOL
    • Origin / destination
    • Product / HS code
    • Expected ETA
        ↓
POST /shipments
        ↓
Backend links required certifications to shipment
```

### 4.2 Track Shipment

```
ShipmentTrackingScreen
    • Enter shipment ID
        ↓
GET /shipments/:id/tracking
        ↓
Display journey steps
```

### 4.3 Customs Clearance

```
CustomsClearanceScreen
    • Customs status
    • Document checklist
    • Duty estimate
        ↓
GET /shipments/:id/customs
        ↓
Backend checks required NOCs (BIS, FSSAI, WPC, etc.)
        ↓
Alerts if any compliance doc is missing
```

### 4.4 Country Compliance Lookup

```
CountryComplianceScreen
    • Select destination country
        ↓
GET /market-access/requirements?country=X&product=Y
        ↓
Display mandatory certifications for that market
```

---

## 5. Document Vault Workflow

### 5.1 Upload Document

```
DocumentsScreen → Upload
    • Select file / camera
    • Document type (test report, certificate, invoice, etc.)
    • Link to product/application (optional)
    • Expiry date (optional)
        ↓
POST /documents
        ↓
Backend stores metadata + uploads file to S3
        ↓
Document appears in vault
```

### 5.2 Expiry Tracking

```
ExpiryTrackerScreen
    • Groups documents by expiry window
        ↓
GET /documents/expiring
        ↓
Backend cron job (expiryReminder.ts) sends alerts at:
    • 30 days before
    • 7 days before
    • 1 day before
```

### 5.3 DigiLocker Integration

```
DigiLockerScreen
    • Connect to DigiLocker account
        ↓
OAuth flow to digilocker.gov.in
        ↓
Fetch government-issued documents
        ↓
Save to vault
```

---

## 6. Communication & Support Workflow

### 6.1 Live Chat

```
CommunicationScreen / ChatListScreen
    ↓
LiveChatScreen
    • Real-time messaging via Socket.io
    • Chat with compliance manager / support
        ↓
Messages persisted in backend
```

### 6.2 Video Consultation

```
VideoConsultationScreen
    • Browse experts
    • Select slot
    • Book consultation
        ↓
POST /consultations
        ↓
Backend schedules video call (integration: Twilio/Zoom/Jitsi)
```

### 6.3 Support Tickets

```
SupportCenterScreen → RaiseTicketScreen
    • Category
    • Priority
    • Description
        ↓
POST /tickets
        ↓
Admin dashboard notifies support team
        ↓
User views replies in TicketDetailsScreen
```

---

## 7. AI Assistant Workflow

### 7.1 Text Query

```
AIAssistantScreen / AISearchScreen
    • User types question
        ↓
Frontend checks local AISearchDB / aiResponses
        ↓
If no match → POST /ai/chat
        ↓
Backend calls OpenAI with compliance context
        ↓
Return answer + sources
```

### 7.2 Product Scan

```
AIProductQualityScreen
    • Camera captures product/label
        ↓
POST /ai/identify (image)
        ↓
Backend vision model extracts text/product info
        ↓
Returns required certifications + compliance status
```

### 7.3 Regulatory Feed

```
AIRegulationFeedScreen
    • AI-curated updates
        ↓
GET /insights?type=ai
        ↓
Backend scraper + AI summarizer generates feed
```

---

## 8. Payment & Billing Workflow

### 8.1 View Transactions

```
PaymentsScreen
    • Tabs: Transactions / Invoices
        ↓
GET /payments
        ↓
Display list + chart summary
```

### 8.2 Make Payment

```
ApproveQuotationScreen / Pay Now
    • Confirm amount
        ↓
POST /payments/create-order
        ↓
Razorpay order created
        ↓
PaymentGatewayScreen opens Razorpay checkout
        ↓
User completes payment
        ↓
Razorpay webhook → backend marks payment paid
        ↓
Invoice generated (PDFKit)
```

---

## 9. Admin Operations Workflow

### 9.1 Admin Login

```
admin-dashboard → LoginPage
    • Email + OTP
    • is_admin_portal flag sent to /auth/send-otp
        ↓
Backend restricts login to roles:
    admin, super_admin, cb, lab, ib, employee, consultant
        ↓
Access dashboard
```

### 9.2 Manage Applications

```
ApplicationsPage
    • View all applications
    • Update status
    • Assign to employee/consultant
    • Request additional documents
    • Upload certificates
```

### 9.3 Manage Clients

```
ClientsPage
    • View client list
    • View company profile
    • View active applications & certificates
```

### 9.4 Remote Config

```
SettingsPage / RemoteConfigPage
    • Toggle feature flags
    • Update app constants
    • Manage onboarding content
```

---

## 10. Renewal Workflow

```
ExpiryTracker / RenewalCenterScreen detects expiring cert
        ↓
User taps "Renew"
        ↓
Pre-fill NewApplicationScreen with existing cert data
        ↓
Submit renewal application
        ↓
Follow standard application workflow
        ↓
New certificate issued, old one archived
```

---

## 11. Notification Workflow

```
Trigger events:
    • Application status change
    • Document approved/rejected
    • Payment due / received
    • Certificate expiring
    • Shipment milestone
    • New message / ticket reply
        ↓
Backend creates Notification record
        ↓
Push via expo-notifications
Email via SES/SMTP
SMS via MSG91 (critical alerts)
        ↓
User sees in NotificationBell + NotificationsScreen
```

---

## 12. Data Flow Summary

```
┌─────────────┐     HTTPS/WSS      ┌─────────────┐     ┌─────────────┐
│  Mobile App │ ◄────────────────► │   Backend   │ ◄──►│  MongoDB    │
│             │                    │   (Node.js) │     │  (Atlas)    │
└─────────────┘                    └──────┬──────┘     └─────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ↓                     ↓                     ↓
               ┌─────────┐         ┌─────────┐          ┌──────────┐
               │  Redis  │         │   S3    │          │ Razorpay │
               │ (cache) │         │ (files) │          │ (payments)│
               └─────────┘         └─────────┘          └──────────┘
                    ↓
               ┌─────────┐
               │  SES/   │
               │  SMTP   │
               └─────────┘
```
