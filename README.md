# Express Market API

Backend API for a multi-category food market (fruits, vegetables, fish, ham, ingredients), with JWT auth, role-based access, order lifecycle, pricing configuration, and coupons.

## Features

- JWT authentication with Passport (`user`, `superadmin`, `livreur`).
- Public catalog browsing (`stores`, `products`) and protected operations.
- Superadmin management for stores, products, coupons, and pricing config.
- Order flow: `pending -> onpreparation -> ondelivery -> paid`.
- Order pricing breakdown: subtotal, delivery fee, service fee, tax, discount, coupon discount, grand total.
- Structured logging split into `logs/security`, `logs/http`, `logs/errors`.
- Swagger/OpenAPI docs protected by JWT.
- Test suites split into `unit` and `security`.

## Tech Stack

- Node.js + Express
- PostgreSQL (`pg`)
- Passport JWT + `jsonwebtoken`
- Swagger (`swagger-jsdoc`, `swagger-ui-express`)
- Jest + Supertest
- Docker + Docker Compose

## Project Structure

```text
src/
  auth/           # JWT + passport strategy/middleware
  config/         # env + rate limit config
  data/           # in-memory fallback stores (test mode)
  db/             # pg pool + transaction helper
  docs/           # OpenAPI spec + swagger setup
  logging/        # winston channels/transports
  repositories/   # data-access layer
  routes/         # API endpoints
  services/       # business logic helpers
tests/
  unit/
  security/
docker/postgres/init/  # schema + seed scripts
```

## Configuration

Create a `.env` file from `env.example`.

Required env vars (core):

- `PORT`
- `JWT_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `DATABASE_URL`

Important runtime flags:

- `TRUST_PROXY=false` (recommended unless behind trusted proxy)
- `USE_IN_MEMORY_PERSISTENCE=false` (set `true` only for specific local/testing scenarios)

## Run Locally (without Docker)

```bash
npm install
npm run dev
```

API default base URL: `http://localhost:3000/api/v1`

## Run with Docker Compose

```bash
docker compose up --build
```

If schema/init scripts changed and you need a fresh database:

```bash
docker compose down -v
docker compose up --build
```

## Test & Validation

```bash
npm run test:unit
npm run test:security
npm run test
npm run lint
```

## Authentication Quick Start

Seed users:

- `demo / demo1234` (`user`)
- `superadmin / superadmin1234` (`superadmin`, password change required before privileged access)
- `livreur / livreur1234` (`livreur`)

Important: the seeded `superadmin` must call `PATCH /api/v1/auth/change-password` after first login. Until changed, privileged routes return `403 PASSWORD_CHANGE_REQUIRED`.

Login:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"superadmin1234"}'
```

Use returned token as:

```text
Authorization: Bearer <TOKEN>
```

## Swagger Docs (Superadmin + JWT)

- OpenAPI JSON: `GET /api/v1/docs-json`
- Swagger UI: `GET /api/v1/docs`

Both endpoints require a valid Bearer token for a `superadmin` account. If password rotation is pending, access is blocked until password is changed.

## Core API Areas

- Auth: register, login, change password
- Stores: public read, superadmin CRUD
- Products: public read, superadmin CRUD
- Coupons: superadmin CRUD, apply at order creation via `couponCode`
- Buyer locations/orders: create/list
- Order transitions:
  - Superadmin confirms: `/orders/:id/confirm`
  - Livreur accepts delivery: `/orders/:id/accept-delivery`
  - Livreur marks paid: `/orders/:id/mark-paid`
- Pricing config (superadmin): `/orders/pricing-config`

## Secure Deployment on AWS EC2

Use this checklist for a production-grade EC2 deployment of this API.

### 1) Network and instance baseline

- Use a dedicated AWS account/project boundary and least-privilege IAM roles.
- Place EC2 in a private subnet when possible; expose only a load balancer/public entrypoint.
- Security Group inbound should allow only:
  - `22/tcp` from your admin IP range (or use SSM Session Manager and close 22 entirely)
  - `80/tcp` and `443/tcp` from `0.0.0.0/0`
- Never expose PostgreSQL publicly; allow DB access only from the API instance/security group.
- Enable EBS encryption and use regular snapshots for recovery.

### 2) Harden SSH and OS

- Use key-based SSH only (disable password login).
- Create a non-root deploy user; disable direct root SSH.
- Keep the host patched (`unattended-upgrades` or scheduled updates).
- Enable host firewall and intrusion protection (`ufw` + `fail2ban`).

Example firewall baseline:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

### 3) Secrets and configuration

- Do not commit `.env` to git.
- Generate a strong `JWT_SECRET` (at least 32 random bytes).
- Set production env vars securely (`JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `DATABASE_URL`, `TRUST_PROXY=true`).
- Prefer AWS Systems Manager Parameter Store or AWS Secrets Manager over plain files.
- Rotate secrets on a schedule and immediately after suspected compromise.

### 4) Runtime deployment (Docker)

- Run the API with Docker/Compose using pinned image tags.
- Run process as non-root inside containers where possible.
- Keep `USE_IN_MEMORY_PERSISTENCE=false` in production.
- Pull and deploy updates through a controlled CI/CD or audited manual process.

Example deploy flow:

```bash
docker compose pull
docker compose up -d --remove-orphans
docker compose ps
```

### 5) TLS and reverse proxy

- Put the API behind Nginx (or ALB) with HTTPS only.
- Redirect HTTP to HTTPS.
- Use modern TLS settings and auto-renew certificates.

If terminating TLS on-instance with Nginx + Certbot:

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
sudo systemctl enable nginx
sudo systemctl reload nginx
```

### 6) Logging, monitoring, and backups

- Centralize logs from `logs/security`, `logs/http`, and `logs/errors`.
- Add host/container metrics and uptime alerts (CPU, memory, disk, restart count, 5xx rate).
- Backup PostgreSQL regularly and test restore procedures.
- Keep a simple incident runbook (revoke key, rotate secrets, restore service).

### 7) Verification checklist

- `curl -I http://api.example.com` returns redirect to HTTPS.
- `curl -I https://api.example.com` returns valid TLS response.
- Security Group and `ufw` rules match intended exposure.
- DB is not publicly reachable.
- Swagger endpoints remain JWT-protected in production.
- Unit/security tests and lint pass before each release.

## Pending / Next Improvements

- Full migration/versioning system (instead of init-only SQL scripts).
- Refresh tokens and logout/session revocation.
- Payment gateway integration + webhook reconciliation.
- Inventory reservation/release to avoid overselling.
- Better delivery assignment and tracking for livreurs.
- More complete OpenAPI docs for latest endpoints.
- CI pipeline for lint/test/security checks on PRs.
