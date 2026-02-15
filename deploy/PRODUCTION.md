# Production deployment

There are two deployment models:

* **Single-server** — everything runs on one machine with [Caddy](https://caddyserver.com) providing automatic HTTPS via Let's Encrypt. Easy to set up, good for small teams.
* **Multi-server** — the server and dependencies run on one machine, testrunners run on separate dedicated machines. This gives you stable performance metrics since test machines are not shared with other services.

Both models use Docker Compose and the same `.env` configuration.

---

## Single-server deployment (with Caddy)

All services (Redis, PostgreSQL, MinIO, the sitespeed.io server, testrunner, and Caddy) run on the same machine. Only ports 80 and 443 are exposed — Caddy handles TLS termination and proxies traffic to the server and MinIO.

### Steps

1. **Clone the repository and checkout a release tag:**
    ```bash
    git clone https://github.com/sitespeedio/onlinetest.git
    cd onlinetest
    git checkout <release-tag>
    ```

2. **Copy and configure the environment file:**
    ```bash
    cp .env.example .env
    ```

3. **Change all passwords** in `.env` — every `CHANGE_ME` value must be replaced. Use `openssl rand -base64 24` to generate strong passwords.

4. **Set your domain and URLs:**
    ```
    DOMAIN=yourdomain.com
    RESULT_BASE_URL=https://yourdomain.com/sitespeedio
    SITESPEED.IO_HTML_HOMEURL=https://yourdomain.com/
    ```

5. **Restrict which domains can be tested** (important for public-facing instances):
    ```
    VALID_TEST_DOMAINS=^https?://(.*\.)?(example\.com|mysite\.org)
    ```

6. **Update the Redis password** in `redis-conf/redis.conf` — change the `requirepass` line to match `REDIS_PASSWORD` in your `.env`.

7. **Start everything:**
    ```bash
    docker compose -f deploy/docker-compose.production.yml up -d
    ```

Make sure your DNS points `yourdomain.com` to the server's IP. Caddy will automatically obtain a TLS certificate from Let's Encrypt on first request.

### What gets exposed

| Port | Service |
|------|---------|
| 80   | Caddy (HTTP → HTTPS redirect) |
| 443  | Caddy (HTTPS → server + MinIO) |

All other services communicate internally on the `skynet` Docker network.

---

## Multi-server deployment

Run the server and dependencies on one machine (the **server machine**) and testrunners on separate **testrunner machines**. This keeps test execution isolated so that CPU/memory pressure from the server does not affect performance metrics.

Run one testrunner per machine for stable results.

### Server machine

1. **Clone, checkout a release tag, and configure `.env`** (same steps as single-server above, steps 1–6).

2. **Start the server and dependencies:**
    ```bash
    docker compose -f deploy/docker-compose.production-server.yml up -d
    ```

This exposes:

| Port | Service    |
|------|------------|
| 3000 | Server     |
| 5432 | PostgreSQL |
| 6379 | Redis      |
| 9000 | MinIO      |

You will want to put a reverse proxy (Caddy, nginx, etc.) in front of port 3000 and 9000 for HTTPS — see [Reverse proxy examples](#reverse-proxy-examples) below.

3. **Lock down ports with iptables** — Redis, PostgreSQL, and MinIO should only be accessible from your testrunner machine(s), not the public internet. Replace `<testrunner-ip>` with the IP of each testrunner:

    ```bash
    # Allow testrunner(s) to reach Redis
    sudo iptables -A INPUT -p tcp --dport 6379 -s <testrunner-ip> -j ACCEPT
    # Allow testrunner(s) to reach MinIO
    sudo iptables -A INPUT -p tcp --dport 9000 -s <testrunner-ip> -j ACCEPT

    # Block everyone else from Redis, PostgreSQL, and MinIO
    sudo iptables -A INPUT -p tcp --dport 6379 -j DROP
    sudo iptables -A INPUT -p tcp --dport 5432 -j DROP
    sudo iptables -A INPUT -p tcp --dport 9000 -j DROP
    ```

    If you have multiple testrunners, repeat the ACCEPT lines for each IP. To persist the rules across reboots, use `iptables-save` or install `iptables-persistent`:

    ```bash
    sudo apt-get install iptables-persistent
    sudo netfilter-persistent save
    ```

### Testrunner machine

1. **Clone the repository and checkout the same release tag:**
    ```bash
    git clone https://github.com/sitespeedio/onlinetest.git
    cd onlinetest
    git checkout <release-tag>
    ```

2. **Create a `.env` file** with the connection details for the server machine:
    ```
    REDIS_HOST=<server-machine-ip>
    REDIS_PASSWORD=<same-password-as-server>
    SITESPEED_IO_TESTRUNNER_VERSION=2
    LOCATION_NAME=default
    SITESPEED_IO_CONTAINER=sitespeedio/sitespeed.io:39
    SITESPEED_IO_S3_ENDPOINT=http://<server-machine-ip>:9000
    MINIO_USER=sitespeedio
    MINIO_PASSWORD=<same-minio-password-as-server>
    RESULT_BASE_URL=https://yourdomain.com/sitespeedio
    ```

3. **Start the testrunner:**
    ```bash
    docker compose -f deploy/docker-compose.production-testrunner.yml up -d
    ```

4. **Enable network throttling (Linux only):**
    ```bash
    sudo modprobe ifb numifbs=1
    ```

### Reverse proxy examples

If you are running the multi-server setup you need your own reverse proxy in front of the server machine. Here are examples for Caddy and nginx.

#### Caddy

```
yourdomain.com {
    handle /sitespeedio/* {
        reverse_proxy <server-machine-ip>:9000
    }
    handle {
        reverse_proxy <server-machine-ip>:3000
    }
}
```

#### nginx

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /sitespeedio/ {
        proxy_pass http://<server-machine-ip>:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://<server-machine-ip>:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

---

## Configuration reference

### Server and testrunner configuration files

The server and testrunner each have a YAML configuration file with many options:

* **Server**: [server/config/server.yaml](https://github.com/sitespeedio/onlinetest/blob/main/server/config/server.yaml)
* **Testrunner**: [testrunner/config/testrunner.yaml](https://github.com/sitespeedio/onlinetest/blob/main/testrunner/config/testrunner.yaml)

You can mount custom configuration files into the containers using Docker volumes.

### Domain validation

Use `VALID_TEST_DOMAINS` to restrict which URLs can be tested. This is a regular expression matched against each submitted URL. Examples:

```
# Allow only example.com and mysite.org (with subdomains)
VALID_TEST_DOMAINS=^https?://(.*\.)?(example\.com|mysite\.org)

# Allow only specific subdomains
VALID_TEST_DOMAINS=^https?://(www\.|staging\.)example\.com

# Allow all domains (only for private/internal instances)
VALID_TEST_DOMAINS=.*
```

### sitespeed.io version

Pin the sitespeed.io Docker image used by the testrunner:

```
# Use latest within major version (auto-updates on pull)
SITESPEED_IO_CONTAINER=sitespeedio/sitespeed.io:39

# Pin to exact version (recommended for production)
SITESPEED_IO_CONTAINER=sitespeedio/sitespeed.io:39.0.0
```

### Connectivity throttling (Linux only)

To use network throttling profiles (3G, Cable, etc.) inside Docker containers on Linux, load the `ifb` kernel module:

```bash
sudo modprobe ifb numifbs=1
```

Add this to `/etc/modules` or a systemd unit to persist across reboots. On macOS, only native connectivity is available when running inside Docker.

---

## Start on boot

All containers use `restart: always`, so Docker will restart them after a crash. But after a full server reboot, the Docker daemon itself must be running. Enable it to start on boot:

```bash
sudo systemctl enable docker
```

If you use connectivity throttling, the `ifb` kernel module also needs to load on boot. Add it to `/etc/modules`:

```bash
echo "ifb" | sudo tee -a /etc/modules
```

Or create a systemd unit that runs `modprobe ifb numifbs=1` before Docker starts.

---

## Log rotation

Docker containers can produce large log files over time. Configure log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

This limits each container's log to 3 files of 10 MB each. Restart Docker after changing this:

```bash
sudo systemctl restart docker
```

You can also set log options per-service in the compose file if you want different limits for specific containers:

```yaml
services:
  sitespeed.io-server:
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
```

---

## Updating

To update to a new version:

1. Pull new images:
    ```bash
    docker compose -f <your-compose-file> pull
    ```

2. Restart:
    ```bash
    docker compose -f <your-compose-file> up -d
    ```

To update to a new major version of the server/testrunner, change the version tags in `.env`:

```
SITESPEED_IO_SERVER_VERSION=2
SITESPEED_IO_TESTRUNNER_VERSION=2
```
