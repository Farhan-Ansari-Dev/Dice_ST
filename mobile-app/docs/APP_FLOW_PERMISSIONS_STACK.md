# DICE Mobile App — App Flow, Permissions & Stack

> Comprehensive guide to the mobile application's navigation flow, runtime permissions, and technology stack.

---

## 1. Technology Stack

### 1.1 Core Framework

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native | 0.81.5 |
| Expo SDK | Expo | ~54 |
| React | React | 19.1.0 |
| Language | TypeScript | 5.x |
| Architecture | New Architecture (Fabric + TurboModules) | Enabled |
| Workflow | Expo Bare Workflow | (android/ & ios/ directories present) |

### 1.2 Navigation

| Library | Purpose |
|---------|---------|
| `@react-navigation/native` | Navigation core |
| `@react-navigation/native-stack` | Stack navigators |
| `@react-navigation/drawer` | Side drawer menu |
| `@react-navigation/bottom-tabs` | Bottom tab bar |

### 1.3 State Management

| Library | Purpose |
|---------|---------|
| `zustand` | Global state (auth, config, notifications, bookmarks) |
| `@tanstack/react-query` | Server state caching & synchronization |
| `expo-secure-store` | Encrypted local storage (tokens, user data) |

### 1.4 Networking & API

| Library | Purpose |
|---------|---------|
| `axios` | HTTP client |
| `socket.io-client` | Real-time chat & notifications |

### 1.5 Authentication

| Library | Purpose |
|---------|---------|
| `@react-native-google-signin/google-signin` | Native Google Sign-In |
| `expo-auth-session` | OAuth session helpers |
| `expo-local-authentication` | Biometric lock (Face ID / Touch ID / Fingerprint) |
| `expo-secure-store` | Token storage |

### 1.6 Media & Files

| Library | Purpose |
|---------|---------|
| `expo-camera` | QR scanning, product identification |
| `expo-image-picker` | Upload photos from camera/gallery |
| `expo-document-picker` | Upload PDFs and documents |

### 1.7 Notifications

| Library | Purpose |
|---------|---------|
| `expo-notifications` | Push notifications |
| `socket.io-client` | In-app real-time messages |

### 1.8 Payments

| Library | Purpose |
|---------|---------|
| `react-native-razorpay` | Razorpay checkout |

### 1.9 UI & Theming

| Library | Purpose |
|---------|---------|
| `expo-linear-gradient` | Gradients |
| `react-native-safe-area-context` | Safe area handling |
| `@expo/vector-icons` / `Ionicons` | Icons |
| `react-native-svg` | SVG charts & illustrations |
| Custom theme system | Dark / Light / Auto mode |

### 1.10 Build & Deployment

| Tool | Purpose |
|------|---------|
| `eas-cli` | Expo Application Services builds |
| `eas.json` | Build profiles |
| Gradle / Xcode | Native builds |

---

## 2. App Flow & Navigation

### 2.1 High-Level Entry Flow

```
App.tsx
    ↓
Providers (Theme, QueryClient, SafeArea, NavigationContainer)
    ↓
RootNavigator.tsx
    ├── Splash animation (1.25s)
    ├── Load auth from SecureStore
    ├── Load remote config
    └── Route decision:
        ├── No token → Onboarding → AuthNavigator
        ├── Token + biometric enabled → AppLockScreen
        ├── Token + user type missing → UserTypeScreen
        └── Token + fully onboarded → DrawerNavigator (Main app)
```

### 2.2 Auth Flow

```
Onboarding slides
    ↓
LoginScreen
    ├── Google Sign-In → backend /auth/google
    └── Email → OTPScreen → /auth/send-otp → /auth/verify-otp
                ↓
        UserTypeSelectionScreen (if first login)
                ↓
        UserTypeScreen 6-step wizard
                ↓
        Main app (DrawerNavigator)
```

### 2.3 Main App Navigation

```
DrawerNavigator (root of authenticated app)
    ├── HomeTab (BottomTabs)
    │       ├── HomeScreen
    │       ├── CertificationsStack
    │       ├── ApplicationsStack
    │       ├── AIAssistantStack
    │       └── ProfileStack
    │
    ├── CertificationsStack
    ├── ApplicationsStack
    ├── DocumentsStack
    ├── TestingStack
    ├── ShipmentStack
    ├── PaymentsStack
    ├── CommunicationStack
    ├── InsightsStack
    ├── CertificateCenterStack
    └── ProfileStack
```

