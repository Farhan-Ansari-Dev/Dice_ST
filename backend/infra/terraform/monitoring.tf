resource "aws_security_group" "monitoring_sg" {
  name        = "monitoring-sg"
  description = "Allow inbound Prometheus and Grafana from office IP"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "Prometheus"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Grafana"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP – needed for Nginx reverse-proxy
  ingress {
    description = "HTTP (NGINX reverse proxy)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "monitoring_sg" {
  name        = "monitoring-sg"
  description = "SG for monitoring EC2 (Prometheus/Grafana/Nginx)"
  vpc_id      = data.aws_vpc.default.id

  # Existing HTTP rule (port 80) – leave unchanged
  ingress {
    description = "HTTP (Nginx reverse proxy)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # **NEW** HTTPS rule (port 443)
  ingress {
    description = "HTTPS (TLS termination by Nginx)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_iam_role" "monitoring_role" {
  name = "monitoring-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "ec2.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_policy" "monitoring_policy" {
  name = "monitoring-policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation"
      ],
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "monitoring_attach" {
  role       = aws_iam_role.monitoring_role.name
  policy_arn = aws_iam_policy.monitoring_policy.arn
}

resource "aws_iam_instance_profile" "monitoring_profile" {
  name = "monitoring-instance-profile"
  role = aws_iam_role.monitoring_role.name
}

resource "aws_iam_role_policy_attachment" "monitoring_ssm" {
  role       = aws_iam_role.monitoring_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# ─── Ubuntu 22.04 LTS AMD64 AMI (latest) ────────────────────────
data "aws_ami" "ubuntu_x86" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "monitoring" {
  ami                         = data.aws_ami.ubuntu_x86.id
  instance_type               = "t3.micro"
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.monitoring_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.monitoring_profile.name
  associate_public_ip_address = true
  key_name                    = "monitoring-key"
  tags = {
    Name = "monitoring-prometheus"
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e
    apt-get update && apt-get install -y docker.io openssh-server
    systemctl enable --now docker
    systemctl enable --now ssh

    # Run Prometheus (basic config will be mounted later)
    docker run -d --name prometheus -p 9090:9090 prom/prometheus

    # Run Grafana
    docker run -d --name grafana -p 3000:3000 -e "GF_SECURITY_ADMIN_PASSWORD=admin" grafana/grafana

    # CloudWatch exporter
    docker run -d --name cw-exporter -p 9106:9106 -e "AWS_REGION=${var.region}" quay.io/prometheus/cloudwatch-exporter

    # Node exporter for this host
    docker run -d --name node-exporter -p 9100:9100 prom/node-exporter
  EOF
}

output "monitoring_public_ip" {
  description = "Public IP of monitoring instance"
  value       = aws_instance.monitoring.public_ip
}

resource "cloudflare_dns_record" "prometheus" {
  zone_id = var.cloudflare_zone_id
  name    = "prometheus"
  type    = "A"
  ttl     = 1
  content = aws_instance.monitoring.public_ip
  proxied = false
}

resource "cloudflare_dns_record" "grafana" {
  zone_id = var.cloudflare_zone_id
  name    = "grafana"
  type    = "A"
  ttl     = 1
  content = aws_instance.monitoring.public_ip
  proxied = false
}
