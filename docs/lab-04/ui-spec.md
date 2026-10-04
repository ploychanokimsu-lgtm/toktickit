# Lab 4 UI Specification

Issue: #55. This document extends `docs/lab-03/ui-specs.md` and `docs/lab-02/ui-spec.md`. It reuses the Zen Green tokens, components, breakpoints, and accessibility rules defined there.

---

## 1. UI Goals

- Add Dashboards that give each role a short starting point and drill down into the existing detailed screens.
- Add Actions Taken to Ticket Detail with list, create, view, and edit modes.
- Show only permitted status transitions and explain the resolution gate.
- Leave the final product looking like one coherent Zen Green application.

---

## 2. Application Shell and Navigation

| Role | Navigation (in order) | Landing screen |
|---|---|---|
| Requester | Dashboard · My Tickets · Create Ticket | Dashboard |
| IT Staff | Dashboard · Ticket Queue | Dashboard |
| Administrator | Dashboard · Ticket Queue · User Management | Dashboard |

- The active link uses the existing `tk-nav-link active` style plus a 3px underline, so it is not distinguished by color alone. It also carries `aria-current="page"`.
- The header keeps the user name, role badge, and Logout from Lab 3.
- On mobile (< 768px), navigation collapses into the existing Lab 3 mobile menu pattern. There is no horizontal scrolling.

---

## 3. Requester Dashboard

### 3.1 Layout

```
┌ Welcome, <name>!  ·  "Here's the latest on your requests."            ┐
├──────────────┬──────────────┬──────────────┬──────────────┤
│ My Open      │ Waiting for  │ Resolved     │ Closed       │   metric cards
│   3          │ Me   1       │   5          │  12          │
│ View all →   │ View all →   │ View all →   │ View all →   │
├──────────────┴──────────────┴──────┬───────┴──────────────┤
│ Recently Updated (≤5)    View all → │ Quick Actions        │
│  TKT-…  summary   [status]  time    │  + Create Ticket     │
│ Recently Resolved (≤5)              │  ▤ View My Tickets   │
└─────────────────────────────────────┴──────────────────────┘
```

- Desktop (≥ 1200px): 4 cards in one row; lists 2/3 width, Quick Actions 1/3.
- Tablet (768–1199px): cards in a 2×2 grid; Quick Actions below the lists.
- Mobile (< 768px): cards stacked in a single column (or 2 columns if they fit without clipping); lists full width.

### 3.2 Metric card

- Label (text), value (large number), and a "View all" link with an accessible name such as "View all Waiting for Me tickets".
- The whole card is **not** a single click target. Only the link is, which avoids nested-interactive problems.
- A count of `0` still shows the card with the value `0` and the link.
- "Waiting for Me" with count > 0 gets an attention badge with the text "Needs your reply", so the meaning is not carried by color alone.

### 3.3 Lists

- Each row shows Ticket Number (a link to Requester Ticket Detail), Summary (truncated with an ellipsis and the full text in `title`), a status badge, and the relative and absolute updated time.
- Empty states: "No tickets updated in the last 7 days." and "No recently resolved tickets."

### 3.4 Drill-down

"View all" navigates to My Tickets with the `status` filter pre-applied and visible in the filter control. A "Clear filter" action returns to the unfiltered list.

---

## 4. IT Staff Dashboard (Administrator reuses it)

### 4.1 Layout

```
┌ Welcome back, <name>!                                   [⟳ Refresh] ┐
├────────────┬────────────┬──────────────────┐                        │
│ Unassigned │ My Assigned│ My Actions (7d)  │   primary metric cards │
│   4  →     │   6  →     │   9              │                        │
├────────────┴────────────┴──────────────────┤                        │
│ Tickets by Status:  New 2 · Open 3 · In Progress 5 · Waiting 1 ·    │
│                     Resolved 4 · Closed 12 · Reopened 0 · Cancelled 1│  each a link
│ Active by IT Priority:  High 3 · Medium 5 · Low 2                   │
├───────────────────────────────────┬──────────────────────────────────┤
│ Urgent (High, oldest first, ≤5)   │ Recently Updated (≤5)            │
├───────────────────────────────────┴──────────────────────────────────┤
│ [Admin only] Active Users: Requesters n · IT Staff n · Admins n →    │
│ Quick Actions: Ticket Queue · My Queue                               │
└──────────────────────────────────────────────────────────────────────┘
```

