# Lab 4 REST API Specification

Issue: #55. This document extends `docs/lab-03/api-spec.md`. Every Lab 2 and Lab 3 endpoint remains available unless it is amended here.

---

## 1. General Rules

- Base path: `/api`. JSON request and response bodies.
- Authentication: the Lab 3 HttpOnly session cookie (`requireAuth`, then `requireCompletedPasswordChange`).
- Same-origin check: the existing `verifyRequestOrigin` applies to all state-changing requests.
- Timestamps are ISO-8601 UTC strings.
- IDs in paths must be positive integers. Otherwise the response is `400 VALIDATION_ERROR`.
- Unknown body fields are rejected with `400 VALIDATION_ERROR`, following the Lab 3 `readSingleFieldBody` strictness.

### 1.1 Error shape (as implemented since Lab 3)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": { "followUpNote": "Follow-up Note is required when follow-up is needed." }
  }
}
```

> Note: `docs/lab-03/api-spec.md` §28 shows a flat `{ "error", "message" }` shape. The implemented and tested shape is the nested one above. Lab 4 documents the implemented shape.

### 1.2 Status codes

| Code | Use |
|---|---|
| 200 | Read or update succeeded |
| 201 | Action Taken created |
| 400 | Invalid input (`VALIDATION_ERROR`, `INVALID_ASSIGNEE`) |
| 401 | Not authenticated (`UNAUTHENTICATED`) |
| 403 | Authenticated but not permitted (`FORBIDDEN`, `PASSWORD_CHANGE_REQUIRED`) |
| 404 | Not found or safely unavailable (`TICKET_NOT_FOUND`, `ACTION_TAKEN_NOT_FOUND`) |
| 409 | Conflict (`ACTION_TAKEN_CHANGED`, `ACTION_TAKEN_LOCKED`, `INVALID_ACTION_STATUS_TRANSITION`, `TICKET_CHANGED`, `TICKET_NOT_WRITABLE`, `INVALID_STATUS_TRANSITION`, `RESOLUTION_GATE_NOT_MET`) |
| 500 | Safe unexpected failure (`INTERNAL_ERROR`) |

---

## 2. Action Taken Resource

```json
{
  "id": 42,
  "ticketId": 7,
  "status": "COMPLETED",
  "actionAt": "2026-10-05T03:15:00.000Z",
  "completedAt": "2026-10-05T03:16:02.000Z",
  "description": "Replaced the laptop battery.",
  "result": "Laptop holds charge for 6 hours.",
  "followUpRequired": true,
  "followUpNote": "Check battery health again next week.",
  "attachmentNotes": "See battery-report.pdf in Ticket Attachments.",
  "performedBy": { "id": 12, "name": "Somchai IT", "role": "IT_STAFF" },
  "assignee": { "id": 12, "name": "Somchai IT", "role": "IT_STAFF" },
  "updatedBy": null,
  "version": 1,
  "createdAt": "2026-10-05T03:16:02.000Z",
  "updatedAt": "2026-10-05T03:16:02.000Z",
  "canEdit": true
}
```

- `performedBy`, `assignee` and `updatedBy` expose only `id`, `name`, and `role`. Email, password, and session data are never included.
- `canEdit` is computed by the backend for the current user: performer, assignee or Administrator, the action is not Cancelled, and the Ticket is not Closed or Cancelled (BR-10, BR-14, BR-36). It is a UI hint only; the backend re-checks it on every edit.
- The Requester representation omits `canEdit`, `version`, and `updatedBy`.
- `status` is `PLANNED`, `COMPLETED` or `CANCELLED` (decision D-01). `completedAt` is set by the backend when the action becomes Completed.

### 2.1 Validation

| Field | Rule | Error detail key |
|---|---|---|
| `status` | optional on create: `PLANNED` or `COMPLETED` (default). On edit: only `PLANNED` → `COMPLETED` / `CANCELLED` | `status` |
| `actionAt` | required ISO date-time; ≥ ticket.createdAt; ≤ now + 5 min when Completed, ≤ now + 1 year when Planned | `actionAt` |
| `description` | required string, trimmed 1–2000 | `description` |
| `result` | required when Completed (trimmed 1–2000); optional while Planned | `result` |
| `followUpRequired` | required boolean | `followUpRequired` |
| `followUpNote` | required, trimmed 1–1000, if `followUpRequired` is true; otherwise ignored and stored as `null` | `followUpNote` |
| `attachmentNotes` | optional string, trimmed ≤ 500; empty becomes `null` | `attachmentNotes` |
| `assigneeId` | optional active IT Staff/Administrator user ID; defaults to the recorder on create; otherwise 400 `INVALID_ASSIGNEE` | `assigneeId` |
| `clientRequestId` | optional, 8–64 letters, digits, `-` or `_` (a UUID is recommended); create only | `clientRequestId` |
| `version` | required positive integer (edit only) | `version` |
| `performedById`, `ticketId`, `id`, `createdAt` in body | rejected as unknown fields | n/a |

---

## 3. IT Staff Action Taken Endpoints

Router mounted at `/api/staff/tickets` (alongside `staffTicketOperationsRouter`). Required role: `IT_STAFF` or `ADMINISTRATOR`. Any other role gets 403 `FORBIDDEN`.

### 3.1 List

```text
GET /api/staff/tickets/:ticketId/actions-taken
```

200:

```json
{ "items": [ /* ActionTaken, ordered actionAt asc, id asc */ ] }
```

404 `TICKET_NOT_FOUND` if the Ticket does not exist. Each Ticket has a bounded number of actions, so the list is not paginated.

### 3.2 Get one

```text
GET /api/staff/tickets/:ticketId/actions-taken/:actionId
```

200 returns the `ActionTaken`. 404 `ACTION_TAKEN_NOT_FOUND` if the action does not exist **or belongs to a different Ticket** (BR-01).

### 3.3 Create

```text
POST /api/staff/tickets/:ticketId/actions-taken
```

```json
{
  "actionAt": "2026-10-05T03:15:00.000Z",
  "description": "Replaced the laptop battery.",
  "result": "Laptop holds charge for 6 hours.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "",
  "status": "COMPLETED",
  "assigneeId": 12,
  "clientRequestId": "6c0e1a8e-0b8e-4d3c-9b0e-1f0c2a7d4e11"
}
```

| Result | Response |
|---|---|
| Created | 201 + `ActionTaken`; `performedById` = session user |
| Same `clientRequestId` already used on this Ticket | 200 + the existing `ActionTaken` (no duplicate) |
| Validation failure | 400 `VALIDATION_ERROR` with `details` |
| Ticket missing | 404 `TICKET_NOT_FOUND` |
| Ticket `CLOSED` / `CANCELLED` | 409 `TICKET_NOT_WRITABLE` |
| Inactive or non-staff assignee | 400 `INVALID_ASSIGNEE` |
| `status: CANCELLED` on create | 400 `VALIDATION_ERROR` |
| Requester | 403 `FORBIDDEN` |

Creating an action also updates `Ticket.updatedAt`, so dashboards and the queue reflect recent work.

### 3.4 Edit

```text
PATCH /api/staff/tickets/:ticketId/actions-taken/:actionId
```

```json
{
  "version": 1,
  "actionAt": "2026-10-05T03:15:00.000Z",
  "description": "Replaced the laptop battery and updated BIOS.",
  "result": "Laptop holds charge for 6 hours.",
  "followUpRequired": true,
  "followUpNote": "Check battery health next week.",
  "attachmentNotes": null
}
```

`version` is required. The editable fields are the same as for create except `clientRequestId`, and at least one must be present. The request is merged with the stored values before validation, so cross-field rules (Follow-up Note, Result when Completed) apply to the final state. To complete a Planned action send `{ "version": n, "status": "COMPLETED", "result": "…" }`; to cancel it send `{ "version": n, "status": "CANCELLED" }`.

| Result | Response |
|---|---|
| Updated | 200 + `ActionTaken` with `version` + 1 and `updatedBy` = session user |
| Not performer, assignee or Administrator | 403 `FORBIDDEN` |
| Action is Cancelled | 409 `ACTION_TAKEN_LOCKED` |
| Status change other than Planned → Completed / Cancelled | 409 `INVALID_ACTION_STATUS_TRANSITION` |
| Inactive or non-staff assignee | 400 `INVALID_ASSIGNEE` |
| Stale `version` | 409 `ACTION_TAKEN_CHANGED`, "This Action Taken was changed by another user. Reload and try again." |
| Ticket `CLOSED` / `CANCELLED` | 409 `TICKET_NOT_WRITABLE` |
| Validation failure | 400 `VALIDATION_ERROR` |
| Action missing or on another Ticket | 404 `ACTION_TAKEN_NOT_FOUND` |

Implementation: the version is checked first, then `updateMany({ where: { id, ticketId, version }, data: { …, version: { increment: 1 } } })` runs in the same transaction. A count of 0 means another edit won the race and returns 409 `ACTION_TAKEN_CHANGED`.

### 3.5 No delete

No `DELETE` route is provided (BR-11). Express returns 404 for it.

---

## 4. Requester Action Taken Endpoint

```text
GET /api/tickets/:ticketId/actions-taken
```

- Role: `REQUESTER`. The Ticket's `requesterId` must equal the session user.
- 200 `{ "items": [ … ] }` in the Requester representation and the same order.
- Non-owned or missing Ticket: 404 `TICKET_NOT_FOUND` (same safe response as Lab 3 Ticket Detail).
- `POST` and `PATCH` are not routed for Requesters. An attempt to call the staff routes returns 403 `FORBIDDEN`.

---

## 5. Ticket Workflow

### 5.1 Workflow state (new)

```text
GET /api/staff/tickets/:ticketId/workflow
```

Role: IT Staff or Administrator.

```json
{
  "currentStatus": "IN_PROGRESS",
  "allowedNextStatuses": ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  "resolutionGate": {
    "satisfied": false,
    "unmet": ["LATEST_ACTION_NEEDS_FOLLOW_UP"]
  },
  "requesterResolutionIndicatedAt": "2026-10-05T02:00:00.000Z"
}
```

`unmet` codes: `NO_OWNER`, `NO_ACTIONS_TAKEN` (no Completed action), `LATEST_ACTION_NEEDS_FOLLOW_UP`, `PLANNED_ACTIONS_REMAIN`.

`allowedNextStatuses` lists every matrix transition (BR-19), including `RESOLVED` when the gate is unmet, so the UI can show it disabled with the reason.

### 5.2 Change status (amended)

```text
PATCH /api/staff/tickets/:ticketId/status
```

```json
{ "status": "RESOLVED", "expectedStatus": "IN_PROGRESS" }
```

Both fields are required (decision D-05).

| Result | Response |
|---|---|
| Permitted | 200 + updated Ticket detail (as in Lab 3) |
| `expectedStatus` ≠ stored status | 409 `TICKET_CHANGED` |
| Not in the BR-19 matrix | 409 `INVALID_STATUS_TRANSITION` (Lab 3 message preserved) |
| Target `RESOLVED` and gate unmet | 409 `RESOLUTION_GATE_NOT_MET`, `details: { "unmet": "NO_ACTIONS_TAKEN,LATEST_ACTION_NEEDS_FOLLOW_UP" }` |
| Concurrent change between read and write | 409 `TICKET_CHANGED` (existing compare-and-set) |
| Requester | 403 `FORBIDDEN` |

The gate check and the status update run in one transaction, so an action added or edited concurrently cannot make the decision stale.

### 5.3 Final transition matrix

| From | Allowed to |
|---|---|
| NEW | OPEN, IN_PROGRESS, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED*, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED*, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED*, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED*, CANCELLED |
| CANCELLED | REOPENED |

\* subject to the resolution gate.

### 5.4 Problem Appears Resolved (unchanged)

`POST /api/tickets/:ticketId/problem-appears-resolved` keeps its Lab 3 behavior. It sets `requesterResolutionIndicatedAt` only and never changes status.

---

## 6. Dashboards

Router mounted at `/api/dashboard`. All values are computed per request (BR-24).

### 6.1 Requester dashboard

```text
GET /api/dashboard/requester
```

Role: `REQUESTER` only (IT Staff and Administrator get 403).

```json
{
  "generatedAt": "2026-10-05T03:20:00.000Z",
  "timeZone": "Asia/Bangkok",
  "metrics": [
    { "key": "openTickets",  "label": "My Open Tickets", "count": 3,
      "drillDown": { "screen": "my-tickets", "query": { "status": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } } },
    { "key": "waitingForMe", "label": "Waiting for Me",  "count": 1,
      "drillDown": { "screen": "my-tickets", "query": { "status": "WAITING_FOR_REQUESTER" } } },
    { "key": "resolved",     "label": "Resolved",        "count": 5,
      "drillDown": { "screen": "my-tickets", "query": { "status": "RESOLVED" } } },
    { "key": "closed",       "label": "Closed",          "count": 12,
      "drillDown": { "screen": "my-tickets", "query": { "status": "CLOSED" } } }
  ],
  "recentlyUpdated": [
    { "id": 7, "ticketNumber": "TKT-2026-000007", "summary": "Laptop battery drains quickly",
      "currentStatus": "IN_PROGRESS", "updatedAt": "2026-10-05T02:14:00.000Z" }
  ],
  "recentlyResolved": []
}
```

Lists contain at most 5 items. Calculations are in specification BR-27.

### 6.2 Staff dashboard

```text
GET /api/dashboard/staff
```

Role: `IT_STAFF` or `ADMINISTRATOR` (Requester gets 403).

```json
{
  "generatedAt": "2026-10-05T03:20:00.000Z",
  "timeZone": "Asia/Bangkok",
  "metrics": [
    { "key": "unassigned", "label": "Unassigned", "count": 4,
      "drillDown": { "screen": "staff-queue", "query": { "assignment": "unassigned", "status": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } } },
    { "key": "myAssigned", "label": "My Assigned", "count": 6,
      "drillDown": { "screen": "staff-queue", "query": { "assignment": "mine", "status": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } } },
    { "key": "myActionsLast7Days", "label": "My Actions (7 days)", "count": 9, "drillDown": null }
  ],
  "byStatus":     [ { "status": "NEW", "count": 2, "drillDown": { "screen": "staff-queue", "query": { "status": "NEW" } } } ],
  "byItPriority": [ { "itPriority": "HIGH", "count": 3, "drillDown": { "screen": "staff-queue", "query": { "itPriority": "HIGH", "status": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } } } ],
  "urgent": [ /* up to 5 ticket summaries + itPriority + owner { id, name } | null */ ],
  "recentlyUpdated": [ /* up to 5 */ ],
  "usersByRole": null
}
```

- `byStatus` always has all 8 statuses, and `byItPriority` always has all 3 priorities, with `0` where nothing matches.
- `usersByRole` is `null` for IT Staff. For Administrators it is `{ "REQUESTER": n, "IT_STAFF": n, "ADMINISTRATOR": n }` (active users only).
- The drill-down `query` keys match the parameters the Lab 3 queue already accepts (`status`, `itPriority`, `assignment`). The queue is amended to accept a comma-separated `status` list.

### 6.3 Requester My Tickets (amended)

```text
GET /api/tickets?status=WAITING_FOR_REQUESTER
GET /api/tickets?status=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED
```

`status` is optional: a comma-separated list of valid `TicketStatus` values. An invalid value returns 400 `VALIDATION_ERROR`. All other Lab 2/3 parameters and the ownership filtering are unchanged.

---

## 7. Authorization Summary

| Endpoint | Unauth | Requester | IT Staff | Admin |
|---|---|---|---|---|
| GET staff actions-taken (list/one) | 401 | 403 | 200 | 200 |
| POST staff actions-taken | 401 | 403 | 201 | 201 |
| PATCH staff actions-taken | 401 | 403 | 200 own / 403 other | 200 |
| GET requester actions-taken | 401 | 200 own / 404 other | 403 | 403 |
| GET workflow | 401 | 403 | 200 | 200 |
| PATCH status | 401 | 403 | 200/409 | 200/409 |
| GET dashboard/requester | 401 | 200 | 403 | 403 |
| GET dashboard/staff | 401 | 403 | 200 | 200 (+usersByRole) |

---

## 8. API Definition of Done

- [ ] Every endpoint above has API tests for its success path, 400, 401, 403, 404, and 409 (where applicable).
- [ ] No response contains password hashes, emails of other users, session data, stack traces, or SQL.
- [ ] Dashboard counts are verified against direct Prisma `count()` queries in the tests.
- [ ] All Lab 1–3 API tests still pass, with the documented amendment for `expectedStatus`.
