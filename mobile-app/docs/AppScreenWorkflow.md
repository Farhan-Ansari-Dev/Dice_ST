# DICE Mobile App — Full Screen Workflow (0 to 100)

> Last updated after mock-data purge. This document maps every user-facing screen, its purpose, entry points, and the real-data source it now consumes.

---

## 0. App Launch & Foundation

| # | Screen / Flow | Purpose | Data Source |
|---|---------------|---------|-------------|
| 0.1 | **Splash / App Entry** | Brand splash, initialize stores, check auth & onboarding state | Local SecureStore |
| 0.2 | **Auth Gate** | Decide between Login, Onboarding, or Home | `authStore` token + onboarding flags |
| 0.3 | **Biometric / App Lock** (if enabled) | Local authentication before app access | `expo-local-authentication` |

---

## 1. Authentication Flow

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 1.1 | **LoginScreen** | Google Sign-In (native SDK) + phone/email option | Backend `/auth/google` + `/auth/send-otp` |
| 1.2 | **OTPScreen** | Enter OTP sent via email/SMS | Backend `/auth/verify-otp` |
| 1.3 | **UserTypeSelectionScreen** | Choose primary business role | `BUSINESS_ROLES` config → persisted to backend |
| 1.4 | **UserTypeScreen** | 6-step onboarding wizard (role → industry → markets → certifications → company size → goals) | `constants.ts` config + backend profile update |

---

## 2. Home Dashboard

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 2.1 | **HomeScreen** | Dashboard: analytics overview, recent applications, action items, market opportunities, AI search bar | `/analytics/overview`, `/applications` |
| 2.2 | **ComplianceScoreScreen** | Compliance score breakdown + improvement suggestions | `/analytics/compliance-score` |
| 2.3 | **NotificationBell / NotificationsScreen** | Push + in-app notification list | Backend notifications API |

---

## 3. Certifications Hub

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 3.1 | **CertificationsScreen** | List active/pending/expired certifications | `/certifications` |
| 3.2 | **CertificationDetailScreen** | Certificate details, documents, timeline, share/download/renew | `/certifications/:id` |
| 3.3 | **CertificationCategoriesScreen** | Browse certification categories | Static config (`SANYOG_SERVICES`) |
| 3.4 | **NewCertificationScreen** | Start new certification: product + markets → recommended certs | User input + backend rules API |
| 3.5 | **CertificationEligibilityCheckerScreen** | Check eligibility by product/market/company type | User input + backend rules API |
| 3.6 | **CertificationDocumentsScreen** | Upload/view required documents for a certification | `/documents` |
| 3.7 | **CertificationProgressScreen** | Track certification progress | `/certifications/:id/progress` |
| 3.8 | **CertificationTimelineScreen** | Timeline of certification stages | `/certifications/:id/timeline` |
| 3.9 | **CertificationFAQScreen** | FAQ for selected certification | Backend CMS / static config |
| 3.10 | **GovernmentQueriesScreen** | Track government queries on applications | `/applications/:id/queries` |
| 3.11 | **InternationalCertificationsScreen** | List international certs | `/certifications?scope=international` |
| 3.12 | **RenewalCenterScreen** | Renew expiring certificates | `/certifications/renewals` |

---

## 4. Applications Tracking

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 4.1 | **ApplicationsScreen** | Kanban/list of all applications | `/applications` |
| 4.2 | **ApplicationDetailScreen** | Overview, documents, timeline, notes, tasks, payments | `/applications/:id` |
| 4.3 | **NewApplicationScreen** | Create a new application | User input → POST `/applications` |
| 4.4 | **PendingApplicationsScreen** | Filtered pending apps | `/applications?status=pending` |
| 4.5 | **RejectedApplicationsScreen** | Rejected apps + reapply | `/applications?status=rejected` |
| 4.6 | **RenewalApplicationsScreen** | Renewal apps | `/applications?type=renewal` |
| 4.7 | **TechnicalReviewScreen** | Technical review details for an app | `/applications/:id/technical-review` |

---

## 5. Document Vault

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 5.1 | **DocumentsScreen** (main vault) | All uploaded documents | `/documents` |
| 5.2 | **SearchDocumentsScreen** | Search/filter documents | `/documents` |
| 5.3 | **ProductDocumentsScreen** | Documents grouped by product | `/documents?groupBy=product` |
| 5.4 | **RejectedDocumentsScreen** | Documents rejected by reviewer | `/documents?status=rejected` |
| 5.5 | **ExpiryTrackerScreen** | Track expiring certificates/docs | `/documents/expiring` |
| 5.6 | **DigiLockerScreen** | Fetch docs from DigiLocker | DigiLocker integration |
| 5.7 | **UploadDocumentScreen** | Upload new document | Camera/files → POST `/documents` |