### 2.4 Screen Flow by Feature

#### Home
```
HomeScreen
    ├── ComplianceScoreScreen
    ├── NotificationsScreen
    └── AI search bar → AISearchScreen / AIAssistantScreen
```

#### Certifications
```
CertificationsScreen
    ├── CertificationDetailScreen
    ├── NewCertificationScreen
    ├── CertificationCategoriesScreen
    ├── CertificationEligibilityCheckerScreen
    ├── CertificationDocumentsScreen
    ├── CertificationProgressScreen
    ├── CertificationTimelineScreen
    ├── CertificationFAQScreen
    ├── GovernmentQueriesScreen
    ├── InternationalCertificationsScreen
    └── RenewalCenterScreen
```

#### Applications
```
ApplicationsScreen
    ├── ApplicationDetailScreen
    ├── NewApplicationScreen
    ├── PendingApplicationsScreen
    ├── RejectedApplicationsScreen
    ├── RenewalApplicationsScreen
    └── TechnicalReviewScreen
```

#### Documents
```
DocumentsScreen
    ├── SearchDocumentsScreen
    ├── ProductDocumentsScreen
    ├── RejectedDocumentsScreen
    ├── ExpiryTrackerScreen
    ├── DigiLockerScreen
    └── UploadDocumentScreen
```

#### Certificate Center
```
CertificateCenterScreen
    ├── CertificateDetailsScreen
    ├── DownloadCertificateScreen
    ├── ShareCertificateScreen
    ├── QRVerificationScreen
    ├── ExpiredCertificatesScreen
    └── RenewalCertificatesScreen
```

#### Testing & Inspection
```
TestingScreen
    ├── NewTestingScreen
    ├── UploadTestingDocumentsScreen
    └── ChooseLabScreen

NewInspectionScreen
    ├── UploadInspectionDocumentsScreen
    └── ChooseInspectionBodyScreen
```

#### Shipments
```
ShipmentScreen
    ├── ShipmentDetailsScreen
    ├── ShipmentTrackingScreen
    ├── ContainerTrackingScreen
    ├── CustomsClearanceScreen
    ├── PortClearanceScreen
    └── CountryComplianceScreen
```

#### Payments
```
PaymentsScreen
    ├── PaymentGatewayScreen
    ├── ApproveQuotationScreen
    └── QuotationsScreen
```

#### Communication
```
CommunicationScreen
    ├── ChatListScreen
    ├── LiveChatScreen
    ├── ActivityTimelineScreen
    ├── VideoConsultationScreen
    ├── ContactExpertScreen
    ├── SupportCenterScreen
    ├── RaiseTicketScreen
    └── TicketDetailsScreen
```

#### Insights
```
InsightsScreen
    ├── NewsFeedScreen
    ├── GovtUpdatesScreen
    ├── BreakingComplianceAlertsScreen
    ├── TrendingCertificationsScreen
    ├── AIInsightFeedScreen
    ├── SavedArticlesScreen
    └── SearchInsightsScreen
```

#### Profile
```
ProfileScreen
    ├── EditProfileScreen
    ├── CompanyProfileScreen
    ├── GSTINLookupScreen
    ├── MCASearchScreen
    ├── NotificationSettingsScreen
    ├── SecuritySettingsScreen
    ├── ChangePasswordScreen
    ├── DeviceSessionsScreen
    ├── ThemeSettingsScreen
    ├── ReferralScreen
    ├── PartnerOnboardingScreen
    ├── AboutScreen
    ├── PrivacyPolicyScreen
    ├── TermsConditionsScreen
    └── DeleteAccountScreen
```

---

## 3. Runtime Permissions

### 3.1 Android Permissions (`app.json`)

| Permission | Purpose | When Requested |
|------------|---------|----------------|
| `CAMERA` | QR scan, product scan, document photo | First use of camera |
| `READ_EXTERNAL_STORAGE` | Upload documents/images | First upload |
| `WRITE_EXTERNAL_STORAGE` | Save downloaded certificates | First download |
| `RECEIVE_BOOT_COMPLETED` | Reschedule notifications after reboot | At install |
| `VIBRATE` | Haptic feedback on notifications | At install |
| `USE_BIOMETRIC` | Fingerprint / face unlock | Enabling app lock |
| `USE_FINGERPRINT` | Fingerprint unlock | Enabling app lock |