- By-status and by-priority entries are rendered as a list of chips (`<ul>` of links). Each chip has text and a count and uses the existing status and priority badge colors plus text.
- The Urgent list shows the owner name, or an "Unassigned" badge.
- Refresh re-fetches the data. While loading, cards keep their previous values and show a busy indicator, which avoids layout jumps.
- My Actions (7 days) is a count without a drill-down, so its card has no link.

### 4.2 Drill-down

Links navigate to the IT Staff Ticket Queue with `status`, `itPriority`, and `assignment` pre-applied. List rows open IT Staff Ticket Detail.

---

## 5. Actions Taken on IT Staff Ticket Detail

### 5.1 Placement

A new section "Actions Taken" sits after Ticket information and the status/owner controls, before the Public Comments / Internal Notes tabs. The section header shows a count, e.g. "Actions Taken (3)", and an "Add Action" primary button. The button is hidden when the Ticket is `CLOSED` or `CANCELLED`; a muted note explains "This ticket is closed; actions are read-only."

### 5.2 List mode

| Date/Time | Description | Result | Performed by | Follow-up | |
|---|---|---|---|---|---|
| 5 Oct 2026, 10:15 | Replaced battery… | Holds charge… | Somchai IT | ⚑ Needed | View |

- Order: oldest first (BR-15). The newest row is labelled "Latest".
- Follow-up shows "⚑ Needed" (warning badge with icon and text) or "—".
- Description and Result are truncated to 2 lines in the table. View mode shows the full text.
- Mobile: each action becomes a stacked card with label/value pairs.
- Empty state: "No actions recorded yet. Record the work performed to enable resolution."

### 5.3 Create mode (inline form, replaces the "Add Action" button area)

| Field | Control | Notes |
|---|---|---|
| Action Date/Time | `datetime-local`, default now | required |
| Action Description | textarea, counter /2000 | required |
| Result | textarea, counter /2000 | required |
| Follow-Up Required? | checkbox | |
| Follow-up Note | textarea, counter /1000 | shown and required only when the checkbox is on; focus moves to it when it appears |
| Attachment Notes | text input, counter /500 | help text: "Which file in Attachments to look at (optional)." |
| Performed by | read-only text "You (<name>)" | not editable |

- Buttons: "Save Action" (primary) and "Cancel" (secondary). Save shows "Saving…" and is disabled while in flight. A `clientRequestId` is generated once per form open.
- Validation errors appear under each field (`aria-describedby`). The first invalid field receives focus, and a summary alert sits at the top of the form.
- On success: the form closes, the list refreshes, the Ticket header `updatedAt` refreshes, and a success toast says "Action recorded."
- On failure: the entered values are kept, and a safe error message is shown.

### 5.4 View / edit mode

- "View" opens a panel (inline expansion on mobile, side panel on desktop) showing all fields, plus Created, Last edited by, and Last edited at.
- "Edit" is shown only when `canEdit` is true. Edit mode reuses the create form with the values filled in. Performed by stays read-only.
- 409 `ACTION_TAKEN_CHANGED`: an inline warning says "This action was changed by someone else." It offers a "Reload latest" button and keeps the user's edits visible until they choose to reload.

### 5.5 Requester Ticket Detail

A read-only "Actions Taken" section with the same fields (no version or editor info) and no buttons. Empty state: "IT Staff have not recorded any actions yet."

### 5.6 Assignee and lifecycle (decision D-01)

- An Assignee select listing active IT Staff and Administrators, and a status badge (Planned / Completed / Cancelled).
- "Mark Completed" and "Cancel Action" buttons, with confirmation for cancel.
- An inactive assignee rejected by the backend appears as a field error on Assignee.

---

## 6. Ticket Workflow Controls

- The status control lists `allowedNextStatuses` from `GET …/workflow`.
- If `RESOLVED` is allowed by the matrix but the gate is unmet, the "Resolved" option is shown **disabled**, and a message below lists the reasons in plain language:
  - "Assign a Ticket Owner." (`NO_OWNER`)
  - "Record at least one Action Taken." (`NO_ACTIONS_TAKEN`)
  - "The latest Action Taken needs follow-up. Record a follow-up action first." (`LATEST_ACTION_NEEDS_FOLLOW_UP`)
- If the Requester has indicated the problem appears resolved, an info badge shows "Requester says problem appears resolved · <time>".
- "Change Status" is disabled while saving. On success the Ticket header status badge and updated time refresh, and the workflow state is re-fetched.
- A 409 `TICKET_CHANGED` response shows "This ticket was updated by someone else," with a Reload button.
- Changing to `CANCELLED` or `CLOSED` asks for confirmation in an accessible dialog (focus trapped, Escape closes it, focus returns to the trigger).

