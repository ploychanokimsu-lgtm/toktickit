# Lab 1 — Test Documentation

All test files are located under `server/tests/lab-01/` and `client/tests/lab-01/`.

| # | Tool | Test | Result |
|---|---|---|---|
| 1 | Supertest | `GET /api/health` returns HTTP 200 with `status = ok` and expected JSON | Passed |
| 2 | Supertest | `GET /api/categories` returns the four seeded categories in id order | Passed |
| 3 | Vitest | TokTickIT heading renders | Passed |
| 4 | Vitest | Success state shows Online and the category list | Passed |
| 5 | Vitest | Error state shows Offline with a useful error message | Passed |

## Test Evidence

Passing terminal output/screenshots are included in the Lab 1 submission PDF.