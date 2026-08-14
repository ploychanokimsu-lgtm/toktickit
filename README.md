# TokTickIT

TokTickIT is a simple IT service desk application created for CPE334 Lab 1.

The goal of this lab is to prove that the full stack works together from the frontend to the database.

## What This Project Uses

* Frontend: React + TypeScript + Vite + Bootstrap
* Backend: Node.js + Express + TypeScript
* Database: PostgreSQL
* ORM: Prisma
* Testing: Vitest + Supertest

## Lab 1 Features

The application can:

* Check whether the backend API is online
* Display the system status as Online or Offline
* Load supported request categories from PostgreSQL
* Display:

  * Account and Access
  * Hardware
  * Software
  * Network
* Show a useful error message when the backend or database is unavailable

## Project Structure

```text
toktickit/
├── client/                     # React frontend
├── server/
│   ├── prisma/                 # Prisma schema, migrations and seed
│   ├── src/                    # Express backend
│   └── tests/lab-01/           # Backend API tests
├── docs/
│   └── lab-01/
│       ├── ai_use.md
│       ├── reviewer.md
│       └── tests.md
├── .gitignore
└── README.md
```

## Requirements

Before running the project, install:

* Node.js
* npm
* PostgreSQL

## Database Setup

Create a PostgreSQL database for TokTickIT.

Example configuration:

```text
Database: toktickit
User: toktickit
Port: 5432
```

Copy the example environment file:

```bash
cd server
copy .env.example .env
```

Update `DATABASE_URL` in your local `.env` file if needed.

The real `.env` file must not be committed to GitHub.

## Install Dependencies

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd client
npm install
```

## Prisma Setup

From the `server` folder:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

The seed creates the four supported request categories and can be run more than once without creating duplicates.

## Run the Application

### Backend

```bash
cd server
npm run dev
```

Backend:

```text
http://localhost:3000
```

### Frontend

Open another terminal:

```bash
cd client
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Run Tests

### Backend

```bash
cd server
npm test
```

Tests include:

* `GET /api/health`
* `GET /api/categories`

### Frontend

```bash
cd client
npm test
```

Tests include:

* TokTickIT heading renders
* Successful system check displays Online and categories
* API failure displays Offline with a useful error message

## Git Workflow

Development follows this workflow:

```text
feature branch
      ↓
lab1-staging
      ↓
main
```

The Lab 1 feature branches are:

```text
feature/1-project-foundation
feature/2-health-check
feature/3-category-seed
feature/4-category-list
```

Each feature is merged into `lab1-staging` through a peer-reviewed Pull Request.

After all four features are completed and tested, `lab1-staging` is merged into `main` as the final Lab 1 release.

## Important

Do not commit:

* `.env`
* `node_modules`

Additional Lab 1 evidence can be found in `docs/lab-01/`.
