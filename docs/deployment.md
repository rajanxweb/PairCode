# PairCode — Production Deployment Runbook

## 1. Deployment Topology

PairCode comprises three independently deployable production processes and one managed PostgreSQL database:
1. **Web Application (`apps/web`)**: Next.js App Router deployed on Vercel or Node.js container host.
2. **Realtime WebSocket Server (`apps/realtime`)**: Long-running Node.js process deployed on persistent container platform (e.g. Render, Railway, Fly.io, or AWS ECS/Fargate) with WebSocket support.
3. **Execution Worker Daemon (`apps/worker`)**: Persistent background Node.js daemon deployed on Render, Railway, or AWS ECS.
4. **PostgreSQL 16+ Database**: Managed PostgreSQL instance (Supabase, Neon, AWS RDS) with connection pooling.
5. **Judge0 Instance**: Hosted Judge0 CE/Pro instance or self-hosted container cluster with sandboxing (gVisor).

---

## 2. Environment Variables Checklist

### 2.1 Web Application (`apps/web`)
| Variable | Required | Description | Example / Source |
|---|---|---|---|
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection string | `postgres://user:pass@host:5432/db?pgbouncer=true` |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection string (for migrations) | `postgres://user:pass@host:5432/db` |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical public URL of the web app | `https://paircode.app` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable frontend key | `pk_test_...` or `pk_live_...` |
| `CLERK_SECRET_KEY` | Yes | Clerk secret backend API key | `sk_test_...` or `sk_live_...` |
| `REALTIME_URL` | Yes | Public WebSocket URL for Hocuspocus | `wss://realtime.paircode.app/collaboration` |
| `REALTIME_JWT_SECRET` | Yes | Shared secret for signing realtime tokens (min 32 chars) | Random 64-character hex |

### 2.2 Realtime Collaboration Service (`apps/realtime`)
| Variable | Required | Description | Example / Source |
|---|---|---|---|
| `PORT` | Yes | HTTP/WS listening port | `8080` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | Managed PostgreSQL |
| `REALTIME_JWT_SECRET` | Yes | Same secret as web app | Random 64-character hex |
| `REALTIME_ALLOWED_ORIGINS` | Yes | Comma-separated allowed CORS origins | `https://paircode.app` |

### 2.3 Execution Worker Daemon (`apps/worker`)
| Variable | Required | Description | Example / Source |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | Managed PostgreSQL |
| `JUDGE0_BASE_URL` | Yes | Base URL of Judge0 execution API | `https://judge0-ce.example.com` |
| `JUDGE0_API_KEY` | Optional | Judge0 API key (if hosted) | Provider token |
| `JUDGE0_LANGUAGE_ID_PYTHON` | Optional | Python 3 Judge0 ID | `71` or `92` |
| `JUDGE0_LANGUAGE_ID_JAVASCRIPT`| Optional | JavaScript Judge0 ID | `63` or `93` |
| `EXECUTION_CPU_TIME_LIMIT` | Optional | CPU time limit in seconds | `5.0` |
| `EXECUTION_WALL_TIME_LIMIT`| Optional | Wall clock limit in seconds | `10.0` |
| `EXECUTION_MEMORY_LIMIT_KB`| Optional | Memory limit in KB | `128000` |
| `WORKER_POLL_INTERVAL_MS` | Optional | Polling interval in ms | `1000` |
| `WORKER_CONCURRENCY` | Optional | Max concurrent jobs per worker | `3` |
| `WORKER_JOB_LEASE_MS` | Optional | Lease duration before job recovery | `60000` |

---

## 3. Step-by-Step Deployment Runbook

### Step 1: Provision Managed PostgreSQL
1. Create a PostgreSQL 16 database on your cloud provider (e.g. Neon, Supabase, AWS RDS).
2. Note both the pooled URL (`DATABASE_URL`) and direct URL (`DIRECT_URL`).

### Step 2: Configure Clerk Authentication
1. Create a project in the Clerk Dashboard.
2. In Clerk settings, configure Redirect URLs:
   - Sign in redirect: `https://paircode.app/dashboard`
   - Sign up redirect: `https://paircode.app/dashboard`
3. Retrieve `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

### Step 3: Run Database Migrations & Seed
From your local environment or CI runner:
```bash
export DATABASE_URL="<your_direct_postgres_url>"
pnpm prisma migrate deploy
pnpm prisma db seed
```

### Step 4: Deploy `apps/realtime` (WebSocket Service)
1. Build and run using the production Dockerfile:
   ```dockerfile
   docker build -t paircode-realtime -f apps/realtime/Dockerfile .
   ```
2. Deploy to a persistent host with WebSocket support (e.g. Render Web Service, Railway, Fly.io).
3. Set environment variables: `DATABASE_URL`, `REALTIME_JWT_SECRET`, `REALTIME_ALLOWED_ORIGINS`, `PORT=8080`.
4. Ensure health check target `/health` returns `200 OK`.

### Step 5: Deploy `apps/worker` (Execution Worker)
1. Build and run using the production Dockerfile:
   ```dockerfile
   docker build -t paircode-worker -f apps/worker/Dockerfile .
   ```
2. Deploy as a background worker on Render, Railway, or AWS ECS.
3. Configure environment variables: `DATABASE_URL`, `JUDGE0_BASE_URL`, `JUDGE0_API_KEY`.
4. Check worker logs to confirm successful database connection and polling loop initialization.

### Step 6: Deploy `apps/web` (Next.js App)
1. Deploy via Vercel, Railway, or container host.
2. Set all `apps/web` environment variables including `REALTIME_URL` pointing to the deployed realtime WebSocket URL (`wss://.../collaboration`).
3. Verify public landing page loads at root URL.

### Step 7: Production Smoke Test
1. Sign up a new user via Clerk on the production URL.
2. Create an interview session and copy the invitation link.
3. Join the room in an incognito window as a candidate.
4. Verify real-time typing synchronization between both windows.
5. Click RUN and confirm Judge0 sandbox output appears in the terminal.
6. Click End Interview and confirm report displays final code.
