# Lab 4 Test Plan and Traceability

Issue: #55. This plan was written **before** implementation (Test DD). Every row starts as `Planned`. When a test is implemented and passes on `main`, the implementing issue sets its Final column to `Pass` and fills in the actual file.

---

## 1. Purpose

- Prove every Lab 4 Acceptance Criterion (AC-01 to AC-29) with at least one automated test.
- Prove Labs 1–3 still work (full regression).
- Cover these levels: unit, API/integration, UI component, UI style, responsive, authorization, workflow, migration/regression, performance-smoke, and E2E.

## 2. Test Environment

- Server and API: Vitest + Supertest against the dedicated `toktickit_test` PostgreSQL database (as in Lab 3). The database URL comes from the local `.env` and is never committed.
- Sessions: `server/tests/helpers/test-session.ts`.
- Client: Vitest + Testing Library + jsdom.
- E2E: Playwright with `playwright.lab4.config.ts` (the Lab 2 and Lab 3 configs are kept). Viewports: 1280×800, 768×1024, 375×812.
- E2E environment (local only, never committed): `LAB3_INITIAL_PASSWORD` (seed password) and `LAB4_E2E_PASSWORD`. On the first run the E2E accounts change their initial password to `LAB4_E2E_PASSWORD` through the normal API. Each run creates its own Ticket, so runs are repeatable.
- Commands:
  - `cd server && npm test && npm run build`
  - `cd client && npm test && npm run build`
  - `npx playwright test --config=playwright.lab4.config.ts` (and the Lab 2/3 configs for regression)

## 3. Test Files

```
server/tests/lab-04/
├── actions-taken.api.test.ts          (#56)
├── action-taken.validation.test.ts    (#56, unit)
├── ticket-workflow.api.test.ts        (#58)
├── requester-dashboard.api.test.ts    (#59)
├── staff-dashboard.api.test.ts        (#60)
└── migration-seed.test.ts             (#56)
client/tests/lab-04/
├── ActionsTaken.test.tsx              (#57)
├── TicketWorkflow.test.tsx            (#58)
├── RequesterDashboard.test.tsx        (#59)
├── StaffDashboard.test.tsx            (#60)
└── ui-style.test.tsx                  (#61)
e2e/lab-04/
├── actions-taken-flow.spec.ts         (#57)
├── ticket-resolution.spec.ts          (#58)
└── dashboards.spec.ts                 (#59, #60)
```

---

## 4. Unit Tests

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-04 | Follow-up Note required when followUpRequired = true | Validation error on `followUpNote` | `server/tests/lab-04/action-taken.validation.test.ts` | Pass |
| UNIT-02 | Unit | BR-08 | Follow-up Note discarded when followUpRequired = false | Stored as null | `server/tests/lab-04/action-taken.validation.test.ts` | Pass |
| UNIT-03 | Unit | AC-05 | Description/Result trimmed; blank, 2001 chars | Rejected; 2000 accepted | `server/tests/lab-04/action-taken.validation.test.ts` | Pass |
| UNIT-04 | Unit | AC-05 | actionAt > now + 5 min, before ticket.createdAt | Rejected | `server/tests/lab-04/action-taken.validation.test.ts` | Pass |
| UNIT-05 | Unit | BR-09 | Attachment Notes empty → null, 501 chars rejected | As stated | `server/tests/lab-04/action-taken.validation.test.ts` | Pass |
| UNIT-06 | Unit | AC-14 | Resolution gate evaluator: no owner / no actions / latest follow-up / satisfied | Correct `unmet` list | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| UNIT-07 | Unit | BR-25 | "Last 7 days" boundary calculation | Includes exactly 7×24h | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |

