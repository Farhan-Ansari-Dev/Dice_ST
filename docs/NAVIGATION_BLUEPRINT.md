# 🗺️ DICE_ST GLOBAL NAVIGATION BLUEPRINT 🗺️

> **Architecture:** Root ➔ Drawer ➔ Bottom Tabs ➔ Internal Stacks

## 1. 🚦 ROOT (Entrypoint)
│── `SplashScreen` (Load)
│── `Onboarding` ➔ `Login` ➔ `OTP` ➔ `UserType` (Auth Flow)
│── `BiometricUnlock` / `Maintenance` (Overlays)
└── **`Main`** ➔ (Bridges to Drawer)

## 2. 🍔 DRAWER (Global Side Menu)
│── **`MainTabs`** ➔ (Opens Level 3 Bottom Tabs)
│
├── 📦 **`Applications`** (Drawer Stack)
│   ├── `ApplicationsList`
│   ├── `ApplicationDetail`
│   ├── `NewApplication`
│   ├── `UploadDocuments`
│   ├── `ChoosePartner`
│   ├── `TermsAndConditions`
│   ├── `ActiveApplications`
│   ├── `PendingApplications`
│   ├── `CompletedApplications`
│   ├── `RejectedApplications`
│   ├── `ApplicationTimeline`
│   ├── `UploadAdditionalDocuments`
│   ├── `AssignedManager`
│   ├── `ApprovalWorkflow`
│   ├── `ApplicationGovtQueries`
│   ├── `ApplicationNotes`
│   ├── `ApplicationHistory`
│   ├── `RenewalApplications`
│   ├── `ApplicationSuccess`
│   ├── `TechnicalReview`
│   ├── `ApplicationTemplates`
│   ├── `ActionRequired`
│
├── 📦 **`CertificateCenter`** (Drawer Stack)
│   ├── `CertificateCenterHome`
│   ├── `CertificateDetails`
│   ├── `DownloadCertificate`
│   ├── `QRVerification`
│   ├── `ShareCertificate`
│   ├── `RenewalCertificates`
│
├── 📦 **`Communication`** (Drawer Stack)
│   ├── `CommunicationHome`
│   ├── `ChatList`
│   ├── `LiveChat`
│   ├── `VideoConsultation`
│   ├── `SupportCenter`
│   ├── `RaiseTicket`
│   ├── `TicketDetails`
│   ├── `NotificationDetail`
│   ├── `ActivityTimeline`
│   ├── `ContactExpert`
│
├── 📦 **`Documents`** (Drawer Stack)
│   ├── `DocumentVault`
│   ├── `DocumentScan`
│   ├── `AIDocumentValidation`
│   ├── `ProductDocuments`
│   ├── `CompanyDocuments`
│   ├── `ShipmentDocuments`
│   ├── `GovernmentDocuments`
│   ├── `TestReports`
│   ├── `CertificatesStorage`
│   ├── `RejectedDocuments`
│   ├── `ExpiryTracker`
│   ├── `SearchDocuments`
│   ├── `DigiLocker`
│
├── 📦 **`Inspection`** (Drawer Stack)
│   ├── `InspectionDashboard`
│
├── 📦 **`MarketAccess`** (Drawer Stack)
│   ├── `MarketAccessRoot`
│
├── 📦 **`Payments`** (Drawer Stack)
│   ├── `PaymentsDashboard`
│   ├── `InvoiceDetails`
│   ├── `Quotations`
│   ├── `ApproveQuotation`
│   ├── `PaymentGateway`
│   ├── `AddCard`
│   ├── `PaymentMethods`
│   ├── `PaymentSuccess`
│   ├── `PaymentFailed`
│   ├── `DownloadInvoice`
│
├── 📦 **`Shipment`** (Drawer Stack)
│   ├── `ShipmentDashboard`
│   ├── `ShipmentTracking`
│   ├── `ShipmentDetails`
│   ├── `ContainerTracking`
│   ├── `CustomsClearance`
│   ├── `PortClearance`
│   ├── `CountryCompliance`
│   ├── `ImportRiskAnalysis`
│   ├── `ExportReadiness`
│   ├── `CustomsDocumentation`
│   ├── `ShippingDocuments`
│   ├── `ShipmentTimeline`
│   ├── `ShipmentAnalytics`
│   ├── `ShipmentAlerts`
│   ├── `ShipmentSuccess`
│
├── 📦 **`Testing`** (Drawer Stack)
│   ├── `TestingDashboard`
│   ├── `TestingList`
│   ├── `NewTesting`
│   ├── `UploadTestingDocuments`
│   ├── `ChooseLab`
│   ├── `TestDetail`
│   ├── `AssignedLabs`
│   ├── `SampleDispatch`
│   ├── `SampleTracking`
│   ├── `LabReports`
│   ├── `FailedReports`
│   ├── `RetestingRequest`
│
└── 📳 `Notifications` (Direct Screen)