---

## 6. Certificate Center

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 6.1 | **CertificateCenterScreen** | Central hub for certificates | `/certificates` |
| 6.2 | **CertificateDetailsScreen** | Detailed certificate view | `/certificates/:id` |
| 6.3 | **DownloadCertificateScreen** | Download certificate PDF | `/certificates/:id/download` |
| 6.4 | **ShareCertificateScreen** | Share certificate via link/PDF | `/certificates/:id/share` |
| 6.5 | **QRVerificationScreen** | Show/scan QR for certificate verification | Camera + `/certificates/verify` |
| 6.6 | **ExpiredCertificatesScreen** | Expired certs + renew | `/certificates?status=expired` |
| 6.7 | **RenewalCertificatesScreen** | Certs due for renewal | `/certificates/renewals` |

---

## 7. Testing & Inspection

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 7.1 | **TestingScreen** | List lab testing jobs | `/testing` |
| 7.2 | **NewTestingScreen** | Book new lab testing | User input + POST `/testing` |
| 7.3 | **UploadTestingDocumentsScreen** | Upload testing docs | User input + POST `/documents` |
| 7.4 | **ChooseLabScreen** | Select accredited lab | `/labs` |
| 7.5 | **NewInspectionScreen** | Book inspection service | User input + POST `/inspections` |
| 7.6 | **UploadInspectionDocumentsScreen** | Upload inspection docs | User input + POST `/documents` |
| 7.7 | **ChooseInspectionBodyScreen** | Select inspection body | `/inspection-bodies` |

---

## 8. Shipments & Customs

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 8.1 | **ShipmentScreen** | List shipments | `/shipments` |
| 8.2 | **ShipmentDetailsScreen** | Shipment details sections | `/shipments/:id` |
| 8.3 | **ShipmentTrackingScreen** | Track by shipment ID | `/shipments/:id/tracking` |
| 8.4 | **ContainerTrackingScreen** | Container journey/events | `/shipments/:id/container` |
| 8.5 | **CustomsClearanceScreen** | Customs status + document checklist | `/shipments/:id/customs` |
| 8.6 | **PortClearanceScreen** | Port clearance steps | `/shipments/:id/port-clearance` |
| 8.7 | **CountryComplianceScreen** | Compliance requirements by destination country | Backend rules API |

---

## 9. Payments & Quotations

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 9.1 | **PaymentsScreen** | Transactions, invoices, payment chart | `/payments` |
| 9.2 | **PaymentGatewayScreen** | Razorpay checkout | `/payments/create-order` |
| 9.3 | **ApproveQuotationScreen** | Review and approve quotation | `/quotations/:id` |
| 9.4 | **QuotationsScreen** | List quotations | `/quotations` |

---

## 10. Communication & Support

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 10.1 | **CommunicationScreen** | Messages hub | `/chats` |
| 10.2 | **ChatListScreen** | List conversations | `/chats` |
| 10.3 | **LiveChatScreen** | Real-time chat with manager/support | Socket + `/messages` |
| 10.4 | **ActivityTimelineScreen** | Activity feed for user/account | `/activities` |
| 10.5 | **VideoConsultationScreen** | Book video consultation | `/experts`, `/consultations` |
| 10.6 | **ContactExpertScreen** | Browse experts | `/experts` |
| 10.7 | **SupportCenterScreen** | Support categories + FAQ | `/support/faqs` |
| 10.8 | **RaiseTicketScreen** | Create support ticket | POST `/tickets` |
| 10.9 | **TicketDetailsScreen** | View ticket thread | `/tickets/:id` |

---

## 11. AI Assistant / Identifier

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 11.1 | **AIAssistantScreen** | Main AI assistant chat | Backend RAG / AI API |
| 11.2 | **AISearchScreen** | AI-powered app search | `AISearchDB` + backend |
| 11.3 | **AIProductQualityScreen** | Scan product/label for compliance | Camera + backend vision API |
| 11.4 | **AIRegulationFeedScreen** | AI-curated regulatory updates | `/insights` |

---

