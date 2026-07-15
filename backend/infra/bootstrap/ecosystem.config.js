/**
 * PM2 ecosystem file — cluster mode on t4g.small (2 vCPUs).
 *
 * Why cluster mode:
 *   - Uses both vCPUs (single Node process = 1 core idle)
 *   - Round-robin load balancing across workers
 *   - Zero-downtime reload (pm2 reload all) — workers restart one at a time
 *   - Survives worker crashes (auto-restart)
 *
 * Memory budget on 2GB EC2:
 *   - 2 workers × ~400 MB = 800 MB
 *   - 50 MB in-memory cache
 *   - ~1 GB free for OS + Caddy + buffers
 */
module.exports = {
  apps: [{
    name: 'dice-api',
    script: './dist/index.js',           // built TypeScript output
    cwd: '/opt/dice/backend',
    instances: 2,                         // match t4g.small vCPU count
    exec_mode: 'cluster',                 // enable load balancing across workers

    // Environment — always production; env_file layered on top
    node_args: '--max-old-space-size=512',
    env: {
      NODE_ENV: 'production',
    },
    env_file: '/etc/dice/.env',

    // Restart strategy
    autorestart: true,
    max_restarts: 10,
    min_uptime: '30s',                    // crash within 30s = "bad start"
    restart_delay: 4000,
    exponential_backoff_restart_delay: 100,

    // Memory limit per worker — restart if exceeds (memory leak protection)
    max_memory_restart: '600M',

    // Graceful shutdown
    kill_timeout: 5000,                   // SIGKILL after 5s if SIGTERM ignored
    wait_ready: true,                     // wait for process.send('ready')
    listen_timeout: 10000,                // give it 10s to become ready

    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    out_file: '/home/dice/.pm2/logs/dice-api-out.log',
    error_file: '/home/dice/.pm2/logs/dice-api-error.log',
    merge_logs: true,

    // Watch mode OFF in production
    watch: false,

    // Health check
    health_check_grace_period: 30000,
  }],
};
