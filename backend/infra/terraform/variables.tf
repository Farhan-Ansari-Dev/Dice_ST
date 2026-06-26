variable "region" {
  description = "AWS region (Mumbai for India data-residency)"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type (ARM Graviton is 20% cheaper)"
  type        = string
  default     = "t4g.small"
}

variable "domain" {
  description = "Primary domain that resolves to this EC2 (configured via Cloudflare)"
  type        = string
  # e.g. "api.sanyogconformity.com"
}

variable "my_ip" {
  description = "Your laptop's public IP — for SSH allowlist. Find via: curl ifconfig.me"
  type        = string
}

variable "ssh_key_pub" {
  description = "Your SSH public key (contents of ~/.ssh/id_ed25519.pub)"
  type        = string
}

variable "s3_bucket_name" {
  description = "Globally unique S3 bucket name for documents + backups"
  type        = string
  default     = "sanyog-conformity-docs"
}

variable "cors_origins" {
  description = "Allowed origins for S3 CORS (for browser direct uploads)"
  type        = list(string)
  default = [
    "https://app.sanyogconformity.com",
    "https://admin.sanyogconformity.com",
    "https://www.sanyogconformity.com",
    "http://localhost:8081",
    "http://localhost:5173",
  ]
}

variable "ops_email" {
  description = "Operations email for AWS alerts and budget notifications"
  type        = string
}
variable "cloudflare_api_token" {
  description = "Cloudflare API token with DNS edit permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for sanyogconformity.com"
  type        = string
}

