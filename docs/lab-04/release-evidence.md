# Lab 4 Release Evidence

## Overview

Issue #61 completes the final hardening, regression, and release preparation for Lab 4.

- Integration branch: `lab4-staging`
- Feature branch: `feature/issue-61-final-release`
- Release: `lab4-staging` → `main` through a reviewed Pull Request

## Issues and Pull Requests

| Issue | Work | Pull Request | Status |
|---|---|---|---|
| #55 | Sprint 4 Engineering Contract | #62 | Merged |
| #56 | Actions Taken Foundation | #63 | Merged |
| #57 | Actions Taken UI on Ticket Detail | #64 | Merged |
| #58 | Ticket Workflow and Resolution Gate | #65 | Merged |
| #59 | Requester Dashboard | #66 | Merged |
| #60 | IT Staff and Administrator Dashboard | #67 | Merged |
| #61 | Final Hardening, Regression and Release Evidence | This issue | In review |

## Automated Verification

Recorded on 2026-10-04 against the dedicated `toktickit_test` database.

| Verification | Result |
|---|---:|
| Server test files | 22 passed |
| Server tests (Labs 1–4) | 220 passed |
| Server TypeScript build | Passed |
| Client test files | 17 passed |
| Client tests (Labs 1–4) | 109 passed |
| Client production build (includes test type-check) | Passed |
| Lab 4 Playwright E2E | 13 passed, run twice in a row |
| Lab 3 Playwright E2E | 1 passed |
| Lab 2 Playwright E2E | Retired (see below) |

Growth over Lab 3: 134 → 220 server tests and 67 → 109 client tests.

## End-to-End Coverage

| Spec | Covers |
|---|---|
| `e2e/lab-04/actions-taken-flow.spec.ts` | Two IT Staff record Actions Taken on one Ticket; owner unchanged; validation; Requester read-only view; responsive layouts |
| `e2e/lab-04/ticket-resolution.spec.ts` | Full lifecycle New → In Progress → Resolved (blocked until the gate is met) → Closed; cancel path with confirmation |
| `e2e/lab-04/dashboards.spec.ts` | Requester and staff dashboards, drill-down counts matching filtered lists, zero states, Administrator view |
| `e2e/lab-04/regression.spec.ts` | Labs 2–3 regression through the signed-in app (Create Ticket, My Tickets, Ticket Detail, Attachments, Public Comments, Problem Appears Resolved, Internal Notes hidden from Requesters, User Management), keyboard drill-down, and no console errors |
| `e2e/lab-03/staff-workflow.spec.ts` | Lab 3 IT Staff workflow |

The Lab 2 Playwright suite selects a "Development Requester", a screen that was replaced by sign-in in Lab 3. Lab 3 did not run it either. It now fails at its first step for that reason, so it is recorded as retired in `tests.md` (REG-06), and its flows are covered by `regression.spec.ts`.

## Hardening Changes in Issue #61

- One date/time format across the application ("4 Oct 2026, 18:53", Asia/Bangkok), as requested in the #64 review.
- Priority badges show "High", "Medium" or "Low" instead of raw values.
- Removed leftover "Development Requester" text from Create Ticket.
- Fixed an undefined CSS variable (`--tk-muted`).
- Added UI style tests, a keyboard-navigation E2E test, and a console-error check across the main screens.
- `server/.env.example` documents every required variable without values.
- README rewritten for the complete product.

Earlier issues already fixed the navigation contrast and the fixed "New" status badge (#59).

## Responsive and Accessibility Evidence

| Screen | Screenshots |
|---|---|
| Requester Dashboard | `artifacts/lab-04/screenshots/requester-dashboard/` desktop, tablet, mobile, empty |
| IT Staff Dashboard | `artifacts/lab-04/screenshots/staff-dashboard/` desktop, tablet, mobile, admin |
| Actions Taken | `artifacts/lab-04/screenshots/actions-taken/` list desktop/tablet/mobile, validation, Requester read-only, resolution blocked |
| Regression | `artifacts/lab-04/screenshots/regression/` Requester Ticket Detail, User Management |

The completed visual and accessibility checklist is in `docs/lab-04/ui-spec.md` §10.

## Safety

- All tests use the dedicated `toktickit_test` database; the test helper refuses to run against any other database.
- No credentials, database URLs, or `.env` files are committed.
- The Lab 4 migration is additive, with a documented rollback script.
- Every Pull Request was reviewed and approved before merging; nothing was pushed directly to `lab4-staging` or `main`.
