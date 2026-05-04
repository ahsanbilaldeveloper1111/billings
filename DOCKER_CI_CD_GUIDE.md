# Docker + CI/CD Process Guide

This document explains how Docker and CI/CD are set up in this project.

## 1) What was added

- `Dockerfile` - Multi-stage production image for Next.js.
- `.dockerignore` - Excludes unnecessary files from Docker build context.
- `docker-compose.yml` - Local container build/run setup.
- `.github/workflows/ci-cd.yml` - GitHub Actions pipeline for CI and CD.
- `next.config.ts` - Uses `output: "standalone"` for smaller runtime images.

## 2) Docker build and runtime flow

The Docker image uses 3 stages:

1. `deps`:
   - Installs dependencies with `npm ci`.
2. `builder`:
   - Accepts `NEXT_PUBLIC_*` variables as build args.
   - Runs `npm run build`.
3. `runner`:
   - Copies standalone output from `.next/standalone`.
   - Runs app with `node server.js` on port `3000`.

Why this matters:

- Smaller final image.
- Faster and cleaner production startup.
- Build-time and runtime env handling are clearly separated.

## 3) Environment variables behavior

There are two env categories:

### A) Build-time vars (frontend/public vars)

These must be available during `next build`:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_LARAVEL_API_URL`
- `NEXT_PUBLIC_LARAVEL_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_API_SAME_ORIGIN_PROXY`

These are passed as:

- Docker build args in `docker-compose.yml` for local builds.
- Docker build args in GitHub Actions for CD builds.

### B) Runtime vars (server-side vars)

These are used when the container is running (for server routes, APIs, secrets):

- `API_BASE_URL`
- `LARAVEL_UPSTREAM_ORIGIN`
- `API_TLS_INSECURE`
- `STRIPE_SECRET_KEY`
- any other non-public server variable

For local Docker, runtime vars are loaded via:

- `env_file: .env` in `docker-compose.yml`.

## 4) Local development with Docker

From project root:

```bash
docker compose up --build
```

App is exposed at:

- `http://localhost:3000`

Useful commands:

```bash
docker compose down
docker compose up -d --build
docker compose logs -f billing-frontend
```

## 5) GitHub Actions pipeline flow

Workflow file:

- `.github/workflows/ci-cd.yml`

### CI job (runs on PRs and pushes to `main`)

Steps:

1. Checkout repository
2. Setup Node 20
3. `npm ci`
4. `npm run lint`
5. `npm run build`

### CD job (runs only on push to `main`)

Steps:

1. Checkout repository
2. Setup Docker Buildx
3. Login to GitHub Container Registry (`ghcr.io`)
4. Build Docker image
5. Push image tags:
   - `sha` tag
   - `latest`

Published image path format:

- `ghcr.io/<owner>/<repo>`

## 6) Required GitHub repository secrets

Set these in:

- GitHub repo -> Settings -> Secrets and variables -> Actions

Required for Docker build in CD job:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_LARAVEL_API_URL`
- `NEXT_PUBLIC_LARAVEL_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_API_SAME_ORIGIN_PROXY`

Recommended (if needed by your app/deploy target):

- `API_BASE_URL`
- `LARAVEL_UPSTREAM_ORIGIN`
- `API_TLS_INSECURE`
- `STRIPE_SECRET_KEY`

Note: The recommended runtime secrets are not consumed directly by GitHub Actions in this workflow, but are commonly needed by the runtime environment where the container is deployed.

## 7) Security notes

- Never commit real credentials in `.env`.
- Use GitHub Secrets for CI/CD values.
- Prefer keeping sensitive values server-side only (avoid `NEXT_PUBLIC_*` unless needed in client code).

## 8) Quick troubleshooting

- Build fails for missing public env:
  - Ensure `NEXT_PUBLIC_*` values exist in `.env` (local) and GitHub Secrets (CD).
- App cannot reach backend:
  - Check `API_BASE_URL` and `LARAVEL_UPSTREAM_ORIGIN`.
- TLS/self-signed cert issues:
  - Verify certificate/host match.
  - Use `API_TLS_INSECURE=1` only when appropriate for your environment.

