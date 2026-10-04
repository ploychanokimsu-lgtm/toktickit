# Lab 4 Sprint Engineering Specification

Issue: #55 (Sprint 4 Engineering Contract)
Integration branch: `lab4-staging`
Baseline: `main` @ `e27738f` (Lab 3 released through PR #54)

Related documents:

- `docs/lab-04/api-spec.md`: REST API contract
- `docs/lab-04/ui-spec.md`: screen behavior, states, responsive and accessibility rules
- `docs/lab-04/tests.md`: test plan and traceability

> **Contract status: approved (PR #62).** Decision D-01 was resolved in Issue #56: Option B (assignee and Planned/Completed/Cancelled lifecycle) is adopted. See section 11.1.

---

## 1. Sprint Goal

Lab 4 lets IT Staff record the actual work performed on a Ticket as a list of Actions Taken. It enforces a backend resolution gate so a Ticket can only be resolved after work has been recorded, and it gives Requesters, IT Staff, and Administrators concise dashboards that link to the detailed screens. The sprint finishes with a full regression and hardening pass so that every Lab 1–3 feature still works in one consistent Zen Green application.

---

## 2. Stakeholder Request Interpretation

The service desk can already receive Tickets, assign an owner, set IT Priority, change status, and communicate through Public Comments and Internal Notes. What is missing is a record of the work itself.

- **Actions Taken.** Each Ticket gets a list of Actions Taken. An Action Taken records when the work happened, what was done, the result, and who did it (set automatically). It also records whether follow-up is needed (with a mandatory note when it is) and free-text Attachment Notes that point to relevant files.
- **Owner vs. performer.** The Ticket Owner remains the single coordinator. Any IT Staff member, not only the owner, may record an Action Taken.
- **Resolution.** A Requester can still say the problem appears resolved, but that is advice only. IT Staff must review the recorded work and formally move the Ticket to Resolved, and the backend must enforce that rule even if the UI is bypassed.
- **Dashboards.** Requesters and IT Staff each get a short dashboard of counts and recent items that drill down into the existing lists and detail screens. It does not replace those screens.
- **Hardening.** Everything from Labs 1–3 must keep working. The application must look and behave as one polished, responsive, accessible Zen Green product.

---

## 3. Scope

### 3.1 Included

- `ActionTaken` data model, additive Prisma migration, and idempotent seed data.
- Create, list, view, and edit Actions Taken (IT Staff and Administrator).
- Read-only Actions Taken for the Requester who owns the Ticket.
- Optimistic concurrency for Action Taken edits and Ticket status changes.
- Final Ticket status-transition matrix and backend resolution gate.
- Requester Dashboard API and screen.
- IT Staff Dashboard API and screen; Administrator reuse with user-account counts.
- Dashboard drill-down into My Tickets, the IT Staff Ticket Queue, and Ticket Detail.
- A `status` filter on Requester My Tickets so Requester dashboard cards can drill down.
- Administrator access to the IT Staff workspace (Queue and Ticket Detail), per handout §4.3.
- Duplicate-submission protection and form-data preservation on recoverable failure.
- Full Labs 1–4 regression (unit, API, UI component, UI style, responsive, authorization, workflow, migration, performance-smoke, E2E).
- Removal of obsolete, placeholder, or inconsistent UI and stray build output.
- README setup, migration, seed, test, and demo instructions.

### 3.2 Excluded (handout §4.2)

- Automatic SLA clocks, escalation engines, on-call scheduling, breach notifications.
- Email, SMS, LINE, push, or any external notification.
- Inventory, spare parts, purchasing, cost accounting.
- Time-sheet billing, payroll, labor-cost calculation.
- Multi-level approvals and electronic signatures.
- BI tools, custom report builders, exports.
- Multi-tenant organizations and production cloud operations.
- Deleting Actions Taken (they are an audit record; see BR-11).
- Uploading files directly to an Action Taken. Attachment Notes are text that refers to the existing Ticket Attachments.
- Any feature not approved in this contract.

---

## 4. Functional Requirements

Lab 3 requirements FR-01 to FR-62 remain in force unless modified below. Lab 4 numbering restarts at FR-01 within this document.

### 4.1 Actions Taken

**FR-01** The system shall store zero or more Actions Taken for each Ticket.

**FR-02** An IT Staff user or Administrator shall be able to list all Actions Taken of a Ticket in stable chronological order.

**FR-03** An IT Staff user or Administrator shall be able to create an Action Taken with:
- Action Date/Time
- Action Description
- Result
- Follow-Up Required? (yes/no)
- Follow-up Note (required when Follow-Up Required is yes)
- Attachment Notes (optional)

**FR-04** The backend shall set Performed By to the authenticated user and shall ignore any client-supplied performer.

**FR-05** An IT Staff user or Administrator shall be able to open an Action Taken in view mode and switch to edit mode when permitted by BR-10.

**FR-06** An edit shall be rejected with a conflict response if the Action Taken was changed by another user since it was loaded.

**FR-07** A Requester shall be able to view all Actions Taken of a Ticket they own, read-only.

**FR-08** An IT Staff user or Administrator shall be able to assign an Action Taken to an eligible active IT Staff/Administrator user, record it as Planned or Completed, and later complete or cancel a Planned action. The backend shall reject an inactive or ineligible assignee.

### 4.2 Ticket Workflow

**FR-09** The backend shall enforce the final status-transition matrix in section 5.4.

**FR-10** The backend shall reject a transition to `RESOLVED` that does not satisfy the resolution gate (BR-20), including when the request bypasses the UI.

**FR-11** The status-change request shall carry the status the client last saw. The backend shall reject the request as a conflict when the Ticket's current status differs.

**FR-12** Ticket Detail shall offer only the transitions currently permitted. It shall explain when Resolved is unavailable because of the gate.

**FR-13** After a successful status change, Ticket Detail shall refresh the Ticket summary, including status and updated time.

**FR-14** The Requester "Problem Appears Resolved" indication shall remain advisory. IT Staff Ticket Detail shall display it next to the status control.

### 4.3 Dashboards

**FR-15** The system shall provide a Requester Dashboard API returning only metrics and recent Tickets for the authenticated Requester.

**FR-16** The system shall provide an IT Staff Dashboard API for IT Staff and Administrators.

**FR-17** The Administrator dashboard response shall additionally include active-user counts by role.

**FR-18** Each dashboard metric shall return a count and a drill-down target (screen and query parameters).

**FR-19** Dashboards shall return counts and short lists (at most 5 items each), never full Ticket collections.

**FR-20** The Dashboard shall be the default landing screen after sign-in for every role. Navigation shall show an active-page indicator.

**FR-21** Requester My Tickets shall accept a `status` filter (one or more statuses) so Requester dashboard cards can drill down.

**FR-22** The IT Staff Ticket Queue shall pre-apply drill-down parameters from the URL. It already supports `status`, `itPriority`, and `assignment`; Lab 4 amends `status` to accept a comma-separated list (it currently accepts a single value).

### 4.4 Hardening and Regression

**FR-23** All Lab 1–3 screens shall remain available to their permitted roles, with unchanged behavior unless amended here.

**FR-24** Every create or update control shall be disabled while its request is in flight. The backend shall tolerate a retried create without creating a duplicate Action Taken (BR-13).

**FR-25** Create and edit forms shall keep the entered values after a recoverable failure (validation, conflict, network).

**FR-26** Major screens shall provide loading, validation, success, empty or no-results, forbidden, conflict, not-found, and safe-failure feedback.

**FR-27** The production build shall contain no console errors, broken links, placeholder text, or unfinished controls.

**FR-28** The Administrator workspace shall include Dashboard, Ticket Queue, and User Management navigation.

---

## 5. Business Rules

Lab 3 rules BR-01 to BR-96 remain in force unless amended below. Lab 4 numbering restarts at BR-01 within this document.

### 5.1 Actions Taken: Structure and Ownership

**BR-01** An Action Taken belongs to exactly one Ticket. It cannot be moved to another Ticket.

**BR-02** The Ticket Owner coordinates the Ticket, but an Action Taken may be performed by a different IT Staff member or Administrator. Recording an Action Taken does not change the Ticket Owner.

**BR-03** Performed By is the authenticated user at creation time and never changes on edit.

**BR-04** Only active users with role `IT_STAFF` or `ADMINISTRATOR` may create or edit Actions Taken.

**BR-05** A Requester may read the Actions Taken of a Ticket they own. A Requester may never create or edit them. Requests for non-owned Tickets return the same safe 404 as Lab 3 (Lab 3 BR-32).

### 5.2 Actions Taken: Field Validation

**BR-06** Action Description is required. Result is required when the action is Completed and optional while it is Planned. Both are trimmed and limited to 2000 characters.

**BR-07** Action Date/Time is required and is stored in UTC. It must not be earlier than the Ticket's creation time. For Completed work it must not be more than 5 minutes in the future (clock skew); for Planned work it may be up to one year ahead.

**BR-08** When Follow-Up Required is true, Follow-up Note is required (1–1000 characters after trimming). When it is false, Follow-up Note is stored as `null` and any submitted value is discarded.

**BR-09** Attachment Notes are optional, trimmed, at most 500 characters, and stored as `null` when empty. They are plain text and are not validated against real Attachment records.

### 5.3 Actions Taken: Editing and Audit

**BR-10** An Action Taken may be edited only by its performer, its current assignee, or an Administrator.

**BR-11** Actions Taken cannot be deleted. Corrections are made by editing. `createdAt`, `updatedAt` and `updatedById` (the user who last edited) are always kept.

**BR-12** Each edit must send the `version` the client loaded. If it does not match the stored version, the edit is rejected with 409 `ACTION_TAKEN_CHANGED`. A successful edit increments `version`.

**BR-13** A create request may carry a client-generated `clientRequestId` (UUID). A repeated request with the same `clientRequestId` for the same Ticket returns the originally created Action Taken instead of creating a duplicate.

**BR-14** Actions Taken cannot be created or edited while the Ticket is `CLOSED` or `CANCELLED`.

**BR-15** Actions Taken are listed ordered by `actionAt` ascending, then `id` ascending.

**BR-16** Action Taken text is rendered as plain text, never as HTML.

### 5.3a Actions Taken: Assignee and Lifecycle (D-01)

**BR-35** An Action Taken has a status: `PLANNED`, `COMPLETED` (default) or `CANCELLED`. A new action may be created as Planned or Completed, never as Cancelled.

**BR-36** Only a Planned action may change status, to Completed or Cancelled. Completed and Cancelled are final. A Cancelled action is read-only (409 `ACTION_TAKEN_LOCKED`); an invalid status change returns 409 `INVALID_ACTION_STATUS_TRANSITION`.

**BR-37** `completedAt` is set by the backend when an action is created as, or changed to, Completed.

**BR-38** The assignee must be an active `IT_STAFF` or `ADMINISTRATOR` user. It defaults to the user recording the action. An inactive or ineligible assignee returns 400 `INVALID_ASSIGNEE`. Changing the assignee does not change Performed By.

### 5.4 Ticket Status Transition Matrix (final)

**BR-17** Statuses remain `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.

**BR-18** Only `IT_STAFF` and `ADMINISTRATOR` may change status. Requesters never change status directly (Lab 3 BR-44 and BR-45 are unchanged).

**BR-19** Permitted transitions:

| From | To | Extra condition |
|---|---|---|
| NEW | OPEN, IN_PROGRESS, CANCELLED | none |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | RESOLVED: gate BR-20 |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | RESOLVED: gate BR-20 |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED | RESOLVED: gate BR-20 |
| RESOLVED | CLOSED, REOPENED | none |
| CLOSED | REOPENED | none |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | RESOLVED: gate BR-20 |
| CANCELLED | REOPENED | none |

> This matrix matches the transitions **already implemented** in `server/src/staff-ticket-operations.ts`. The Lab 3 documents said `CLOSED` and `CANCELLED` were terminal, but the Lab 3 code allows them to be reopened. Lab 4 adopts the implemented behavior so no released behavior is removed, and corrects the documentation. See decision D-04.

**BR-20 Resolution gate.** A transition to `RESOLVED` is permitted only when all of the following hold:
1. the Ticket has a Ticket Owner;
2. the Ticket has at least one Completed Action Taken;
3. the most recent Completed Action Taken (by BR-15 order) has Follow-Up Required = false; and
4. no Action Taken remains Planned.

A failed gate returns 409 `RESOLUTION_GATE_NOT_MET` with the unmet conditions listed.

**BR-21** A status change must include `expectedStatus`. If the stored status differs, the request is rejected with 409 `TICKET_CHANGED` and nothing changes. The existing compare-and-set update stays as the second line of defense.

**BR-22** "Problem Appears Resolved" sets `requesterResolutionIndicatedAt` only. It never changes status and does not satisfy the resolution gate.

**BR-23** Moving to `REOPENED` keeps all existing Actions Taken. New work is recorded as new Actions Taken.

### 5.5 Dashboard Calculations

**BR-24** All dashboard values are calculated by the backend from database queries at request time. Nothing is cached or calculated by the client.

**BR-25** Time zone for "recent" boundaries: `Asia/Bangkok` (UTC+7). "Last 7 days" means `updatedAt >= now − 7 × 24 h`. Timestamps are returned in ISO-8601 UTC and displayed in local time.

**BR-26** "Active" statuses = `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`. "Finished" statuses = `RESOLVED`, `CLOSED`, `CANCELLED`.

**BR-27** Requester Dashboard metrics, all limited to `requesterId = current user`:

| Metric key | Label | Calculation | Drill-down |
|---|---|---|---|
| `openTickets` | My Open Tickets | count where status ∈ Active | My Tickets `?status=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED` |
| `waitingForMe` | Waiting for Me | count where status = WAITING_FOR_REQUESTER | My Tickets `?status=WAITING_FOR_REQUESTER` |
| `resolved` | Resolved | count where status = RESOLVED | My Tickets `?status=RESOLVED` |
| `closed` | Closed | count where status = CLOSED | My Tickets `?status=CLOSED` |
| `recentlyUpdated` | Recently Updated | top 5 by `updatedAt desc, id desc`, last 7 days, any status | Ticket Detail |
| `recentlyResolved` | Recently Resolved | top 5 status = RESOLVED by `updatedAt desc` | Ticket Detail |

**BR-28** IT Staff Dashboard metrics (IT Staff and Administrator; all Tickets):

| Metric key | Label | Calculation | Drill-down |
|---|---|---|---|
| `unassigned` | Unassigned | `ownerId IS NULL` and status ∈ Active | Queue `?assignment=unassigned&status=<Active>` |
| `myAssigned` | My Assigned | `ownerId = current user` and status ∈ Active | Queue `?assignment=mine&status=<Active>` |
| `byStatus` | Tickets by Status | count per each of the 8 statuses | Queue `?status=<S>` |
| `byItPriority` | Active by IT Priority | count per LOW/MEDIUM/HIGH, status ∈ Active | Queue `?itPriority=<P>&status=<Active>` |
| `myActionsLast7Days` | My Actions (7 days) | Actions Taken with `performedById = current user` and `actionAt` in the last 7 days | none (count only) |
| `urgent` | Urgent | top 5 status ∈ Active, `itPriority = HIGH`, by `updatedAt asc` (oldest first) | Ticket Detail |
| `recentlyUpdated` | Recently Updated | top 5 all Tickets by `updatedAt desc, id desc` | Ticket Detail |

**BR-29** Administrator Dashboard = IT Staff Dashboard + `usersByRole` (count of active users per role). It has no drill-down beyond linking to User Management.

**BR-30** When no record matches, a count is `0` and a list is `[]`. The UI shows a defined empty message and never a blank card.

**BR-31** Legacy Tickets with zero Actions Taken are counted normally in every Ticket metric. They contribute 0 to `myActionsLast7Days`.

### 5.6 Regression and Safety

**BR-32** The Lab 4 migration is additive. No existing column, table, or row is dropped or rewritten.

**BR-33** Seed operations remain idempotent. Seed credentials still come from `LAB3_INITIAL_PASSWORD`, and no secrets are committed.

**BR-34** Unexpected errors return the existing safe error shape without stack traces, SQL, file paths, or secrets.

---

## 6. Authorization Matrix (Lab 4 additions)

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| List Actions Taken | Own Tickets only (read-only) | Yes | Yes |
| Create Action Taken | No (403) | Yes | Yes |
| Edit Action Taken | No (403) | Actions they recorded or are assigned | Any action |
| Delete Action Taken | No | No | No |
| Change Ticket status (with gate) | No (403) | Yes | Yes |
| Requester Dashboard API | Yes (own data) | No (403) | No (403) |
| Staff Dashboard API | No (403) | Yes | Yes (+ user counts) |
| IT Staff Ticket Queue / Detail screens | No | Yes | **Yes (new in Lab 4)** |

Lab 3 authorization rows are unchanged except that Administrators now see the Ticket Queue (decision D-03). Every rule is enforced in the backend. Hidden controls are user feedback only.

---

## 7. UI Specification Summary

Full detail: `docs/lab-04/ui-spec.md`.

- **Navigation.** Every role gets a Dashboard link, and it is the landing screen. The active link is shown with both color and an underline (a non-color cue).
- **Requester Dashboard.** Welcome header, 4 metric cards (My Open, Waiting for Me, Resolved, Closed), each with a "View all" drill-down. Below them: a Recently Updated list, a Recently Resolved list, and Quick Actions (Create Ticket, View My Tickets).
- **IT Staff Dashboard.** Welcome header with Refresh, metric cards (Unassigned, My Assigned, My Actions 7 days, plus by-status and by-priority rows), Urgent and Recently Updated lists, and Quick Actions (Ticket Queue, My Queue). Administrators also see a Users by Role card.
- **Actions Taken (IT Staff Ticket Detail).** A new "Actions Taken" section (table on desktop, stacked cards on mobile), an "Add Action" button that opens an inline create form, and a row "View" that opens view mode with an "Edit" button when BR-10 allows. The Follow-up Note field appears and becomes required when Follow-Up Required is checked.
- **Actions Taken (Requester Ticket Detail).** A read-only list with the same fields.
- **Workflow controls.** The status selector lists only permitted next statuses. When Resolved is blocked, an inline message lists the unmet gate conditions. The Requester resolution indication appears as a badge next to the status control.
- **States.** Every screen has loading, empty, forbidden, not-found, conflict, and safe-failure states. Buttons show a busy label and are disabled while saving.
- **Responsive and accessible.** Lab 2/3 breakpoints, no horizontal page scroll, visible focus, labelled controls, and status shown as text as well as color.

---

## 8. Data Changes

### 8.1 New model `ActionTaken`

| Field | Type | Rule |
|---|---|---|
| `id` | Int PK autoincrement | |
| `ticketId` | Int FK → Ticket.id | required, `onDelete: Restrict` |
| `performedById` | Int FK → User.id | required, set by backend, `onDelete: Restrict` |
| `updatedById` | Int? FK → User.id | last editor, null until first edit |
| `assigneeId` | Int? FK → User.id | BR-38, defaults to the recorder |
| `status` | enum `ActionTakenStatus` | `PLANNED`, `COMPLETED` (default), `CANCELLED`, BR-35 |
| `completedAt` | DateTime? | BR-37 |
| `actionAt` | DateTime (timestamptz) | required, BR-07 |
| `description` | VarChar(2000) | required, BR-06 |
| `result` | VarChar(2000)? | required when Completed, BR-06 |
| `followUpRequired` | Boolean | default `false` |
| `followUpNote` | VarChar(1000)? | BR-08 |
| `attachmentNotes` | VarChar(500)? | BR-09 |
| `clientRequestId` | VarChar(64)? | BR-13, unique together with `ticketId` |
| `version` | Int | default `1`, BR-12 |
| `createdAt` | DateTime | default now |
| `updatedAt` | DateTime | `@updatedAt` |

Database CHECK constraints repeat the key rules as a second line of defence: a Follow-up Note must exist when follow-up is required, a Completed action must have a Result, and `version >= 1`.

Indexes:

- `@@index([ticketId, actionAt, id])`: the ordered list query and the "latest action" lookup for the gate.
- `@@index([performedById, actionAt])`: the `myActionsLast7Days` metric.
- `@@index([ticketId, status])`: the "no Planned actions" gate check.
- `@@index([assigneeId, status])`: work assigned to a staff member.
- `@@unique([ticketId, clientRequestId])`: idempotent create. PostgreSQL allows multiple `NULL`s.

Relations:

- `Ticket.actionsTaken ActionTaken[]`
- `User.actionsPerformed ActionTaken[] @relation("ActionPerformer")`
- `User.actionsAssigned ActionTaken[] @relation("ActionAssignee")`
- `User.actionsUpdated ActionTaken[] @relation("ActionUpdater")`

### 8.2 Database-design decisions

**DD-1: Integer `version` column for optimistic concurrency, not an `updatedAt` comparison.** Timestamps can collide at millisecond precision and lose precision through JSON. An integer is exact, cheap to compare in `updateMany({ where: { id, version } })`, and gives a clear 0-rows-updated signal for 409. This follows the compare-and-set pattern already used for Ticket status in Lab 3.

**DD-2: A separate `ActionTaken` table instead of reusing `InternalNote`.** Actions have structured fields (date/time, result, follow-up flag) that drive the resolution gate and dashboard metrics. Storing them as free-text notes would make BR-20 and BR-28 impossible to query reliably. Keeping them separate also leaves Lab 3 Internal Notes untouched.

**DD-3: Composite index `(ticketId, actionAt, id)`.** It serves both the stable list order (BR-15) and the "most recent action" check of the resolution gate with one index scan.

**DD-4: `onDelete: Restrict` on all foreign keys.** This matches the Lab 3 convention: Tickets and Users are never hard-deleted, so the audit trail cannot be removed by cascade.

### 8.3 Migration and backfill

- Migration: `server/prisma/migrations/20261004093253_lab4_actions_taken`.
- It creates only the `ActionTakenStatus` enum and the `ActionTaken` table with its indexes, foreign keys and CHECK constraints. No existing table is altered, so no backfill is needed.
- **Legacy Tickets** have zero Actions Taken. They remain fully viewable and editable. A legacy Ticket that is already `RESOLVED` or `CLOSED` stays as it is: the gate only applies to new transitions *into* `RESOLVED`. To resolve a legacy Ticket that is not yet resolved, staff must first record an Action Taken.
- **Rollback / recovery.** The migration is additive, so rollback is the documented down-script `server/prisma/rollback/lab4_actions_taken.down.sql`, run only on a disposable database. In normal recovery, you restore the `pg_dump` taken before `prisma migrate deploy`. `server/tests/lab-04/migration-seed.test.ts` checks that the migration contains no destructive statements and that all Lab 1–3 tables remain.

### 8.4 Seed decisions

The seed is extended through `server/prisma/seed-lab4.ts`, called from `server/prisma/seed.ts`, and stays idempotent (existing rows are never modified). It uses lookups keyed on `Ticket.clientSubmissionId` and `ActionTaken (ticketId, clientRequestId)`. It adds:

- at least one Ticket in each of the 8 statuses;
- every IT Priority, plus assigned and unassigned Tickets;
- Tickets with 0, 1, and 3+ Actions Taken, including one performed by a staff member who is not the Ticket Owner;
- one Ticket whose latest action has Follow-Up Required = true, to demonstrate a gate failure;
- one Requester with no Tickets, to demonstrate zero metrics on the dashboard.

---

## 9. API Contract Summary

Full detail: `docs/lab-04/api-spec.md`. The error shape follows the implemented Lab 3 format: `{ "error": { "code", "message", "details"? } }`.

| Method | Path | Role |
|---|---|---|
| GET | `/api/staff/tickets/:ticketId/actions-taken` | IT Staff, Admin |
| POST | `/api/staff/tickets/:ticketId/actions-taken` | IT Staff, Admin |
| GET | `/api/staff/tickets/:ticketId/actions-taken/:actionId` | IT Staff, Admin |
| PATCH | `/api/staff/tickets/:ticketId/actions-taken/:actionId` | performer, Admin |
| GET | `/api/tickets/:ticketId/actions-taken` | Requester (owner) |
| PATCH | `/api/staff/tickets/:ticketId/status` (amended: `expectedStatus`, gate) | IT Staff, Admin |
| GET | `/api/staff/tickets/:ticketId/workflow` | IT Staff, Admin |
| GET | `/api/dashboard/requester` | Requester |
| GET | `/api/dashboard/staff` | IT Staff, Admin |
| GET | `/api/tickets?status=…` (amended: status filter) | Requester |

---

## 10. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with Performed By = the authenticated user. |
| AC-02 | Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned. |
| AC-03 | Given a Ticket owned by Staff A, when Staff B records an Action Taken, then it is saved with Performed By = Staff B and the Ticket Owner is unchanged. |
| AC-04 | Given Follow-Up Required = true and an empty Follow-up Note, when creating or editing, then the backend returns 400 with a field error and nothing is saved. |
| AC-05 | Given missing/blank Description or Result, or an Action Date/Time in the future or before Ticket creation, then the backend returns 400 with field errors. |
| AC-06 | Given a Requester, when they try to create or edit an Action Taken, then 403 is returned. |
| AC-07 | Given a Requester who owns the Ticket, when listing Actions Taken, then all actions are returned read-only. For a non-owned Ticket, a safe 404 is returned. |
| AC-08 | Given an edit with a stale `version`, then 409 `ACTION_TAKEN_CHANGED` is returned and the stored data is unchanged. |
| AC-09 | Given IT Staff who did not perform the action, when editing it, then 403 is returned. An Administrator may edit it. |
| AC-10 | Given a CLOSED or CANCELLED Ticket, when creating or editing an Action Taken, then 409 is returned. |
| AC-11 | Given a repeated create with the same `clientRequestId`, then only one Action Taken exists and the original is returned. |
| AC-12 | Given several Actions Taken, when listed, then they appear in `actionAt`, `id` ascending order on every request. |
| AC-13 | Given each status, then exactly the BR-19 transitions succeed, and every other transition returns 409 `INVALID_STATUS_TRANSITION`. |
| AC-14 | Given a Ticket with no owner, no Actions Taken, or a latest action needing follow-up, when moving to RESOLVED (including via direct API), then 409 `RESOLUTION_GATE_NOT_MET` is returned and the status is unchanged. |
| AC-15 | Given a Ticket meeting the gate, when moving to RESOLVED, then the status changes and the Ticket summary refreshes in the UI. |
| AC-16 | Given `expectedStatus` that differs from the stored status, then 409 `TICKET_CHANGED` is returned. |
| AC-17 | Given a Requester "Problem Appears Resolved" indication, then the status does not change and the indication is visible to IT Staff. |
| AC-18 | Given IT Staff, when the staff dashboard is retrieved, then every count equals the documented database query (BR-28). |
| AC-19 | Given a Requester calling the staff dashboard or IT Staff calling the requester dashboard, then 403 is returned. Unauthenticated callers get 401. |
| AC-20 | Given no matching data, then dashboard counts are 0, lists are empty, and the UI shows the defined empty message. |
| AC-21 | Given a dashboard card, when its drill-down is activated, then the target list opens with the documented filters applied. |
| AC-22 | Given an Administrator, then the staff dashboard includes `usersByRole`, and Ticket Queue and Detail are accessible. |
| AC-23 | Given the Lab 4 migration on a database with Lab 3 data, then all Users, Tickets, Attachments, Public Comments, and Internal Notes are preserved. |
| AC-24 | Given the seed is run twice, then no duplicate rows are created and the required scenarios exist. |
| AC-25 | Given all Lab 1–3 automated tests, then they still pass on `main` after Lab 4. |
| AC-26 | Given desktop (1280), tablet (768), and mobile (375) widths, then the dashboards and Actions Taken show no horizontal page scroll, clipping, or overlap. |
| AC-27 | Given keyboard-only use, then every dashboard drill-down and Actions Taken control can be reached and operated, with visible focus. |
| AC-28 | Given a save in progress, then the submit control is disabled, and after a recoverable failure the entered values remain. |
| AC-29 | Given an inactive or non-staff assignee, then 400 `INVALID_ASSIGNEE` is returned. A Planned action can be completed (with a Result) or cancelled; Completed and Cancelled actions cannot change status, and Cancelled actions cannot be edited. |

---

## 11. Assumptions and Decisions

### 11.1 D-01: Action Taken assignee and lifecycle (resolved: Option B)

**Conflict in the handout.**

- §3, §4.1, and §8.3 define an Action Taken as: Action Date/Time, Description, Result, Performed by (auto), Follow-Up Required?, Follow-up Note, Attachment Notes. There is **no assignee and no status**.
- §9.1 AC-01 says "saved … with the authenticated creator **and approved assignee**".
- §14 Part 6 (10 points) asks students to demonstrate "list, create, **assign**, edit, **status transition, complete, cancel**, validation, **inactive-assignee rejection** …" for Actions Taken.

**Option A: field list only (§3/§8.3 as written).** An Action Taken records work already done, Performed By is automatic, and there is no assignee or status. In the demo, "status transition / complete / cancel" are shown at Ticket level, and "inactive-assignee rejection" is shown with Lab 3 Ticket-Owner assignment (inactive staff are rejected).

**Option B: field list plus planning.** Add `assigneeId` (eligible active staff, inactive rejected), `status` PLANNED/COMPLETED/CANCELLED, and `completedAt`. Performed By remains the creator. Planned actions block resolution (BR-20 condition 4). Estimated cost: about 150 extra lines and about 8 extra tests.

**Decision (Issue #56, 2026-10-04).** The team adopted **Option B**. It keeps every field in §3/§8.3 unchanged and adds only what the Part 6 grading requires (assign, complete, cancel, inactive-assignee rejection), so both parts of the handout are satisfied. Rules: BR-35 to BR-38, and BR-20 conditions 2–4.

### 11.2 Other decisions

- **D-02.** Follow-Up Required on the **latest Completed** action blocks resolution. This is how "IT Staff must review the work" is made enforceable. Earlier follow-up flags are treated as handled by later actions.
- **D-03.** Administrators get the IT Staff Ticket Queue and Detail in the UI. Handout §4.3 says Administrators "perform IT Staff behavior", and the backend already allows it since Lab 3. This replaces Lab 3's "No by default" UI rule.
- **D-04.** The final transition matrix keeps the Lab 3 *implemented* `CLOSED → REOPENED` and `CANCELLED → REOPENED`. The Lab 3 documents (terminal states) are corrected rather than the code, so released behavior is not removed. The reviewer should confirm.
- **D-05.** Status changes now require `expectedStatus` (handout §6.1). The Lab 3 status endpoint accepted only `{ status }`; the Lab 4 client always sends both. Requests without `expectedStatus` return 400, and the Lab 3 tests are updated accordingly.
- **D-06.** "Recent" means the last 7 days in Asia/Bangkok; list length is 5.
- **D-07.** Attachment Notes is text only. It does not link to Attachment records, because uploads per action are excluded.
- **D-08.** The dashboard has no "from yesterday" trend deltas (shown in the handout mock-up). They would need historical snapshots, which are out of scope (excluded BI/analytics).

---

## 12. Product Definition of Done

A Lab 4 issue is Done only when:

- [ ] Its behavior matches this specification and `api-spec.md` / `ui-spec.md`; any deviation is recorded in section 11 first.
- [ ] Backend validation and authorization are enforced and covered by API tests (401/403/404/409/400 paths).
- [ ] The UI shows loading, empty, forbidden, conflict, and safe-failure states, and buttons are protected against double-submit.
- [ ] Desktop, tablet, and mobile screenshots are saved under `artifacts/lab-04/screenshots/`.
- [ ] Keyboard and focus checks pass, and status is never shown by color alone.
- [ ] `cd server && npm test && npm run build` passes.
- [ ] `cd client && npm test && npm run build` passes.
- [ ] Relevant Playwright E2E specs pass against the `toktickit_test` database.
- [ ] All Lab 1–3 tests still pass.
- [ ] `tests.md` rows for the issue are updated with the actual file and Pass status.
- [ ] `git diff --check` is clean, and no secrets, `.env`, or database URLs are committed.
- [ ] The PR references "Closes #N", has been peer-reviewed and approved by a teammate, and is merged into `lab4-staging`.

The product is Done when every Lab 4 issue (#55–#61) is Done, `lab4-staging` is merged into `main` through a reviewed PR, the full test output from `main` is recorded, and `reviewer.md`, `ai-use.md`, and README are current.
