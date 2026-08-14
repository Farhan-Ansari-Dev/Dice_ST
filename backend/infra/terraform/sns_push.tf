# ═══════════════════════════════════════════════════════════════════
#  DICE — AWS SNS Mobile Push (PREPARED, NOT APPLIED)
#
#  Declares the SNS platform applications (APNs + FCM) and the least-privilege
#  runtime IAM policy attached to the EXISTING dice-ec2-role.
#
#  SAFETY: everything here is gated by `enable_sns_push` (default false), so
#  `terraform plan`/`apply` create nothing until credentials exist and the flag
#  is set. NO real credentials live in this file — they are supplied at apply
#  time via TF_VAR_* env vars or a gitignored *.tfvars. NEVER commit secrets.
#
#  To provision (later, with approval):
#    export TF_VAR_enable_sns_push=true
#    export TF_VAR_fcm_service_account_json="$(cat /path/to/service-account.json)"
#    export TF_VAR_apns_private_key_p8="$(cat /path/to/AuthKey_XXXX.p8)"
#    export TF_VAR_apns_key_id=XXXXXXXXXX
#    export TF_VAR_apns_team_id=YYYYYYYYYY
#    terraform plan   # review
#    terraform apply  # only when approved
# ═══════════════════════════════════════════════════════════════════

variable "enable_sns_push" {
  description = "Master switch — create SNS mobile-push platform apps + IAM policy. Keep false until FCM/APNs credentials exist."
  type        = bool
  default     = false
}

# --- Platform credentials (supplied ONLY at apply time; never committed) ---
variable "fcm_service_account_json" {
  description = "FCM HTTP v1 service-account JSON contents (Android platform app)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "apns_private_key_p8" {
  description = "APNs auth key (.p8 contents) — token-based auth for iOS platform apps."
  type        = string
  default     = ""
  sensitive   = true
}

variable "apns_key_id" {
  description = "APNs signing Key ID (10 chars)."
  type        = string
  default     = ""
}

variable "apns_team_id" {
  description = "Apple Developer Team ID (10 chars)."
  type        = string
  default     = ""
}

variable "apns_bundle_id" {
  description = "iOS bundle identifier for APNs token auth."
  type        = string
  default     = "com.sanyogconformity.app"
}

locals {
  sns_push_count = var.enable_sns_push ? 1 : 0
}

data "aws_caller_identity" "current" {}

# ─── Platform applications ──────────────────────────────────────────

# Android — FCM HTTP v1 (platform "GCM"; credential = service-account JSON).
resource "aws_sns_platform_application" "android" {
  count               = local.sns_push_count
  name                = "DICE_Production_Android"
  platform            = "GCM"
  platform_credential = var.fcm_service_account_json
}

# iOS Production — APNs (token auth: credential = .p8, principal = Key ID).
resource "aws_sns_platform_application" "ios_prod" {
  count                    = local.sns_push_count
  name                     = "DICE_Production_iOS"
  platform                 = "APNS"
  apple_platform_team_id   = var.apns_team_id
  apple_platform_bundle_id = var.apns_bundle_id
  platform_credential      = var.apns_private_key_p8
  platform_principal       = var.apns_key_id
}

# iOS Sandbox — APNS_SANDBOX for dev/EAS-development builds (sandbox tokens).
resource "aws_sns_platform_application" "ios_sandbox" {
  count                    = local.sns_push_count
  name                     = "DICE_Dev_iOS"
  platform                 = "APNS_SANDBOX"
  apple_platform_team_id   = var.apns_team_id
  apple_platform_bundle_id = var.apns_bundle_id
  platform_credential      = var.apns_private_key_p8
  platform_principal       = var.apns_key_id
}

# ─── Runtime IAM policy (least privilege) on the existing EC2 role ───
# Only the operations sns.ts actually calls. Scoped to the DICE platform apps
# and their endpoints — no sns:* and no Resource "*".
resource "aws_iam_policy" "sns_push" {
  count = local.sns_push_count
  name  = "dice-sns-push"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DicePushRuntime"
      Effect = "Allow"
      Action = [
        "sns:CreatePlatformEndpoint",
        "sns:GetEndpointAttributes",
        "sns:SetEndpointAttributes",
        "sns:DeleteEndpoint",
        "sns:Publish",
      ]
      Resource = [
        aws_sns_platform_application.android[0].arn,
        aws_sns_platform_application.ios_prod[0].arn,
        aws_sns_platform_application.ios_sandbox[0].arn,
        "arn:aws:sns:${var.region}:${data.aws_caller_identity.current.account_id}:endpoint/GCM/DICE_Production_Android/*",
        "arn:aws:sns:${var.region}:${data.aws_caller_identity.current.account_id}:endpoint/APNS/DICE_Production_iOS/*",
        "arn:aws:sns:${var.region}:${data.aws_caller_identity.current.account_id}:endpoint/APNS_SANDBOX/DICE_Dev_iOS/*",
      ]
    }]
  })
}

# Attach to the EXISTING role (defined in main.tf) — S3/CloudWatch stay intact.
resource "aws_iam_role_policy_attachment" "sns_push" {
  count      = local.sns_push_count
  role       = aws_iam_role.ec2.name
  policy_arn = aws_iam_policy.sns_push[0].arn
}

# ─── Outputs (empty until enabled) ──────────────────────────────────
output "sns_platform_app_arn_android" {
  description = "SNS_PLATFORM_APP_ARN_ANDROID — set in /etc/dice/.env after apply."
  value       = try(aws_sns_platform_application.android[0].arn, null)
}

output "sns_platform_app_arn_ios" {
  description = "SNS_PLATFORM_APP_ARN_IOS — set in /etc/dice/.env after apply."
  value       = try(aws_sns_platform_application.ios_prod[0].arn, null)
}

output "sns_platform_app_arn_ios_sandbox" {
  description = "SNS_PLATFORM_APP_ARN_IOS_SANDBOX — set in non-prod env after apply."
  value       = try(aws_sns_platform_application.ios_sandbox[0].arn, null)
}
