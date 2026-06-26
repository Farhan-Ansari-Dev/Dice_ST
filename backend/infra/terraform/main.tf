# ═══════════════════════════════════════════════════════════════════
#  DICE — Bootstrap Infrastructure (Mumbai, single EC2)
#
#  Provisions:
#    • EC2 t4g.small (ARM Graviton) + Elastic IP
#    • Security Group (SSH from your IP, 443/80 from Cloudflare only)
#    • S3 buckets: documents + backups (with lifecycle + versioning)
#    • IAM instance role: S3 read/write + CloudWatch logs
#    • CloudWatch alarms: instance health + auto-recovery
#    • SNS topic for SMS/email alerts
#
#  Usage:
#    1. cp terraform.tfvars.example terraform.tfvars
#    2. Fill in: domain, my_ip, ssh_key_pub
#    3. terraform init
#    4. terraform plan
#    5. terraform apply
#
#  Cost: ~$24/mo (EC2 $12 + EBS $3 + EIP $0 attached + S3 $5 + misc)
# ═══════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws        = { source = "hashicorp/aws", version = "~> 5.0" }
    http       = { source = "hashicorp/http", version = "~> 3.4" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 5" }
  }

  # Uncomment for remote state (recommended once you have a team):
  # backend "s3" {
  #   bucket = "dice-terraform-state"
  #   key    = "bootstrap/terraform.tfstate"
  #   region = "ap-south-1"
  # }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = "DICE"
      Environment = "production"
      ManagedBy   = "Terraform"
      CostCenter  = "Bootstrap"
    }
  }
}

# ─── Cloudflare's IP ranges (auto-fetched) ──────────────────────
data "http" "cloudflare_ipv4" {
  url = "https://www.cloudflare.com/ips-v4"
}

locals {
  cloudflare_ips = compact(split("\n", trimspace(data.http.cloudflare_ipv4.response_body)))
}

# ─── VPC: use default VPC (saves NAT gateway $) ─────────────────
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ─── Ubuntu 22.04 LTS ARM64 AMI (latest) ────────────────────────
data "aws_ami" "ubuntu_arm" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-arm64-server-*"]
  }
}

# ─── Security Group ─────────────────────────────────────────────
resource "aws_security_group" "api" {
  name        = "dice-api-sg"
  description = "DICE API security group"
  vpc_id      = data.aws_vpc.default.id

  # SSH from your IP only
  ingress {
    description = "SSH from operator"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${var.my_ip}/32"]
  }

  # HTTP/HTTPS from Cloudflare IPs only (hides origin from direct scans)
  ingress {
    description = "HTTPS from Cloudflare"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = local.cloudflare_ips
  }
  ingress {
    description = "HTTP from Cloudflare (for ACME challenge)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = local.cloudflare_ips
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ─── SSH Key Pair ───────────────────────────────────────────────
resource "aws_key_pair" "operator" {
  key_name   = "dice-operator"
  public_key = var.ssh_key_pub
}

# ─── IAM Role for EC2 (S3 + CloudWatch access, no static keys) ──
resource "aws_iam_role" "ec2" {
  name = "dice-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_policy" "s3_access" {
  name = "dice-s3-access"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectVersion",
        "s3:GetObjectTagging",
        "s3:PutObjectTagging",
      ]
      Resource = [
        aws_s3_bucket.docs.arn,
        "${aws_s3_bucket.docs.arn}/*",
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "s3" {
  role       = aws_iam_role.ec2.name
  policy_arn = aws_iam_policy.s3_access.arn
}

resource "aws_iam_instance_profile" "ec2" {
  name = "dice-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ─── EC2 Instance ───────────────────────────────────────────────
resource "aws_instance" "api" {
  ami                    = data.aws_ami.ubuntu_arm.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.operator.key_name
  vpc_security_group_ids = [aws_security_group.api.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    iops                  = 3000
    throughput            = 125
    delete_on_termination = false # preserve data if instance is replaced
    encrypted             = true
    tags = {
      Name = "dice-api-root"
    }
  }

  # Cloud-init: run the setup script on first boot
  user_data = templatefile("${path.module}/user-data.sh", {
    domain = var.domain
  })

  metadata_options {
    http_tokens   = "required" # IMDSv2 only — prevents SSRF token theft
    http_endpoint = "enabled"
  }

  monitoring = true # detailed CloudWatch metrics

  tags = {
    Name = "dice-api"
  }

  lifecycle {
    ignore_changes = [ami] # don't replace EC2 just because a new AMI exists
  }
}

# ─── Elastic IP (static IP — survives instance restarts) ────────
resource "aws_eip" "api" {
  instance = aws_instance.api.id
  domain   = "vpc"
  tags = {
    Name = "dice-api-eip"
  }
}

# ─── S3 Bucket: Documents ───────────────────────────────────────
resource "aws_s3_bucket" "docs" {
  bucket = var.s3_bucket_name

  tags = { Purpose = "user documents and backups" }
}

resource "aws_s3_bucket_versioning" "docs" {
  bucket = aws_s3_bucket.docs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "docs" {
  bucket                  = aws_s3_bucket.docs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "docs" {
  bucket = aws_s3_bucket.docs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "docs" {
  bucket = aws_s3_bucket.docs.id
  cors_rule {
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.cors_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "docs" {
  bucket = aws_s3_bucket.docs.id

  rule {
    id     = "documents-tier"
    status = "Enabled"
    filter { prefix = "orgs/" }
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
  }

  rule {
    id     = "backups-daily-expire"
    status = "Enabled"
    filter {
      and {
        prefix = "backups/mongodb/"
        tags   = { backup_type = "daily" }
      }
    }
    expiration { days = 30 }
  }

  rule {
    id     = "backups-monthly-expire"
    status = "Enabled"
    filter {
      and {
        prefix = "backups/mongodb/"
        tags   = { backup_type = "monthly" }
      }
    }
    expiration { days = 365 }
  }

  rule {
    id     = "incomplete-multipart"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload { days_after_initiation = 1 }
  }

  rule {
    id     = "old-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration { noncurrent_days = 90 }
  }
}

# ─── SNS Topic for alerts ───────────────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "dice-alerts"
}

resource "aws_sns_topic_subscription" "ops_email" {
  count     = var.ops_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.ops_email
}

# ─── CloudWatch Alarms ──────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "instance_status" {
  alarm_name          = "dice-instance-status-check-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed_System"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Instance is unhealthy — auto-recovery will attempt restart"
  alarm_actions = [
    "arn:aws:automate:${var.region}:ec2:recover",
    aws_sns_topic.alerts.arn,
  ]
  dimensions = {
    InstanceId = aws_instance.api.id
  }
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "dice-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Sustained CPU > 80% — consider upgrading instance type"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    InstanceId = aws_instance.api.id
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "dice-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Sustained memory > 85% — risk of OOM"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    InstanceId = aws_instance.api.id
  }
  treat_missing_data = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "high_disk" {
  alarm_name          = "dice-high-disk"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "disk_used_percent"
  namespace           = "CWAgent"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Disk > 75% — clean up logs/temp"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"
}

# ─── AWS Budget (cost guardrail) ────────────────────────────────
resource "aws_budgets_budget" "monthly" {
  name         = "dice-monthly-budget"
  budget_type  = "COST"
  limit_amount = "70"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.ops_email]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.ops_email]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.ops_email]
  }
}