### 3.2 iOS Permissions (`infoPlist`)

| Key | Purpose | When Requested |
|-----|---------|----------------|
| `NSCameraUsageDescription` | Document scanning & OCR | First camera use |
| `NSPhotoLibraryUsageDescription` | Upload documents/photos | First gallery access |
| `NSFaceIDUsageDescription` | Authenticate identity securely | Enabling biometric lock |

### 3.3 Permission Request Flow

```
User taps feature requiring permission
        ↓
Check permission status (expo-camera / image-picker handles this)
        ↓
If not granted:
    • Show rationale explaining why
    • Request permission via Expo API
        ↓
If denied:
    • Show guidance to open Settings
    • Provide deep link to app settings
        ↓
If granted:
    • Proceed with feature
```

---

## 4. Deep Linking

### 4.1 Configured Schemes

| Platform | Scheme / URL |
|----------|--------------|
| iOS / Android | `com.sanyogconformity.app://` |
| Android App Links | `https://www.sanyogconformity.com/app/*` |

### 4.2 Deep Link Handling

```
Incoming link
        ↓
RootNavigator parses URL
        ↓
Routes:
    • /app/certificates/:id → CertificateDetailScreen
    • /app/applications/:id → ApplicationDetailScreen
    • /app/payments/:id     → PaymentGatewayScreen
    • /app/verify/:code     → QRVerificationScreen
```

---

## 5. State Persistence

### 5.1 SecureStore Keys

| Key | Data |
|-----|------|
| `scs_auth_token` | JWT access token |
| `scs_refresh_token` | JWT refresh token |
| `scs_user_data` | Serialized user object |
| `scs_onboarding_done` | Onboarding completion flag |
| `scs_user_type` | Selected business role |
| `scs_user_type_done` | User type wizard completion |
| `scs_push_token` | Expo push token |
| `scs_theme` | Theme preference |
| `scs_biometric_enabled` | Biometric lock flag |

### 5.2 React Query Cache

- Stale time: 5 minutes
- Cache time: 30 minutes
- Automatic background refetch on reconnect

---

## 6. Security Features

| Feature | Implementation |
|---------|----------------|
| Token storage | `expo-secure-store` (encrypted) |
| Token rotation | 15-min access / 7-day refresh |
| Biometric lock | `expo-local-authentication` |
| Rate limiting | Backend Express rate-limit on OTP endpoints |
| Certificate verification | QR code + backend verification API |
| Deep link validation | Android `autoVerify` + iOS universal links |

---

## 7. Build Profiles (`eas.json`)

| Profile | Environment | Use Case |
|---------|-------------|----------|
| `development` | Dev server, debug | Local development |
| `preview` | Staging | Internal testing |
| `production` | Production | App Store / Play Store release |

---

## 8. Package & Bundle Identifiers

| Platform | Identifier |
|----------|------------|
| Android package | `com.sanyogconformity.app` |
| iOS bundle identifier | `com.sanyogconformity.app` |
| EAS project ID | `1d04926d-1f47-4d73-b16e-3166301f0791` |

---

## 9. Network Configuration

### 9.1 API Base URL

```typescript
const DEV_API_HOST = Platform.OS === 'android'
  ? 'http://10.0.2.2:5001'      // Android emulator
  : 'http://localhost:5001';     // iOS simulator

export const API_BASE_URL = __DEV__
  ? `${DEV_API_HOST}/api/v1`
  : 'https://api.sanyogconformity.com/api/v1';
```

### 9.2 Socket URL

```typescript
export const SOCKET_URL = __DEV__
  ? DEV_API_HOST
  : 'https://api.sanyogconformity.com';
```

---

## 10. Feature Flags & Remote Config

Controlled via `configStore` + backend `/config` endpoint:

| Flag | Purpose |
|------|---------|
| `enable_ai_assistant` | Show/hide AI tab |
| `enable_payments` | Enable Razorpay payments |
| `enable_biometric` | Allow biometric app lock |
| `enable_consultant_mode` | Show consultant dashboard |
| `enable_shipment_tracking` | Show shipment module |

---

## 11. Error Handling & Offline

- Axios interceptors attach auth token and handle 401 → logout
- Network status hook shows offline banner
- React Query retries failed requests with exponential backoff
- Critical actions queued locally when offline (future enhancement)