## 3. 📱 BOTTOM TABS (Inside `MainTabs`)
│
├── 🔘 **`Identifier`** (Tab Stack)
│   ├── `AIProductQuality`
│
├── 🔘 **`Certifications`** (Tab Stack)
│   ├── `CertificationsDashboard`
│   ├── `CertificationsList`
│   ├── `CBComparison`
│   ├── `CertificationDetail`
│   ├── `NewCertification`
│   ├── `UploadDocuments`
│   ├── `ChoosePartner`
│   ├── `TermsAndConditions`
│   ├── `DomesticCertifications`
│   ├── `InternationalCertifications`
│   ├── `CertificationCategories`
│   ├── `CertificationEligibility`
│   ├── `CertificationFAQ`
│   ├── `CertificationTimeline`
│   ├── `CertificationProgress`
│   ├── `CertificationDocuments`
│   ├── `GovernmentQueries`
│   ├── `RejectedCertifications`
│   ├── `RenewalCenter`
│   ├── `CostEstimator`
│   ├── `RenewalCalendar`
│
├── 🔘 **`Home`** (Tab Stack)
│   ├── `HomeDashboard`
│   ├── `ComplianceOverview`
│   ├── `RecentActivities`
│   ├── `RenewalAlerts`
│   ├── `ComplianceScore`
│   ├── `Notifications`
│   ├── `NotificationDetail`
│
├── 🔘 **`Insights`** (Tab Stack)
│   ├── `InsightsHome`
│   ├── `InsightDetail`
│   ├── `NewsFeed`
│   ├── `GovtUpdates`
│   ├── `CertificationNews`
│   ├── `TradeExportNews`
│   ├── `ImportExportAlerts`
│   ├── `CountryRegulationUpdates`
│   ├── `AIInsightFeed`
│   ├── `AISummarizedCirculars`
│   ├── `ComplianceIntelligence`
│   ├── `TrendingCertifications`
│   ├── `SavedArticles`
│   ├── `VideoInsights`
│   ├── `AIRecommendationsFeed`
│   ├── `SearchInsights`
│   ├── `BreakingComplianceAlerts`
│
├── 🔘 **`Profile`** (Tab Stack)
│   ├── `ProfileHome`
│   ├── `Settings`
│   ├── `CompanyProfile`
│   ├── `TeamMembers`
│   ├── `RolesPermissions`
│   ├── `NotificationSettings`
│   ├── `SecuritySettings`
│   ├── `ChangePassword`
│   ├── `DeviceSessions`
│   ├── `LanguageSettings`
│   ├── `ThemeSettings`
│   ├── `PrivacyPolicy`
│   ├── `TermsConditions`
│   ├── `DeleteAccount`
│   ├── `About`
│   ├── `SupportCenter`
│   ├── `ProfileChatList`
│   ├── `GSTINLookup`
│   ├── `MCASearch`
│   ├── `Referral`
│   ├── `PartnerOnboarding`
│   ├── `Vault`
│   ├── `ConsultantVerification`