## 5. Actions Taken API Tests (#56)

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-12 | List actions for a Ticket with 3 actions | 200, ordered actionAt, id asc | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-02 | API | AC-20 | List for a legacy Ticket with 0 actions | 200, `items: []` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-03 | API | AC-01 | Create a valid Action Taken | 201, under the correct Ticket, performedBy = session user | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-04 | API | AC-01 | Client sends `performedById` of another user | 400 unknown field; no row | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-05 | API | AC-03 | Staff B records on a Ticket owned by Staff A | 201, performedBy = B, ownerId unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-06 | API | AC-04 | followUpRequired true without note | 400 `details.followUpNote` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-07 | API | AC-05 | Missing description/result; future actionAt | 400 with field details | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-08 | API | AC-08 | Edit with current version | 200, version + 1, updatedBy set | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-09 | API | AC-08 | Edit with stale version | 409 `ACTION_TAKEN_CHANGED`; data unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-10 | API | AC-09 | Non-performer IT Staff edits | 403 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-11 | API | AC-09 | Administrator edits another's action | 200 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-12 | API | AC-10 | Create/edit on CLOSED and CANCELLED Ticket | 409 `TICKET_NOT_WRITABLE` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-13 | API | AC-11 | Repeat create with same clientRequestId | 200 original; count unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-14 | API | BR-01 | GET/PATCH action via a different ticketId | 404 `ACTION_TAKEN_NOT_FOUND` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-15 | API | BR-11 | DELETE action | 404 (no route); row still exists | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-16 | API | BR-16 | `<script>` in description | Stored and returned as literal text | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-17 | API | AC-29 | Inactive/non-staff assignee rejected; assignee completes Planned work; cancel locks the action; Completed cannot change status | 400 `INVALID_ASSIGNEE`; 409 for invalid transitions | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |

## 6. Authorization Tests

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| SEC-01 | Security | AC-06 | Requester POST staff actions-taken | 403 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| SEC-02 | Security | AC-06 | Requester PATCH staff actions-taken | 403 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| SEC-03 | Security | AC-07 | Requester lists actions on owned Ticket | 200 read-only shape (no version/canEdit) | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| SEC-04 | Security | AC-07 | Requester lists actions on another's Ticket | 404 safe | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| SEC-05 | Security | AC-19 | Unauthenticated on every Lab 4 endpoint | 401 | `server/tests/lab-04/*.api.test.ts` | Pass |
| SEC-06 | Security | AC-19 | Requester → staff dashboard; IT Staff → requester dashboard | 403 | `server/tests/lab-04/*-dashboard.api.test.ts` | Pass |
| SEC-07 | Security | BR-34 | Responses contain no passwordHash, email of other users, stack | Absent | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| SEC-08 | Security | Lab 3 BR-11 | User with mustChangePassword calls Lab 4 endpoints | 403 `PASSWORD_CHANGE_REQUIRED` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |

