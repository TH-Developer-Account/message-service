/**
 * PM2 ecosystem config — production process manager
 *
 * Runs inside Docker via `pm2-runtime` (foreground mode, no daemon).
 * Docker Compose handles container-level restarts (restart: unless-stopped).
 * PM2 handles cluster workers and per-worker memory restarts inside the container.
 *
 * Deploy:
 *   docker-compose up -d --build app
 *
 * Inspect inside the running container:
 *   docker-compose exec app pm2 list
 *   docker-compose exec app pm2 logs
 *   docker-compose exec app pm2 monit
 */
module.exports = {
  apps: [
    {
      name: "message-service",
      script: "./server.js",

      // ── Clustering ──────────────────────────────────────────────────────
      // "max" spawns one worker per logical CPU core, saturating the instance.
      // On a 2-vCPU t3.small this gives 2 workers; on a 4-vCPU t3.xlarge, 4.
      // Each worker runs its own BullMQ consumer — Redis coordinates so no
      // job is processed twice.
      instances: 2,
      exec_mode: "cluster",

      // ── Environment ─────────────────────────────────────────────────────
      env_file: ".env",
      env: {
        NODE_ENV: "production",
        // NODE_ENV: "development",
      },

      // ── Memory guard ────────────────────────────────────────────────────
      // Inside Docker: 2 workers × 150 MB = 300 MB, fitting inside the
      // container's 700 MB mem_limit with headroom for PM2 overhead.
      max_memory_restart: "150M",

      // ── Restart policy ──────────────────────────────────────────────────
      autorestart: true, // restart on crash (exit code != 0)
      max_restarts: 10, // stop retrying after 10 rapid crashes
      min_uptime: "10s", // a restart counts only if it lived ≥ 10 s
      restart_delay: 2000, // wait 2 s before each restart attempt

      // ── Zero-downtime reload ─────────────────────────────────────────────
      // PM2 waits for process.send('ready') from server.js before cutting
      // traffic over to the new worker. listen_timeout is the deadline.
      wait_ready: true,
      listen_timeout: 15000,

      // ── Graceful shutdown ────────────────────────────────────────────────
      // PM2 sends SIGTERM and waits up to kill_timeout ms before SIGKILL.
      // Must be less than server.js's own 30 s force-exit so PM2 sees a
      // clean exit rather than killing the process itself.
      kill_timeout: 25000,

      // ── Logging ─────────────────────────────────────────────────────────
      // Winston already writes to logs/ — these capture PM2-level stdout/stderr
      // (startup messages, unhandled crashes before Winston initialises).
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
