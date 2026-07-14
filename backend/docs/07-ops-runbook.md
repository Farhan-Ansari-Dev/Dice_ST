# Operations Runbook

This runbook captures the production-safe commands for backend health checks, PM2 recovery, and monitoring checks.

## 1) Environment

- Region: `ap-south-1`
- Backend EC2 (`dice-api`): `i-0a9af4e4cdaf9735f`
- Monitoring EC2 (`monitoring-prometheus`): `i-0317ea91e2a50b8c9`
- Public API health: `https://api.sanyogconformity.com/health`

## 2) Backend Health Check (No Restart)

```bash
aws --no-cli-pager ssm send-command \
	--region ap-south-1 \
	--instance-ids i-0a9af4e4cdaf9735f \
	--document-name AWS-RunShellScript \
	--comment "backend-health-check" \
	--parameters 'commands=[
		"systemctl is-active pm2-dice || true",
		"su - dice -c \"pm2 ls\" || true",
		"curl -fsS --max-time 8 http://127.0.0.1:5000/health || curl -fsS --max-time 8 http://127.0.0.1:5000/api/health"
	]' \
	--query 'Command.CommandId' --output text
```

Also verify public path:

```bash
curl -I --max-time 15 https://api.sanyogconformity.com/health
curl -sS --max-time 15 https://api.sanyogconformity.com/health
```

## 3) Controlled Backend Restart

```bash
aws --no-cli-pager ssm send-command \
	--region ap-south-1 \
	--instance-ids i-0a9af4e4cdaf9735f \
	--document-name AWS-RunShellScript \
	--comment "backend-restart" \
	--parameters 'commands=[
		"set -e",
		"systemctl restart pm2-dice",
		"sleep 2",
		"systemctl is-active pm2-dice",
		"su - dice -c \"pm2 ls\"",
		"curl -fsS --max-time 8 http://127.0.0.1:5000/health || curl -fsS --max-time 8 http://127.0.0.1:5000/api/health"
	]' \
	--query 'Command.CommandId' --output text
```

## 4) PM2 Recovery (If `pm2-dice` Fails)

Use this when service fails with PID ownership/protocol issues caused by a standalone PM2 daemon.

```bash
aws --no-cli-pager ssm send-command \
	--region ap-south-1 \
	--instance-ids i-0a9af4e4cdaf9735f \
	--document-name AWS-RunShellScript \
	--comment "pm2-recovery" \
	--parameters 'commands=[
		"set -e",
		"su - dice -c \"pm2 kill\" || true",
		"rm -f /home/dice/.pm2/pm2.pid || true",
		"systemctl reset-failed pm2-dice || true",
		"systemctl start pm2-dice",
		"sleep 2",
		"systemctl is-active pm2-dice",
		"su - dice -c \"pm2 ls\""
	]' \
	--query 'Command.CommandId' --output text
```

## 5) Verify Google OAuth Runtime Values

The source of truth for runtime values is `/etc/dice/.env`.

```bash
aws --no-cli-pager ssm send-command \
	--region ap-south-1 \
	--instance-ids i-0a9af4e4cdaf9735f \
	--document-name AWS-RunShellScript \
	--comment "verify-google-env" \
	--parameters 'commands=[
		"grep -n \"^GOOGLE_CLIENT_ID\" /etc/dice/.env || true",
		"grep -n \"^GOOGLE_CLIENT_IDS\" /etc/dice/.env || true",
		"su - dice -c \"pm2 env 0\" | egrep \"^GOOGLE_CLIENT_ID=|^GOOGLE_CLIENT_IDS=\" || true"
	]' \
	--query 'Command.CommandId' --output text
```

## 6) Monitoring Health Check

```bash
aws --no-cli-pager ssm send-command \
	--region ap-south-1 \
	--instance-ids i-0317ea91e2a50b8c9 \
	--document-name AWS-RunShellScript \
	--comment "monitoring-health" \
	--parameters 'commands=[
		"docker ps --format \"table {{.Names}}\\t{{.Image}}\\t{{.Status}}\"",
		"sudo nginx -t",
		"sudo systemctl is-active nginx"
	]' \
	--query 'Command.CommandId' --output text
```

## 7) Security Notes

- Backend EC2 ingress for `80/443` is intentionally Cloudflare-only.
- Direct public-IP HTTPS checks can fail by design. Validate via domain.
- Keep Prometheus behind auth and rotate credentials periodically.
- Rotate Grafana admin credentials if still using temporary/shared values.
