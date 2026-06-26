output "ec2_public_ip" {
  description = "Public IP — point your DNS A record here"
  value       = aws_eip.api.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.api.id
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i ~/.ssh/dice-operator ubuntu@${aws_eip.api.public_ip}"
}

output "s3_bucket_name" {
  description = "S3 bucket name (for .env config)"
  value       = aws_s3_bucket.docs.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.docs.arn
}

output "sns_topic_arn" {
  description = "SNS topic for alerts (subscribe more endpoints if needed)"
  value       = aws_sns_topic.alerts.arn
}

output "next_steps" {
  description = "What to do after terraform apply"
  value       = <<-EOT
    ════════════════════════════════════════════════════════════
      ✅ Infrastructure provisioned!
    ════════════════════════════════════════════════════════════

    Public IP:   ${aws_eip.api.public_ip}
    S3 bucket:   ${aws_s3_bucket.docs.id}
    SSH:         ssh ubuntu@${aws_eip.api.public_ip}

    NEXT STEPS:

    1. Confirm SNS email subscription (check your inbox).

    2. Add DNS A record in Cloudflare:
         ${var.domain} → ${aws_eip.api.public_ip}
       Make sure the orange proxy cloud is ON ☁️

    3. Wait 2–3 minutes for EC2 user-data to finish.

    4. SSH in and configure secrets:
         ssh ubuntu@${aws_eip.api.public_ip}
         sudo nano /etc/dice/.env
       Fill in: DATABASE_URL (Atlas), JWT_SECRET, RAZORPAY_KEY_*, OPENAI_API_KEY

    5. Set Atlas IP allowlist to: ${aws_eip.api.public_ip}/32

    6. Push to GitHub main branch — GitHub Actions deploys automatically.

    7. Verify:
         curl https://${var.domain}/health
  EOT
}
