# AGENTS.md — Development Guidelines & Operational Rules for PairCode

Welcome to PairCode. This document outlines the architectural patterns, folder conventions, development commands, security rules, and git workflows for any AI agent or engineer contributing to this repository.

---

## 1. Monorepo Structure

```text
paircode/
├── apps/
│   ├── web/           # Next.js 15+ App Router, React 19, Tailwind CSS
│   ├── realtime/      # Hocuspocus WebSocket server (Node.js/TypeScript)
│   └── worker/        # Asynchronous Judge0 execution daemon (Node.js/TypeScript)
├── packages/
│   └── shared/        # Shared TypeScript types, Zod schemas, constants, utilities
├── prisma/
│   ├── schema.prisma  # PostgreSQL relational schema
│   ├── migrations/    # Version-controlled SQL migrations
│   └── seed.ts        # Idempotent seed script (10+ coding questions & test suites)
├── docs/              # Comprehensive architectural and engineering documentation
├── docker-compose.yml # Local PostgreSQL 16 container definition
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 2. Development Commands

```bash
# Install all dependencies across monorepo
pnpm install

# Start local PostgreSQL via Docker Compose
docker compose up -d

# Generate Prisma Client & run migrations
pnpm db:migrate
pnpm db:seed

# Start all three services concurrently in development mode
pnpm dev

# Run linting across all packages
pnpm lint

# Run TypeScript typechecks across all packages
pnpm typecheck

# Run unit and integration tests
pnpm test

# Run realtime collaboration tests
pnpm test:realtime

# Run Playwright end-to-end tests
pnpm test:e2e

# Build all applications for production
pnpm build
```

---

## 3. Core Coding Conventions

1. **TypeScript Strictness**:
   - Do not use `any` or `@ts-ignore`.
   - Prefer explicit interfaces and return types for functions.
   - Use Zod schemas in `packages/shared` to validate all API inputs and responses.

2. **Design System & Styling**:
   - Strictly adhere to the quiet, refined, editorial developer-tool aesthetic.
   - Use the defined color tokens (`--background: #F7F8F5`, `--surface: #FFFFFF`, `--primary: #326B57`, `--editor-background: #171C19`, etc.).
   - Use Lucide icons only. Do not use emojis in UI controls.
   - All interactive components must have loading, empty, and error states.

3. **Authentication & Authorization**:
   - Use Clerk for identity authentication.
   - Never trust client-provided user roles (`role`) or user IDs. Always resolve the user identity server-side via Clerk auth helpers and verify database ownership relations.
   - Never expose private interviewer notes (`InterviewNote`) to candidates.

4. **Realtime Collaboration (Yjs & Hocuspocus)**:
   - Synchronize document text using Yjs `ydoc.getText("code")`.
   - Never sync editor keystrokes by sending raw string payloads through React state or HTTP APIs.
   - Persist document snapshots debounced to PostgreSQL `YjsDocument`.
   - Do not allow modifications to documents belonging to `COMPLETED` interview sessions.

5. **Remote Code Execution**:
   - **Absolute Rule**: Never execute candidate code directly on the Next.js API server or realtime server.
   - Web server queues jobs in PostgreSQL with status `PENDING`.
   - The worker daemon claims jobs using `SELECT ... FOR UPDATE SKIP LOCKED` and delegates execution to Judge0.
   - Hidden test case inputs and expected outputs must NEVER be leaked to candidate client payloads.

---

## 4. Git Commit Guidelines

PairCode enforces strict Conventional Commits matching the 10 defined development checkpoints:
1. `docs: define PairCode requirements and system architecture`
2. `chore: initialize PairCode monorepo and development tooling`
3. `feat(auth): implement authentication and database foundation`
4. `feat(interviews): implement room management and question APIs`
5. `feat(ui): build responsive PairCode application interface`
6. `feat(execution): add Monaco editor and asynchronous code execution`
7. `feat(realtime): implement collaborative editing and document persistence`
8. `feat(interviews): complete interview workflow and result history`
9. `test(security): add comprehensive integration and end-to-end coverage`
10. `chore(deploy): prepare PairCode for production deployment`

- Never make empty commits.
- Never commit secrets or `.env` files.
- Inspect staged files before committing (`git diff --cached`).
- Do not push to remote; the user executes the push after final review.
