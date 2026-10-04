# TokTickIT

TokTickIT is a full-stack IT service desk application developed for CPE334.

| Lab | Increment |
|---|---|
| Lab 1 | Full-stack foundation, health check, Category list |
| Lab 2 | Requester Ticketing MVP: Create Ticket, My Tickets, Ticket Detail, Attachments |
| Lab 3 | Authentication and roles, IT Staff Ticket Queue and Ticket Detail, Public Comments, Internal Notes, Administrator User Management |
| Lab 4 | Actions Taken, final Ticket workflow and resolution gate, Requester and IT Staff dashboards, final regression and hardening |

---

# Technology

- Frontend: React + TypeScript + Vite + Bootstrap, Zen Green design system
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL with Prisma
- API / component tests: Vitest + Supertest + Testing Library
- End-to-end tests: Playwright

---

# Features

## Requester

- Sign in; the Dashboard is the landing page
- Dashboard: My Open Tickets, Waiting for Me, Resolved and Closed, each linking to filtered My Tickets; Recently Updated and Recently Resolved lists
- Create Ticket with a backend-generated Ticket Number
- My Tickets with search, status/category/system/priority filters, sorting and pagination
- Ticket Detail with Attachments (JPG/PNG/WEBP/PDF, 5 MB, five active), Public Comments, read-only Actions Taken, and "Problem Appears Resolved"
- Access only to the Requester's own Tickets

## IT Staff

- Dashboard: Unassigned, My Assigned, My Actions (7 days), Tickets by status and IT Priority, Urgent and Recently Updated lists, all linking to the filtered Ticket Queue
- Ticket Queue with search, filters, sorting and pagination
- Ticket Detail: claim/assign owner, IT Priority, Public Comments, Internal Notes
- Actions Taken: Date/Time, Description, Result, Performed By (automatic), Assignee, Planned/Completed/Cancelled status, Follow-Up Required with Follow-up Note, Attachment Notes
- Status changes limited to the permitted transitions; Resolved requires an owner, a completed action, no outstanding follow-up and no planned actions

## Administrator

- Everything IT Staff can do, plus active user counts on the Dashboard
- User Management: search, role filter, create and edit users, activate/deactivate, set initial passwords

---

# Project Structure

    toktickit/
    ├── client/
    │   ├── src/                     # React application
    │   └── tests/lab-01 … lab-04/   # Component and style tests
    ├── server/
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   ├── migrations/
    │   │   ├── rollback/            # Documented Lab 4 rollback script
    │   │   ├── seed.ts
    │   │   └── seed-lab4.ts
    │   ├── src/                     # Express API
    │   ├── tests/lab-01 … lab-04/   # API and integration tests
    │   └── uploads/                 # Runtime files; not committed
    ├── e2e/lab-02 … lab-04/         # Playwright specs
    ├── artifacts/lab-0x/screenshots/
    ├── docs/lab-01 … lab-04/        # Specifications, tests, reviews, AI use
    ├── playwright.config.ts         # Lab 2 (retired, see docs/lab-04/tests.md)
    ├── playwright.lab3.config.ts
    └── playwright.lab4.config.ts

---

# Setup

## 1. Requirements

- Node.js 20+ and npm
- PostgreSQL 15+ (local install or Docker)

## 2. Database

Create a database for development and a separate one for tests. The test database name must contain `test`. With Docker, for example:

    docker run -d --name toktickit-postgres -p 5432:5432 \
      -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=<choose-a-password> \
      -e POSTGRES_DB=toktickit_test postgres:17-alpine

## 3. Environment

Copy `server/.env.example` to `server/.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Database the server uses |
| `TEST_DATABASE_URL` | For tests, set to the same `*_test` database as `DATABASE_URL` |
| `LAB3_INITIAL_PASSWORD` | Initial password given to every seeded account |
| `LAB4_E2E_PASSWORD` | Password the E2E accounts are moved to on their first run |
| `PORT` | API port (default 3000) |

Copy `client/.env.example` to `client/.env` if the API is not at `http://localhost:3000`.

Never commit `.env` files.

## 4. Install, migrate and seed

    cd server
    npm install
    npx prisma migrate deploy
    npm run prisma:seed

    cd ../client
    npm install

    cd ..
    npm install
    npx playwright install chromium

The project does not load `.env` automatically for Node scripts. In Bash, export it first:

    set -a; . server/.env; set +a

Migrations are additive. The Lab 4 migration only creates the `ActionTaken` table; its rollback script is `server/prisma/rollback/lab4_actions_taken.down.sql` (disposable databases only).

The seed is idempotent and creates:

- Categories and Related Systems
- Requesters: Jennifer Anderson, Michael Brown, Narin Chaiyasit, Ploy Srisuk (no Tickets), and inactive Alex Turner
- IT Staff: Daniel Wilson, Sarah Johnson, Kevin Patel, Mali Kaewdee (no assigned Tickets), and inactive David Lee
- Administrator: Alex Thompson (`admin@example.com`)
- 12 Lab 4 demo Tickets in every status and priority, with zero, one and several Actions Taken

Seeded emails use `firstname.lastname@example.com`. Every account starts with `LAB3_INITIAL_PASSWORD` and must change it on first sign-in.

---

# Run the Application

    cd server && npm run dev      # http://localhost:3000
    cd client && npm run dev      # http://localhost:5173

---

# Tests

With `server/.env` exported (see above):

| Suite | Command |
|---|---|
| Server API and integration | `cd server && npm test` |
| Server build | `cd server && npm run build` |
| Client component and style | `cd client && npm test` |
| Client build (also type-checks tests) | `cd client && npm run build` |
| Lab 4 E2E | `npx playwright test --config=playwright.lab4.config.ts` |
| Lab 3 E2E | `LAB3_E2E_PASSWORD="$LAB4_E2E_PASSWORD" npx playwright test --config=playwright.lab3.config.ts` |

Playwright starts both servers automatically. The Lab 4 E2E creates its own Tickets, so it can be run repeatedly. Screenshots are written to `artifacts/lab-04/screenshots/`.

The Lab 2 Playwright suite (`playwright.config.ts`) depends on the Development Requester selector removed in Lab 3. Its flows are covered by `e2e/lab-04/regression.spec.ts`.

The final test results and acceptance-criteria traceability are in `docs/lab-04/tests.md`.

---

# Git Workflow

    feature/issue-N-…  →  lab4-staging  →  main

Each Issue is developed on its own branch, enters `lab4-staging` through a reviewed Pull Request, and `lab4-staging` is merged into `main` through a final release Pull Request. The review record is in `docs/lab-04/reviewer.md`.

---

# Documentation

| Document | Content |
|---|---|
| `docs/lab-04/specification.md` | Requirements, business rules, transition matrix, dashboard calculations, data changes, acceptance criteria, Definition of Done |
| `docs/lab-04/api-spec.md` | REST API contract |
| `docs/lab-04/ui-spec.md` | Screens, states, responsive and accessibility rules, completed visual checklist |
| `docs/lab-04/tests.md` | Test plan, traceability and final results |
| `docs/lab-04/reviewer.md` | Peer review record |
| `docs/lab-04/ai-use.md` | AI use and reflection |
| `docs/lab-04/release-evidence.md` | Release verification summary |

Do not commit `.env` files, `node_modules`, `server/uploads/`, or Playwright reports and results.
