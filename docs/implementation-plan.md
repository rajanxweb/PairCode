# PairCode — Implementation Plan

This implementation plan outlines the autonomous, phased engineering roadmap for PairCode across the 10 mandated Git checkpoints.

---

## Checkpoint 1: Product Specification & System Architecture
- **Work Items**:
  - Author comprehensive product requirements document (`docs/requirements.md`).
  - Author detailed system architecture specification (`docs/architecture.md`).
  - Author relational database design with Prisma model schemas and index plans (`docs/database-design.md`).
  - Author OpenAPI/REST API contract specifications with Zod validation schemas (`docs/api-contracts.md`).
  - Author collaborative document synchronization and awareness specification (`docs/collaboration.md`).
  - Author asynchronous Judge0 execution engine and worker architecture specification (`docs/execution-engine.md`).
  - Author security guidelines, threat modeling, and abuse prevention rules (`docs/security.md`).
  - Author testing strategies and Playwright/Vitest plans (`docs/testing.md`).
  - Author production deployment runbook (`docs/deployment.md`).
  - Author root agent conventions and operational guide (`AGENTS.md`).
- **Dependencies**: Workspace inspection, tool verification.
- **Expected Deliverables**: All 10 documentation files and `AGENTS.md` in repository.
- **Verification Criteria**: File presence, markdown integrity, documentation consistency across all system layers.
- **Commit**: `docs: define PairCode requirements and system architecture`

---

## Checkpoint 2: Project Infrastructure & Development Tooling
- **Work Items**:
  - Configure `pnpm` workspaces (`pnpm-workspace.yaml`, root `package.json`).
  - Set up `packages/shared` with shared TypeScript types, schemas (Zod), and constants.
  - Set up `apps/web` (Next.js 15+ App Router, Tailwind CSS, TypeScript, Lucide React).
  - Set up `apps/realtime` (Node.js/TypeScript service with Hocuspocus).
  - Set up `apps/worker` (Node.js/TypeScript service for asynchronous Judge0 job processing).
  - Configure TypeScript configs (`tsconfig.json` in root and packages).
  - Configure root ESLint, Prettier, and Vitest test runner.
  - Configure `docker-compose.yml` for local PostgreSQL 16.
  - Configure `.env.example` with comprehensive variable templates.
- **Dependencies**: Checkpoint 1.
- **Expected Deliverables**: Clean monorepo structure, buildable packages, passing lint and typecheck.
- **Verification Criteria**: `pnpm install`, `pnpm typecheck`, `pnpm build` pass.
- **Commit**: `chore: initialize PairCode monorepo and development tooling`

---

## Checkpoint 3: Authentication & Database Foundation
- **Work Items**:
  - Define complete Prisma schema (`prisma/schema.prisma`): `User`, `Question`, `TestCase`, `InterviewSession`, `YjsDocument`, `InterviewNote`, `Execution`, `ExecutionCaseResult`.
  - Configure Prisma client generation in shared package/monorepo.
  - Create database migration scripts (`prisma/migrations`).
  - Author comprehensive, idempotent seed script (`prisma/seed.ts`) with 10+ high-quality original coding questions (Arrays, Strings, Hash maps, Two-pointer, Sorting, Searching, Recursion, Stack, Queue, Dynamic Programming) and complete test cases (sample and hidden).
  - Implement Clerk authentication integration, middleware, and user synchronization (`GET /api/me`, automatic DB profile sync).
  - Implement server-side authorization helpers (`lib/auth/server.ts`, role verification, session membership).
- **Dependencies**: Checkpoint 2, local PostgreSQL container or test DB.
- **Expected Deliverables**: Prisma migrations, seed script, Clerk auth middleware, auth helpers, unit tests.
- **Verification Criteria**: Unit tests pass for auth helpers, token generation/hashing, and Prisma schema validation.
- **Commit**: `feat(auth): implement authentication and database foundation`

---

## Checkpoint 4: Interview & Question APIs
- **Work Items**:
  - Implement Question APIs: `GET /api/questions`, `GET /api/questions/[id]` (sanitized sample cases only, search, filters, pagination).
  - Implement Interview APIs: `POST /api/interviews`, `GET /api/interviews`, `GET /api/interviews/[id]`.
  - Implement Lifecycle APIs: `POST /api/interviews/[id]/start`, `POST /api/interviews/[id]/end`.
  - Implement Invitation APIs: `POST /api/invitations/[token]/accept`, `POST /api/interviews/[id]/invitation/rotate`.
  - Implement Realtime Token generation: `POST /api/interviews/[id]/realtime-token` (short-lived HS256 JWT signed with `REALTIME_JWT_SECRET`).
  - Unit & Integration tests for all endpoints: permission enforcement, validation, lifecycle transitions.
