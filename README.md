# TokTickIT

TokTickIT is a full-stack IT service desk application developed for CPE334.

Lab 1 established the basic full-stack foundation.

Lab 2 adds the Requester-facing Ticketing MVP with a temporary Development Requester identity used to simulate multi-user ownership before authentication is introduced in a later lab.

---

# Technology

- Frontend: React + TypeScript + Vite + Bootstrap
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- API / Component Testing: Vitest + Supertest + Testing Library
- End-to-End Testing: Playwright

---

# Lab 2 Features

The Requester-facing Lab 2 increment supports:

- Development Requester selection for testing
- Active Requester filtering
- Requester switching
- Create Ticket
- Backend-generated Ticket Number
- Category and Related System reference data
- Requested Priority
- My Tickets
- Requester ownership enforcement
- Search
- Filtering
- Sorting
- Pagination
- Loading states
- Empty and no-results states
- Requester Ticket Detail
- Attachment upload
- JPG/JPEG, PNG, WEBP and PDF validation
- Maximum 5 MB per Attachment
- Maximum five active Attachments per Ticket
- Attachment download
- Soft removal with removal reason
- Retained removed Attachment metadata
- Blocked download after removal
- Cross-Requester Ticket and Attachment protection
- Zen Green responsive UI
- Desktop, tablet and mobile verification

The Development Requester selector is only a Lab 2 testing mechanism. It is not authentication.

---

# Project Structure

    toktickit/
    ├── client/
    │   ├── src/
    │   └── tests/
    │       ├── lab-01/
    │       └── lab-02/
    │
    ├── server/
    │   ├── prisma/
    │   ├── src/
    │   ├── tests/
    │   │   ├── lab-01/
    │   │   └── lab-02/
    │   └── uploads/                 # Runtime files; not committed
    │
    ├── docs/
    │   ├── lab-01/
    │   └── lab-02/
    │       ├── specification.md
    │       ├── tests.md
    │       ├── ui-spec.md
    │       ├── api-spec.md
    │       ├── reviewer.md
    │       └── ai-use.md
    │
    ├── e2e/
    │   └── lab-02/
    │       └── requester-ticket-flow.spec.ts
    │
    ├── artifacts/
    │   └── lab-02/
    │       └── screenshots/
    │           ├── create-ticket/
    │           ├── my-tickets/
    │           └── ticket-detail/
    │
    ├── playwright.config.ts
    ├── package.json
    ├── .gitignore
    └── README.md

---

# Requirements

Install:

- Node.js
- npm
- PostgreSQL

For E2E testing, Playwright Chromium is also required.

---

# Database Setup

Create a PostgreSQL database for TokTickIT.

Copy:

    server/.env.example

to:

    server/.env

and configure the local `DATABASE_URL`.

The real `.env` file must never be committed.

From the server directory:

    cd server
    npm install
    npx prisma generate
    npx prisma migrate dev
    npm run prisma:seed

The seed is designed to be safe to run repeatedly.

Lab 2 seed data includes:

- Account and Access
- Hardware
- Software
- Network
- multiple Related Systems
- at least four active Development Requesters
- at least one inactive Development Requester

---

# Install Dependencies

Backend:

    cd server
    npm install

Frontend:

    cd client
    npm install

Root / Playwright:

    npm install
    npx playwright install chromium

---

# Run the Application

Backend:

    cd server
    npm run dev

Backend runs at:

    http://localhost:3000

Frontend in another terminal:

    cd client
    npm run dev

Frontend runs at:

    http://localhost:5173

---

# Run Server Tests

From:

    server/

run:

    npm test

Build verification:

    npm run build

Lab 2 server tests cover:

- Development Requester API
- Create Ticket
- My Tickets
- Ticket Detail
- Attachment lifecycle
- ownership behavior
- validation and safe failures

---

# Run Client Tests

From:

    client/

run:

    npm test

Build verification:

    npm run build

Lab 2 client tests cover:

- Development Requester Selection
- Create Ticket
- My Tickets
- Requester Ticket Detail
- Attachment Section
- Zen Green UI states and styles

---

# Run End-to-End Tests

From the repository root:

    npx playwright test

The Lab 2 Playwright suite verifies:

- Development Requester selection
- Ticket creation
- My Tickets
- Ticket Detail
- Attachment upload
- Attachment download
- soft removal
- blocked removed-file download
- Requester ownership isolation
- desktop responsive behavior
- tablet responsive behavior
- mobile responsive behavior
- horizontal overflow protection

Playwright screenshots are stored under:

    artifacts/lab-02/screenshots/

---

# Lab 2 Git Workflow

Lab 2 uses:

    feature branch
          ↓
    lab2-staging
          ↓
    main

Each Issue is developed on its own feature branch and enters `lab2-staging` through a Pull Request and peer review.

After all Lab 2 work passes integration testing, one final release Pull Request merges:

    lab2-staging → main

---

# Important

Do not commit:

- `.env`
- `node_modules`
- runtime Attachment files in `server/uploads/`
- Playwright temporary reports/results

Required Lab 2 documentation is located under:

    docs/lab-02/

The final `main` branch is the source of truth for Lab 2 submission.