## 7. Workflow Tests (#58)

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-01 | API | AC-13 | Every permitted transition in BR-19 (table-driven) | 200, status updated | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-02 | API | AC-13 | Every non-permitted transition (table-driven) | 409 `INVALID_STATUS_TRANSITION`; unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-03 | API | AC-14 | RESOLVED with no owner | 409 `RESOLUTION_GATE_NOT_MET` (`NO_OWNER`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-04 | API | AC-14 | RESOLVED with zero actions | 409 (`NO_ACTIONS_TAKEN`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-05 | API | AC-14 | RESOLVED when latest action needs follow-up | 409 (`LATEST_ACTION_NEEDS_FOLLOW_UP`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-06 | API | AC-15 | RESOLVED with gate satisfied | 200 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-07 | API | AC-16 | Stale `expectedStatus` | 409 `TICKET_CHANGED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-08 | API | D-05 | Missing `expectedStatus` | 400 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-14 | Regression | FR-20, D-03 | Lab 3 app tests and Lab 3 E2E updated: operational users land on the Dashboard and open the queue or User Management from the navigation | Pass | `client/tests/lab-03/Lab3App.test.tsx`, `e2e/lab-03/staff-workflow.spec.ts` | Pass |
| WF-13 | Regression | D-05 | Lab 3 status tests and Lab 3 E2E updated for `expectedStatus` and the confirmation dialog | Pass | `server/tests/lab-03/staff-ticket-operations.api.test.ts`, `client/tests/lab-03/StaffTicketDetail.test.tsx`, `e2e/lab-03/staff-workflow.spec.ts` | Pass |
| WF-09 | API | AC-17 | Problem Appears Resolved | Status unchanged; `/workflow` shows indication | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-10 | API | FR-12 | `GET /workflow` allowedNextStatuses + gate | Matches matrix and gate | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-11 | API | AC-13 | Requester PATCH status | 403 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-12 | API | BR-23 | REOPENED keeps existing actions | Actions count unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |

## 8. Dashboard API Tests (#59, #60)

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| DASH-01 | API | AC-02 | Requester metrics count only own Tickets | Counts equal `prisma.ticket.count({requesterId})` per BR-27 | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-02 | API | AC-02 | Recent lists exclude other Requesters' Tickets | No foreign IDs | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-03 | API | AC-20 | Requester with no Tickets | All 0, lists [] | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-04 | API | AC-21 | Requester drill-down queries | Match BR-27 table | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-05 | API | FR-21 | My Tickets `?status=` single, list, invalid | Filtered; 400 on invalid | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-06 | API | AC-18 | Staff counts equal direct Prisma queries (unassigned, myAssigned, byStatus×8, byItPriority×3, myActions7d) | Equal | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| DASH-07 | API | AC-18 | `myAssigned` / `myActions` differ per signed-in staff | Session-specific | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| DASH-08 | API | BR-28 | Urgent = active HIGH, oldest first, ≤5 | Correct order/limit | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| DASH-09 | API | AC-22 | Admin gets `usersByRole`; staff gets null | As stated | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| DASH-10 | API | FR-22 | Queue accepts comma-separated `status` | Filtered correctly | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| DASH-11 | API | FR-19 | Response size: lists ≤ 5, no full collections | Lengths ≤ 5 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |

## 9. Migration, Seed, and Regression Tests

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | AC-23 | Lab 3 rows (Users, Tickets, Attachments, Comments, Notes) unchanged after migration | Counts and sample fields equal | `server/tests/lab-04/migration-seed.test.ts` | Pass |
| MIG-02 | Migration | AC-23 | `ActionTaken` table, FKs, indexes exist | Present | `server/tests/lab-04/migration-seed.test.ts` | Pass |
| MIG-03 | Seed | AC-24 | Run seed twice | No duplicates; required scenarios present (0/1/3+ actions, all statuses) | `server/tests/lab-04/migration-seed.test.ts` | Pass |
| REG-01 | Regression | AC-25 | All Lab 1 server tests | Pass | `server/tests/lab-01/*` | Pass |
| REG-02 | Regression | AC-25 | All Lab 2 server tests | Pass | `server/tests/lab-02/*` | Pass |
| REG-03 | Regression | AC-25 | All Lab 3 server tests (status tests updated for `expectedStatus`, D-05) | Pass | `server/tests/lab-03/*` | Pass |
| REG-04 | Regression | AC-25 | All Lab 1–3 client tests (Lab 2 priority badge text now title case; Lab 3 app test navigates from the Dashboard) | Pass | `client/tests/lab-0{1,2,3}/*` | Pass |
| REG-05 | Regression | AC-25 | Lab 3 Playwright suite, plus a Lab 4 regression suite covering sign-in, Create Ticket, My Tickets, Ticket Detail, Attachments, Public Comments, Problem Appears Resolved, IT Staff operations, Internal Notes and User Management, with no console errors | Pass | `e2e/lab-03/*`, `e2e/lab-04/regression.spec.ts` | Pass |
| REG-06 | Regression | AC-25 | Lab 2 Playwright suite | Not runnable | `e2e/lab-02/*` | Retired: it selects a Development Requester, a screen removed in Lab 3 when sign-in replaced it (Lab 3 did not run it either). Its flows are covered by REG-05. |
| PERF-01 | Perf-smoke | FR-19 | Dashboards with seed + 500 extra Tickets respond < 500 ms locally | < 500 ms | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| PERF-02 | Perf-smoke | BR-15 | List 50 actions on one Ticket < 300 ms | < 300 ms | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |

## 10. UI Component Tests

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | Component | AC-12 | Actions list renders all fields in order; "Latest" label | Rendered | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-02 | Component | AC-20 | Actions empty state | Empty text shown | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-03 | Component | AC-04 | Follow-up checkbox reveals required note field; client validation | Field shown and required | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-04 | Component | AC-28 | Save disabled while pending; double click sends one request | 1 request | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-05 | Component | AC-28 | Server 400/500 keeps entered values | Values kept | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-06 | Component | AC-08 | Edit 409 shows conflict + Reload, keeps edits | Shown | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-07 | Component | AC-07 | Requester mode is read-only | No Add/Edit buttons | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-08 | Component | AC-09 | Edit button only when canEdit | As stated | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-09 | Component | FR-12 | Status control lists only allowed statuses | Matches `/workflow` | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-10 | Component | AC-14 | Resolved disabled with reason messages | Reasons shown | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-11 | Component | AC-15 | Success refreshes header status | New badge | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-12 | Component | AC-16 | 409 TICKET_CHANGED shows reload message | Shown | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-13 | Component | AC-02 | Requester dashboard cards and lists render | Values and links | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| UI-14 | Component | AC-20 | Requester dashboard zeros and empty lists | 0 and empty text | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| UI-15 | Component | FR-26 | Requester dashboard loading / error / retry | States shown | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| UI-16 | Component | AC-21 | Requester "View all" links carry status filter | Correct href/route | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| UI-17 | Component | AC-18 | Staff dashboard cards, chips, urgent/recent lists | Rendered | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-18 | Component | AC-22 | Admin sees Users by Role; staff does not | As stated | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-19 | Component | FR-26 | Staff dashboard loading / empty / 403 / error / Refresh | States shown | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-20 | Component | FR-20 | Nav shows Dashboard per role with aria-current | Correct | `client/tests/lab-03/Lab3App.test.tsx`, `client/tests/lab-04/RequesterDashboard.test.tsx`, `e2e/lab-04/dashboards.spec.ts` | Pass |

## 11. UI Style, Responsive, and Accessibility Tests

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STY-01 | UI style | V1 | Lab 4 components use Zen Green classes/tokens (no inline hex colors) | Pass | `client/tests/lab-04/ui-style.test.tsx` | Pass |
| STY-02 | UI style | V8 | Status/follow-up badges include text | Text present | `client/tests/lab-04/ui-style.test.tsx` | Pass |
| A11Y-01 | Accessibility | AC-27 | Form controls labelled; errors linked via aria-describedby | Pass | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| A11Y-02 | Accessibility | AC-27 | Keyboard: Tab reaches the dashboard drill-down, focus is visible, and Enter opens the filtered list | Pass | `e2e/lab-04/regression.spec.ts` | Pass |
| RESP-01 | Responsive | AC-26 | Requester dashboard at 1280/768/375: no horizontal overflow | scrollWidth ≤ innerWidth | `e2e/lab-04/dashboards.spec.ts` | Pass |
| RESP-02 | Responsive | AC-26 | Staff dashboard at 1280/768/375 | No overflow | `e2e/lab-04/dashboards.spec.ts` | Pass |
| RESP-03 | Responsive | AC-26 | Actions Taken list/form at 1280/768/375 | No overflow, stacked cards on mobile | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |

## 12. End-to-End Tests

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, AC-03 | Staff A and Staff B each add an action on one Ticket; both appear in order | Pass | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-02 | E2E | AC-07 | Requester signs in and sees actions read-only | Pass | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-03 | E2E | AC-14, AC-15 | Lifecycle: New → In Progress → Resolve blocked → add action → Resolved → Closed | Pass | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| E2E-04 | E2E | AC-13 | Cancel path: New → Cancelled; actions read-only | Pass | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| E2E-05 | E2E | AC-02, AC-21 | Requester dashboard drill-down to filtered My Tickets and Ticket Detail | Pass | `e2e/lab-04/dashboards.spec.ts` | Pass |
| E2E-06 | E2E | AC-18, AC-21 | Staff dashboard drill-down to filtered queue and Ticket Detail | Pass | `e2e/lab-04/dashboards.spec.ts` | Pass |
| E2E-07 | E2E | AC-22 | Admin dashboard, Ticket Queue, User Management reachable | Pass | `e2e/lab-04/dashboards.spec.ts` | Pass |

---

## 13. Acceptance Criteria Traceability

| AC | Tests |
|---|---|
| AC-01 | API-03, API-04, E2E-01 |
| AC-02 | DASH-01, DASH-02, UI-13, E2E-05 |
| AC-03 | API-05, E2E-01 |
| AC-04 | UNIT-01, API-06, UI-03 |
| AC-05 | UNIT-03, UNIT-04, API-07 |
| AC-06 | SEC-01, SEC-02 |
| AC-07 | SEC-03, SEC-04, UI-07, E2E-02 |
| AC-08 | API-08, API-09, UI-06 |
| AC-09 | API-10, API-11, UI-08 |
| AC-10 | API-12, E2E-04 |
| AC-11 | API-13 |
| AC-12 | API-01, UI-01 |
| AC-13 | WF-01, WF-02, WF-11, E2E-04 |
| AC-14 | UNIT-06, WF-03, WF-04, WF-05, UI-10, E2E-03 |
| AC-15 | WF-06, UI-11, E2E-03 |
| AC-16 | WF-07, UI-12 |
| AC-17 | WF-09 |
| AC-18 | DASH-06, DASH-07, UI-17, E2E-06 |
| AC-19 | SEC-05, SEC-06 |
| AC-20 | API-02, DASH-03, UI-02, UI-14 |
| AC-21 | DASH-04, UI-16, E2E-05, E2E-06 |
| AC-22 | DASH-09, UI-18, E2E-07 |
| AC-23 | MIG-01, MIG-02 |
| AC-24 | MIG-03 |
| AC-25 | REG-01 to REG-06, WF-13, WF-14 |
| AC-26 | RESP-01, RESP-02, RESP-03 |
| AC-27 | A11Y-01, A11Y-02 |
| AC-28 | UI-04, UI-05 |
| AC-29 | API-17 |

## 14. Final Results

Recorded on 2026-10-04 on `feature/issue-61-final-release`, which is `lab4-staging` plus Issue #61, against the dedicated `toktickit_test` database. The same suites are re-run on `main` after the release merge, and the output is attached to the release Pull Request.

| Suite | Files | Tests | Result |
|---|---|---|---|
| Server, Labs 1–4 (`cd server && npm test`) | 22 | 220 | All passed |
| Server TypeScript build (`npm run build`) | — | — | Passed |
| Client, Labs 1–4 (`cd client && npm test`) | 17 | 109 | All passed |
| Client production build (`npm run build`) | — | — | Passed |
| Playwright Lab 4 (`playwright.lab4.config.ts`) | 4 | 13 | All passed, run twice in a row |
| Playwright Lab 3 (`playwright.lab3.config.ts`) | 1 | 1 | Passed |
| Playwright Lab 2 (`playwright.config.ts`) | 1 | 4 | Retired (see REG-06) |

Every Acceptance Criterion AC-01 to AC-29 maps to at least one passing test (section 13).