- **Dependencies**: Checkpoint 3.
- **Expected Deliverables**: Complete API route handlers with Zod schema validation, transaction-safe lifecycle transitions, sanitized responses.
- **Verification Criteria**: Backend API integration tests pass with 100% assertions satisfied.
- **Commit**: `feat(interviews): implement room management and question APIs`

---

## Checkpoint 5: Frontend Foundation & Design System
- **Work Items**:
  - Implement quiet, refined, editorial developer-tool aesthetic in Tailwind CSS (design tokens: `--background`, `--surface`, `--primary`, `--border`, etc.).
  - Build public Landing Page (`/`): clear value proposition, interface preview composition, feature breakdown, CTA.
  - Build Auth Pages (`/sign-in`, `/sign-up`) with styled Clerk wrappers.
  - Build Interviewer Dashboard (`/dashboard`): real statistics (total, active, completed), recent interviews, new interview trigger.
  - Build Interview Creation Page (`/interviews/new`): title, question picker, duration, post-creation invitation dialog.
  - Build Question Bank Page (`/questions`, `/questions/[id]`): search, topic filter, difficulty filter, detail view.
  - Build Invitation Acceptance Page (`/join/[token]`): verification, join confirmation, redirect to room.
  - Build Completed Interview History (`/history`, `/history/[sessionId]`): interview overview, candidate, question, final code preview, private notes (interviewer only).
  - Build responsive mobile/tablet layout support with collapsible panels and desktop browser guidance.
- **Dependencies**: Checkpoint 4.
- **Expected Deliverables**: Polished React Server & Client components, responsive UI, zero console errors, accessible forms.
- **Verification Criteria**: `pnpm lint`, `pnpm typecheck`, `pnpm build` pass.
- **Commit**: `feat(ui): build responsive PairCode application interface`

---

## Checkpoint 6: Monaco Code Editor & Asynchronous Code Execution Engine
- **Work Items**:
  - Implement Monaco Editor client component (`CodeEditor.tsx`) with dark editorial theme, syntax highlighting, line numbers, automatic resizing, and language selector (Python, JavaScript).
  - Build Judge0 HTTP client with asynchronous submission polling, resource limits, and language ID mapping.
  - Build PostgreSQL-backed execution queue schema and operations (`Execution`, `ExecutionCaseResult`).
  - Implement worker process (`apps/worker`): atomic job claiming (`SELECT ... FOR UPDATE SKIP LOCKED`), polling Judge0, evaluating test cases (sample and hidden), output normalization, error handling, worker lease recovery.
  - Implement Execution APIs: `POST /api/interviews/[id]/executions` (returns HTTP 202 with execution ID), `GET /api/executions/[executionId]`, `GET /api/interviews/[id]/active-execution`.
  - Build Interactive Terminal Component (`Terminal.tsx`): Output, Test Cases, Errors tabs, custom stdin input for RUN, test case breakdown for SUBMIT.
  - Build Test Judge0 mock provider for automated integration testing.
- **Dependencies**: Checkpoint 5.
- **Expected Deliverables**: Monaco editor integration, working worker daemon, execution polling, terminal UI.
- **Verification Criteria**: Worker tests pass with fake Judge0 simulating passed, failed, compilation error, runtime error, timeout.
- **Commit**: `feat(execution): add Monaco editor and asynchronous code execution`

---

## Checkpoint 7: Realtime Collaboration & Document Persistence
- **Work Items**:
  - Implement Hocuspocus WebSocket server in `apps/realtime`:
    - JWT authentication hook (`onAuthenticate` verifying room token and claims).
    - Room authorization and lifecycle hook (rejecting modifications to COMPLETED interviews).
    - PostgreSQL document storage hooks (`onLoadDocument`, `onStoreDocument`) loading from / persisting binary Yjs snapshots to `YjsDocument`.
    - Starter code injection if no existing document snapshot is present.
  - Implement client-side collaborative binding:
    - `@hocuspocus/provider` client connecting to WebSocket endpoint.
    - `y-monaco` binding Yjs `sharedCode` (`ydoc.getText("code")`) to Monaco Editor model.
    - Yjs Awareness integration: remote cursor positioning, selection highlighting, user presence list, distinct participant colors.
    - Connection state machine (connecting, connected, reconnecting, disconnected, auth-expired).
  - Implement automated two-client integration tests:
    - Start local Hocuspocus server on test port.
    - Connect Client A and Client B; verify typing convergence, awareness sync, reconnection state recovery, and persistence to PostgreSQL.
