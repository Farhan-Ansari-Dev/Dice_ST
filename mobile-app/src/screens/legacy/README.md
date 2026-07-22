# Legacy screens

Screens retained for reference after the auth/onboarding rework. None of these
are registered in any navigator and none are reachable via deep link.

Retained rather than deleted so the replacements can be verified on device
first. Re-audit before removing.

| Screen | Superseded by | Reason |
|---|---|---|
| `SignupScreen.tsx` | `LoginScreen` (OTP) | Password/registration signup; the platform is OTP-first, so `POST /auth/send-otp` creates the account. Navigated to a `UserTypeSelection` route that is not registered. |
| `OnboardingTourScreen.tsx` | `auth/OnboardingScreen` | Duplicate pre-login intro carousel. |
| `UserTypeSelectionScreen.tsx` | `auth/UserTypeScreen` step 1 | Duplicate business-role picker with a narrower, divergent option set (4 vs 8 roles). |

Verification before deletion:
1. Google + OTP sign-in complete on a physical Android release build.
2. Onboarding wizard completes and persists for a new account.
3. `grep -rn "SignupScreen\|OnboardingTourScreen\|UserTypeSelectionScreen" src/` returns only this folder.