## 12. Insights & Regulatory News

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 12.1 | **InsightsScreen** | Main insights feed | `/insights` |
| 12.2 | **NewsFeedScreen** | Certification news | `/insights?type=news` |
| 12.3 | **GovtUpdatesScreen** | Government updates | `/insights?type=govt` |
| 12.4 | **BreakingComplianceAlertsScreen** | Breaking alerts | `/insights?type=alert` |
| 12.5 | **TrendingCertificationsScreen** | Trending certs | `/insights?type=trending` |
| 12.6 | **CertificationNewsScreen** | Certification-specific news | `/insights?type=certification` |
| 12.7 | **ImportExportAlertsScreen** | Import/export alerts | `/insights?type=import-export` |
| 12.8 | **CountryRegulationUpdatesScreen** | Country-specific updates | `/insights?type=country` |
| 12.9 | **TradeExportNewsScreen** | Trade/export news | `/insights?type=trade` |
| 12.10 | **AIInsightFeedScreen** | AI-generated insights | `/insights?type=ai` |
| 12.11 | **AIRecommendationsFeedScreen** | AI recommendations | `/insights?type=recommendations` |
| 12.12 | **AISummarizedCircularsScreen** | Summarized circulars | `/insights?type=circulars` |
| 12.13 | **VideoInsightsScreen** | Video insights | `/insights?type=video` |
| 12.14 | **SavedArticlesScreen** | Bookmarked articles | `/bookmarks` |
| 12.15 | **SearchInsightsScreen** | Search insights | `/insights?search=` |

---

## 13. Profile & Account

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 13.1 | **ProfileScreen** | User profile, stats, menu | `/users/me` |
| 13.2 | **EditProfileScreen** | Edit personal profile | PUT `/users/me` |
| 13.3 | **CompanyProfileScreen** | Edit company details (GST, CIN, address) | `/companies/me` |
| 13.4 | **GSTINLookupScreen** | Lookup GSTIN details | GST API |
| 13.5 | **MCASearchScreen** | Search MCA company records | MCA API |
| 13.6 | **NotificationSettingsScreen** | Toggle notification preferences | `/users/me/notifications` |
| 13.7 | **SecuritySettingsScreen** | Biometric, app lock, password | Local + backend |
| 13.8 | **ChangePasswordScreen** | Change password | Backend auth API |
| 13.9 | **DeviceSessionsScreen** | Manage active sessions | `/auth/sessions` |
| 13.10 | **ThemeSettingsScreen** | Light/dark/system theme | Local store |
| 13.11 | **LanguageSettingsScreen** | App language | Local store |
| 13.12 | **ReferralScreen** | Referral program | `/referrals` |
| 13.13 | **PartnerOnboardingScreen** | Apply as CB/lab/inspection partner | POST `/partners` |
| 13.14 | **AboutScreen** | About Sanyog / app | Static |
| 13.15 | **PrivacyPolicyScreen** | Privacy policy | Static |
| 13.16 | **TermsConditionsScreen** | Terms & conditions | Static |
| 13.17 | **DeleteAccountScreen** | Account deletion | DELETE `/users/me` |

---

## 14. Consultant Mode (Future)

| # | Screen | Purpose | Data Source |
|---|--------|---------|-------------|
| 14.1 | **ConsultantDashboardScreen** | Client overview for consultants | `/consultant/clients` |
| 14.2 | **ClientDetailScreen** | Selected client details | `/consultant/clients/:id` |

---

## Typical User Journeys

### Journey A: New User → First Certification
`Splash → Login (Google/OTP) → UserTypeScreen onboarding → Home → Certifications → NewCertification → ChooseLab/Body → UploadDocuments → ApproveQuotation → PaymentGateway → ApplicationDetail`

### Journey B: Track Existing Application
`Home → Applications → ApplicationDetail → (Documents / Timeline / Notes / Tasks / TechnicalReview)`

### Journey C: Renew Expiring Certificate
`Home (expiry alert) → RenewalCenterScreen / ExpiryTracker → Renew → NewApplication → Payment`

### Journey D: Get Support
`Home → Communication → ContactExpert / LiveChat / RaiseTicket → TicketDetails`

### Journey E: Shipment Compliance
`Home → Shipment → ShipmentTracking / ContainerTracking / CustomsClearance / CountryCompliance`

---

## Mock Data Status

All hardcoded business data has been removed from:
- Screens under `src/screens/*`
- Data files `src/data/AISearchDB.ts`, `src/data/aiResponses.ts`
- `src/utils/constants.ts` (`CERTIFICATION_BODIES`)
- `src/services/pushNotificationService.ts` (now uses real `expo-notifications`)
- `src/store/authStore.ts` (no demo user persistence)

Remaining static config (intentionally kept):
- Onboarding choices: roles, industries, markets, certifications, company sizes, goals
- Service catalog (`SANYOG_SERVICES`)
- UI menus, filters, themes, about/terms/privacy sections
- Payment methods

All user-facing lists now render empty until real API data is wired or populated.