- **Dependencies**: Checkpoint 6.
- **Expected Deliverables**: Independent realtime microservice, client Yjs provider wrapper, awareness cursors, persistence hooks, automated realtime test suite.
- **Verification Criteria**: Two-client realtime integration tests pass.
- **Commit**: `feat(realtime): implement collaborative editing and document persistence`

---

## Checkpoint 8: Complete Interview Workflow & Lifecycle Integration
- **Work Items**:
  - Assemble unified Collaborative Interview Room (`/room/[roomCode]`):
    - Header: PairCode branding, title, status badge, participant presence, server-authoritative timer, connection status indicator.
    - Left Panel: Question statement, constraints, examples.
    - Right Top Panel: Monaco editor with shared cursors, language selector, Run and Submit buttons.
    - Right Bottom Panel: Resizable/collapsible Terminal with shared execution output.
    - Interviewer Controls: Start Interview, End Interview, Invitation link management, Private Notes Drawer.
  - Implement Private Interview Notes:
    - `GET /api/interviews/[id]/notes`, `PUT /api/interviews/[id]/notes`.
    - Autosaving note fields (approach, technical understanding, communication, strengths, areas for improvement, overall).
    - Strict authorization: completely hidden and inaccessible to candidate.
  - Implement Interview Lifecycle enforcement:
    - Server-authoritative timer with auto-completion upon deadline expiry.
    - End interview action: snapshots latest Yjs text into `finalCode` and `finalLanguage`, marks session `COMPLETED`, locks document writes.
    - Post-interview report page with final code display and execution log.
- **Dependencies**: Checkpoint 7.
- **Expected Deliverables**: End-to-end operational interview room, shared timer, notes drawer, interview report.
- **Verification Criteria**: Workflow integration tests pass.
- **Commit**: `feat(interviews): complete interview workflow and result history`

---

## Checkpoint 9: Security Hardening & Automated Testing Suite
- **Work Items**:
  - Comprehensive security review and verification:
    - Verify hidden test cases are never leaked in API payloads or browser DOM.
    - Verify candidate cannot access interviewer notes or interviewer-only controls.
    - Verify SHA-256 invitation token hashing and single-candidate binding.
    - Verify rate limiting and source/stdin byte size restrictions.
    - Verify no remote code execution occurs on main Next.js backend.
  - Vitest Unit & Integration Test Suite:
    - Token generation and verification tests.
    - State transition and permission enforcement tests.
    - Worker job claiming and lease expiration tests.
    - Execution result sanitization tests.
  - Playwright End-to-End Automated Tests:
    - Two-browser context test simulating Interviewer and Candidate across the entire lifecycle:
      Interviewer creates interview -> Candidate joins -> Interviewer starts -> Concurrent code editing -> Candidate runs code -> Worker processes -> Output displays -> Interviewer adds private notes -> Interviewer ends interview -> Final code saved in history.
- **Dependencies**: Checkpoint 8.
- **Expected Deliverables**: Automated test suite covering unit, integration, realtime, and E2E scenarios.
- **Verification Criteria**: All automated test suites run and pass.
- **Commit**: `test(security): add comprehensive integration and end-to-end coverage`

---

## Checkpoint 10: Production Readiness & Final Deployment Preparation
- **Work Items**:
  - Author production multi-stage `Dockerfile` for `apps/web`.
  - Author production `Dockerfile` for `apps/realtime` with health check (`/health`) and graceful shutdown.
  - Author production `Dockerfile` for `apps/worker` with health check and graceful shutdown.
  - Create GitHub Actions CI pipeline (`.github/workflows/ci.yml`).
  - Write comprehensive `README.md` with architecture diagram, local setup instructions, environment reference, and feature inventory.
  - Final audit of environment variables and clean documentation in `docs/deployment.md`.
  - Run full validation pipeline: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Dependencies**: Checkpoint 9.
- **Expected Deliverables**: Dockerfiles, CI workflow, complete documentation, verified build.
- **Verification Criteria**: Clean builds for all apps, zero type errors, all tests green.
- **Commit**: `chore(deploy): prepare PairCode for production deployment`