---

## 7. Global States (all Lab 4 screens)

| State | Presentation |
|---|---|
| Loading | Skeleton cards/rows plus a `role="status"` "Loading…" for screen readers |
| Empty | Defined text per list/card (see above) |
| Forbidden (403) | Lab 3 forbidden panel "You don't have access to this page." plus a link to the Dashboard |
| Not found (404) | Lab 3 safe not-found panel |
| Conflict (409) | Inline warning with a Reload action, keeping the user's input |
| Safe failure (5xx/network) | `role="alert"` "Something went wrong. Please try again." plus Retry; no technical details |
| Success | Toast (`role="status"`), auto-dismiss after 4s, also closable by keyboard |

---

## 8. Responsive Requirements

- Verified at 1280×800 (desktop), 768×1024 (tablet), and 375×812 (mobile).
- `document.documentElement.scrollWidth <= window.innerWidth` on every Lab 4 screen. The Lab 3 E2E pattern is reused.
- Tables switch to stacked cards below 768px. No content is clipped and no controls overlap.
- Touch targets are at least 44×44px on mobile.

---

## 9. Accessibility Requirements

- All controls are reachable by Tab in visual order, and visible focus uses the existing Zen Green focus ring.
- Metric values are announced with their labels (the card is a `<section aria-labelledby>`).
- Status, priority, and follow-up are always shown as text, never by color alone.
- Form fields have `<label>`, required fields are marked with text "(required)", and errors use `aria-describedby` and `aria-invalid`.
- Dialogs use `role="dialog"`, `aria-modal`, focus trapping, and Escape to close.
- Headings form a logical outline (h1 page title, h2 sections).
- Text contrast is at least 4.5:1 for body text and 3:1 for large numbers and UI borders.

---

## 10. Visual and Accessibility Checklist (completed in Issue #61)

| # | Check | Requester Dashboard | Staff Dashboard | Actions Taken | Workflow |
|---|---|---|---|---|---|
| V1 | Zen Green tokens, cards, badges, buttons consistent with Lab 2/3 | ☐ | ☐ | ☐ | ☐ |
| V2 | Editable vs read-only fields visually distinct | n/a | n/a | ☐ | ☐ |
| V3 | Validation messages placed under fields + summary | n/a | n/a | ☐ | ☐ |
| V4 | Visible keyboard focus on every control | ☐ | ☐ | ☐ | ☐ |
| V5 | No clipping at 375/768/1280 | ☐ | ☐ | ☐ | ☐ |
| V6 | No overlapping controls | ☐ | ☐ | ☐ | ☐ |
| V7 | No horizontal page overflow | ☐ | ☐ | ☐ | ☐ |
| V8 | Non-color status cues | ☐ | ☐ | ☐ | ☐ |
| V9 | Loading / empty / error states present | ☐ | ☐ | ☐ | ☐ |
| V10 | No placeholder text, console errors, or dead links | ☐ | ☐ | ☐ | ☐ |

---

## 11. Screenshot Evidence Plan

```
artifacts/lab-04/screenshots/
├── requester-dashboard/  desktop.png  tablet.png  mobile.png  empty.png
├── staff-dashboard/      desktop.png  tablet.png  mobile.png  admin.png
└── actions-taken/        list-desktop.png  list-tablet.png  list-mobile.png
                          create-validation.png  edit-conflict.png  requester-readonly.png
                          resolve-blocked.png
```

---

## 12. Components

| Component | File | Notes |
|---|---|---|
| `MetricCard` | `client/src/components/MetricCard.tsx` | label, count, optional drill-down link |
| `RequesterDashboard` | `client/src/RequesterDashboard.tsx` | |
| `StaffDashboard` | `client/src/StaffDashboard.tsx` | `isAdministrator` prop for usersByRole |
| `ActionsTaken` | `client/src/ActionsTaken.tsx` | `mode: "staff" | "requester"` |
| `ActionTakenForm` | inside `ActionsTaken.tsx` | create and edit |
| `TicketWorkflowControl` | extracted from `StaffTicketDetail.tsx` | uses `/workflow` |
| API clients | `client/src/dashboard-api.ts`, `client/src/actions-taken-api.ts` | reuse the existing fetch and error helpers |
