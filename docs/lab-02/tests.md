# Lab 2 Test Plan and Results

## 1. Test Strategy

Lab 2 uses Test-Driven Development (TDD) and Test-Driven Development planning (Test DD) to verify the Requester-facing TokTickIT MVP.

Tests are planned before implementation is declared complete.

The test strategy covers:

* Unit tests
* API / integration tests
* UI component tests
* UI style and state tests
* Responsive tests
* End-to-end tests
* Ownership and multi-Requester behavior
* Validation and boundary cases
* Loading, empty, no-results, success, and failure states
* Attachment lifecycle
* Zen Green UI requirements
* Accessibility requirements

Each Acceptance Criterion from `specification.md` maps to at least one planned automated test.

The final implementation shall not be considered complete when:

* required tests are missing;
* required tests are skipped;
* tests are disabled;
* tests are commented out;
* tests are flaky;
* tests pass without testing the intended requirement; or
* the final `main` branch does not pass the documented test commands.

---

# 2. Test Levels

## 2.1 Unit Tests

Unit tests verify small pieces of business logic independently.

Examples:

* Ticket Number generation
* Ticket validation
* Summary trimming
* Description trimming
* Attachment validation
* Removal-reason validation
* pagination parsing

---

## 2.2 API / Integration Tests

API tests verify:

* REST endpoints
* PostgreSQL interaction
* Requester ownership
* validation
* status codes
* query behavior
* Attachment lifecycle
* safe errors

API tests shall use isolated test data and shall not depend on manually created production/development records.

---

## 2.3 UI Component Tests

UI tests verify:

* rendered controls
* validation behavior
* loading states
* busy states
* empty states
* error states
* Requester switching
* Attachment presentation
* user interaction

---

## 2.4 UI Style Tests

UI style tests verify required presentation rules that can be asserted automatically.

Examples:

* required Zen Green classes/tokens
* required-field indicators
* read-only styles
* invalid field styles
* active navigation
* badge labels
* disabled controls

---

## 2.5 Responsive Tests

Responsive tests verify:

* desktop layout
* tablet layout
* mobile layout
* no unintended horizontal scrolling
* readable labels
* usable controls
* mobile Ticket cards
* Attachment filename behavior

---

## 2.6 End-to-End Tests

E2E tests verify complete Requester workflows through the running frontend, backend, and database.

Examples:

* select Requester
* create Ticket
* find Ticket in My Tickets
* open Ticket Detail
* upload Attachment
* download Attachment
* soft-remove Attachment
* switch Requester
* verify ownership protection

---

# 3. Planned Test File Structure

Planned test paths:

```text
server/tests/lab-02/
├── ticket-number.unit.test.ts
├── ticket-validation.unit.test.ts
├── attachment-validation.unit.test.ts
├── create-ticket.api.test.ts
├── requester-context.api.test.ts
├── reference-data.api.test.ts
├── my-tickets.api.test.ts
├── ticket-detail.api.test.ts
└── attachments.api.test.ts

client/src/tests/lab-02/
├── DevelopmentRequesterSelection.test.tsx
├── AppShell.test.tsx
├── CreateTicket.test.tsx
├── MyTickets.test.tsx
├── RequesterTicketDetail.test.tsx
├── AttachmentSection.test.tsx
└── ui-style.test.tsx

e2e/lab-02/
└── requester-ticket-flow.spec.ts
```

If the existing Lab 1 repository uses a different established test directory, the implementation may preserve that convention.

Any changed path must be updated in this document so the final table identifies the **actual test-file path**.

---

# 4. Planned Unit Tests

| Test ID | Type | Requirement / AC    | What It Tests                   | Expected Result                                    | Automated Test File                                      | Final   |
| ------- | ---- | ------------------- | ------------------------------- | -------------------------------------------------- | -------------------------------------------------------- | ------- |
| UNIT-01 | Unit | BR-01, AC-01        | Generate official Ticket Number | Valid unique format such as `TKT-2026-000001`      | `server/tests/lab-02/ticket-number.unit.test.ts`         | Planned |
| UNIT-02 | Unit | BR-12, BR-13, AC-09 | Summary trimming                | Surrounding whitespace removed                     | `server/tests/lab-02/ticket-validation.unit.test.ts`     | Planned |
| UNIT-03 | Unit | BR-13, AC-08        | Summary minimum boundary        | 4 chars invalid; 5 chars valid                     | `server/tests/lab-02/ticket-validation.unit.test.ts`     | Planned |
| UNIT-04 | Unit | BR-13, AC-08        | Summary maximum boundary        | 150 chars valid; 151 invalid                       | `server/tests/lab-02/ticket-validation.unit.test.ts`     | Planned |
| UNIT-05 | Unit | BR-15, BR-16, AC-10 | Description trimming            | Surrounding whitespace removed                     | `server/tests/lab-02/ticket-validation.unit.test.ts`     | Planned |
| UNIT-06 | Unit | BR-16, AC-08        | Description minimum boundary    | 9 chars invalid; 10 chars valid                    | `server/tests/lab-02/ticket-validation.unit.test.ts`     | Planned |
| UNIT-07 | Unit | BR-16, AC-08        | Description maximum boundary    | 5000 chars valid; 5001 invalid                     | `server/tests/lab-02/ticket-validation.unit.test.ts`     | Planned |
| UNIT-08 | Unit | BR-18               | Requested Priority validation   | LOW, MEDIUM, HIGH accepted; unknown value rejected | `server/tests/lab-02/ticket-validation.unit.test.ts`     | Planned |
| UNIT-09 | Unit | BR-52, AC-20, AC-21 | Attachment type validation      | JPG/JPEG, PNG, WEBP, PDF accepted                  | `server/tests/lab-02/attachment-validation.unit.test.ts` | Planned |
| UNIT-10 | Unit | BR-53, AC-22        | Attachment size boundary        | Exactly 5 MB accepted; over 5 MB rejected          | `server/tests/lab-02/attachment-validation.unit.test.ts` | Planned |
| UNIT-11 | Unit | BR-61, AC-25        | Removal reason validation       | 3–200 trimmed characters accepted                  | `server/tests/lab-02/attachment-validation.unit.test.ts` | Planned |
| UNIT-12 | Unit | BR-61               | Removal reason boundaries       | 2 chars invalid; 3 valid; 200 valid; 201 invalid   | `server/tests/lab-02/attachment-validation.unit.test.ts` | Planned |

---

# 5. Development Requester API Tests

| Test ID | Type | Requirement / AC    | What It Tests                          | Expected Result                           | Automated Test File                                 | Final   |
| ------- | ---- | ------------------- | -------------------------------------- | ----------------------------------------- | --------------------------------------------------- | ------- |
| API-01  | API  | FR-02, AC-03        | Retrieve active Development Requesters | `200`; active Requesters returned         | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-02  | API  | BR-22, BR-23, AC-03 | Inactive Requester exclusion           | Inactive Requester does not appear        | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-03  | API  | BR-27               | Missing Requester context              | Requester-specific endpoint returns `400` | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-04  | API  | BR-27               | Invalid Requester ID                   | `400`; safe requester-context error       | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-05  | API  | BR-27               | Inactive Requester manually supplied   | Request rejected                          | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-06  | API  | AC-35               | Requester API unexpected failure       | Safe `500`; internal details hidden       | `server/tests/lab-02/requester-context.api.test.ts` | Planned |

---

# 6. Reference Data API Tests

| Test ID | Type | Requirement / AC  | What It Tests                   | Expected Result                               | Automated Test File                              | Final   |
| ------- | ---- | ----------------- | ------------------------------- | --------------------------------------------- | ------------------------------------------------ | ------- |
| API-07  | API  | FR-08             | Retrieve active Categories      | `200`; required active Categories returned    | `server/tests/lab-02/reference-data.api.test.ts` | Planned |
| API-08  | API  | FR-08             | Retrieve active Related Systems | `200`; active Related Systems returned        | `server/tests/lab-02/reference-data.api.test.ts` | Planned |
| API-09  | API  | Data Requirements | Category seed idempotency       | Re-running seed does not duplicate Categories | `server/tests/lab-02/reference-data.api.test.ts` | Planned |
| API-10  | API  | Data Requirements | Requester seed idempotency      | Re-running seed does not duplicate Requesters | `server/tests/lab-02/reference-data.api.test.ts` | Planned |

---

# 7. Create Ticket API Tests

| Test ID | Type | Requirement / AC | What It Tests                          | Expected Result                                 | Automated Test File                             | Final   |
| ------- | ---- | ---------------- | -------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ------- |
| API-11  | API  | AC-01            | Create valid Ticket                    | `201`; exactly one Ticket saved                 | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-12  | API  | BR-01, AC-01     | Ticket Number generated by backend     | Response contains official unique Ticket Number | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-13  | API  | BR-02            | Initial Ticket status                  | Saved Ticket has `NEW` status                   | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-14  | API  | AC-04            | Requester ownership during creation    | Saved `requesterId` matches selected Requester  | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-15  | API  | BR-05            | Request body cannot override Requester | Ticket owner comes from requester context       | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-16  | API  | AC-08            | Missing Summary                        | `400`; Ticket not created                       | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-17  | API  | AC-08            | Missing Description                    | `400`; Ticket not created                       | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-18  | API  | BR-09            | Missing Category                       | `400`; field validation returned                | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-19  | API  | BR-10            | Missing Related System                 | `400`; field validation returned                | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-20  | API  | BR-17            | Missing Requested Priority             | `400`                                           | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-21  | API  | BR-18            | Invalid Requested Priority             | `400`                                           | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-22  | API  | AC-09            | Summary trimming during creation       | Trimmed Summary stored                          | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-23  | API  | AC-10            | Description trimming during creation   | Trimmed Description stored                      | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-24  | API  | BR-09            | Invalid/inactive Category              | `400`; Ticket not created                       | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-25  | API  | BR-10            | Invalid/inactive Related System        | `400`; Ticket not created                       | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-26  | API  | AC-13            | Duplicate submission ID                | Only one Ticket exists                          | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-27  | API  | AC-13            | Retry successful submission            | Existing Ticket returned; no duplicate          | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-28  | API  | BR-51            | Unexpected server failure              | Safe `500`; no stack trace exposed              | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |

---

# 8. My Tickets API Tests

| Test ID | Type | Requirement / AC | What It Tests                      | Expected Result                               | Automated Test File                          | Final   |
| ------- | ---- | ---------------- | ---------------------------------- | --------------------------------------------- | -------------------------------------------- | ------- |
| API-29  | API  | AC-06            | Requester-owned Ticket list        | Only selected Requester's Tickets returned    | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-30  | API  | AC-14            | Search Ticket Number               | Matching owned Tickets returned               | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-31  | API  | AC-14            | Search Summary                     | Matching owned Tickets returned               | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-32  | API  | BR-34            | Search whitespace trimming         | Search works after trimming input             | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-33  | API  | AC-15            | Category filter                    | Only matching Category Tickets returned       | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-34  | API  | BR-36            | Related System filter              | Only matching Related System Tickets returned | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-35  | API  | BR-37            | Priority filter                    | Only matching priority Tickets returned       | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-36  | API  | BR-38            | Status filter                      | Only matching status Tickets returned         | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-37  | API  | AC-16            | Sort by updated date               | Correct ordered result returned               | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-38  | API  | AC-16            | Sort by Ticket Number              | Correct ordered result returned               | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-39  | API  | AC-16            | Deterministic secondary sorting    | Equal primary values produce stable ordering  | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-40  | API  | AC-17            | Default pagination                 | Page 1; size 10                               | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-41  | API  | AC-17            | Subsequent page                    | Correct subset and metadata returned          | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-42  | API  | BR-44            | Valid page sizes                   | 10, 20, 50 accepted                           | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-43  | API  | BR-45            | Invalid page number                | `400`                                         | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-44  | API  | BR-45            | Invalid page size                  | `400`                                         | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-45  | API  | BR-45            | Invalid sort parameter             | `400`                                         | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-46  | API  | AC-18            | Requester owns no Tickets          | `200`; empty items and zero metadata          | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-47  | API  | AC-19            | Search/filter returns zero matches | `200`; empty items                            | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |

---

# 9. Ticket Detail API Tests

| Test ID | Type | Requirement / AC | What It Tests                       | Expected Result                                        | Automated Test File                             | Final   |
| ------- | ---- | ---------------- | ----------------------------------- | ------------------------------------------------------ | ----------------------------------------------- | ------- |
| API-48  | API  | FR-24            | Retrieve owned Ticket               | `200`; correct Ticket returned                         | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-49  | API  | AC-05            | Retrieve another Requester's Ticket | `404`; no Ticket data returned                         | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-50  | API  | BR-30            | Ownership privacy                   | Response does not reveal whether foreign Ticket exists | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-51  | API  | FR-24            | Missing Ticket                      | `404` safe response                                    | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |

---

# 10. Attachment API Tests

| Test ID | Type | Requirement / AC | What It Tests                           | Expected Result                                   | Automated Test File                           | Final   |
| ------- | ---- | ---------------- | --------------------------------------- | ------------------------------------------------- | --------------------------------------------- | ------- |
| API-52  | API  | AC-20            | Upload valid JPG                        | `201`; Attachment stored                          | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-53  | API  | AC-20            | Upload valid PNG                        | `201`                                             | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-54  | API  | AC-20            | Upload valid WEBP                       | `201`                                             | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-55  | API  | AC-20            | Upload valid PDF                        | `201`                                             | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-56  | API  | AC-21            | Unsupported file type                   | `415`                                             | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-57  | API  | AC-21            | Extension/MIME mismatch                 | Invalid file rejected                             | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-58  | API  | AC-22            | Attachment over 5 MB                    | `413`                                             | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-59  | API  | AC-22            | Attachment exactly 5 MB                 | Upload accepted                                   | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-60  | API  | AC-23            | Five active Attachments                 | Five permitted                                    | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-61  | API  | AC-23            | Sixth active Attachment                 | `409`; upload rejected                            | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-62  | API  | BR-55            | Removed file excluded from active count | New upload permitted after removal                | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-63  | API  | BR-62, BR-64     | Safe storage filename                   | User filename does not become raw storage path    | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-64  | API  | BR-62            | Path traversal filename                 | Unsafe path components do not control destination | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-65  | API  | AC-26            | Retrieve active and removed metadata    | Both metadata records returned                    | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-66  | API  | AC-24            | Download active Attachment              | `200`; correct file returned                      | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-67  | API  | AC-28            | Download another Requester's Attachment | `404`                                             | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-68  | API  | AC-25            | Soft-remove active Attachment           | Metadata updated; DB row remains                  | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-69  | API  | AC-25            | Removal reason trimmed/stored           | Trimmed reason persisted                          | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-70  | API  | BR-61            | Invalid removal reason                  | `400`; Attachment remains active                  | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-71  | API  | AC-26            | Removed metadata retained               | Filename, timestamp, reason still available       | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-72  | API  | AC-27            | Download removed Attachment             | `404`; file blocked                               | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-73  | API  | BR-59            | Preview/access removed file             | File content unavailable                          | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-74  | API  | AC-28            | Remove another Requester's Attachment   | `404`; unchanged                                  | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-75  | API  | BR-51            | Unexpected upload failure               | Safe error; internal storage path hidden          | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-76  | API  | AC-29            | Ticket survives Attachment failure      | Ticket remains saved when file upload fails       | `server/tests/lab-02/attachments.api.test.ts` | Planned |

---

# 11. Development Requester UI Tests

| Test ID | Type | Requirement / AC | What It Tests                     | Expected Result                                   | Automated Test File                                              | Final   |
| ------- | ---- | ---------------- | --------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- | ------- |
| UI-01   | UI   | AC-02            | Protected route without Requester | Selection screen shown                            | `client/src/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Planned |
| UI-02   | UI   | AC-03            | Active Requester dropdown         | Returned active Requesters displayed              | `client/src/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Planned |
| UI-03   | UI   | BR-23            | Inactive Requester not displayed  | Inactive name absent                              | `client/src/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Planned |
| UI-04   | UI   | AC-33            | Loading Requesters                | Explicit loading state; Continue disabled         | `client/src/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Planned |
| UI-05   | UI   | AC-34            | No active Requesters              | Empty state; Continue unavailable                 | `client/src/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Planned |
| UI-06   | UI   | AC-35            | Requester API failure             | Safe failure message shown                        | `client/src/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Planned |
| UI-07   | UI   | FR-03            | Continue after selection          | Selected Requester context stored and app entered | `client/src/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Planned |
| UI-08   | UI   | FR-04            | Current Requester display         | Selected name appears in shell                    | `client/src/tests/lab-02/AppShell.test.tsx`                      | Planned |
| UI-09   | UI   | FR-05, AC-07     | Change Requester action           | Action available and context can change           | `client/src/tests/lab-02/AppShell.test.tsx`                      | Planned |

---

# 12. Create Ticket UI Tests

| Test ID | Type | Requirement / AC    | What It Tests                 | Expected Result                                 | Automated Test File                             | Final   |
| ------- | ---- | ------------------- | ----------------------------- | ----------------------------------------------- | ----------------------------------------------- | ------- |
| UI-10   | UI   | FR-08               | Required Create Ticket fields | All required fields rendered                    | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-11   | UI   | BR-06, BR-07, BR-08 | Read-only fields              | Ticket Number, date, Requester not editable     | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-12   | UI   | AC-08               | Submit empty form             | Field-level messages appear; API not called     | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-13   | UI   | AC-32               | Required markers              | Required labels contain `*`                     | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-14   | UI   | BR-19               | Default Requested Priority    | Medium selected initially                       | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-15   | UI   | FR-14, AC-11        | Submit busy state             | `Submitting…`; button disabled                  | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-16   | UI   | AC-01               | Successful submission         | Official Ticket Number displayed                | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-17   | UI   | AC-12               | API submission failure        | Error displayed; entered values remain          | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-18   | UI   | AC-20               | Valid Attachment selection    | Valid filename displayed as ready               | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-19   | UI   | AC-21               | Invalid Attachment type       | File-level error shown                          | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-20   | UI   | AC-22               | Oversized Attachment          | File-level size error shown                     | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-21   | UI   | AC-29               | Partial Attachment failure    | Ticket success retained; failed file identified | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-22   | UI   | UI Spec             | Reference data loading        | Category/System controls show loading behavior  | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-23   | UI   | UI Spec             | Reference data failure        | Safe section failure displayed                  | `client/src/tests/lab-02/CreateTicket.test.tsx` | Planned |

---

# 13. My Tickets UI Tests

| Test ID | Type | Requirement / AC | What It Tests          | Expected Result                                | Automated Test File                          | Final   |
| ------- | ---- | ---------------- | ---------------------- | ---------------------------------------------- | -------------------------------------------- | ------- |
| UI-24   | UI   | AC-06            | Ticket list render     | Selected Requester's Tickets displayed         | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-25   | UI   | AC-14            | Search interaction     | Search parameter submitted/used correctly      | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-26   | UI   | AC-15            | Filter interaction     | Selected filter affects Ticket query           | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-27   | UI   | AC-16            | Sort interaction       | Selected sort/order applied                    | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-28   | UI   | AC-17            | Pagination controls    | Next/Previous/page controls function           | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-29   | UI   | AC-18            | Empty Ticket list      | True empty state shown                         | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-30   | UI   | AC-19            | No matching results    | No-results state shown                         | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-31   | UI   | FR-36            | Loading My Tickets     | Loading state displayed                        | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-32   | UI   | FR-36            | My Tickets API failure | Safe failure + retry where provided            | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-33   | UI   | AC-07            | Requester switch       | Old Requester's data removed before new result | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-34   | UI   | UI Spec          | Clear Filters          | Search and filters reset                       | `client/src/tests/lab-02/MyTickets.test.tsx` | Planned |

---

# 14. Ticket Detail UI Tests

| Test ID | Type | Requirement / AC | What It Tests                | Expected Result                               | Automated Test File                                      | Final   |
| ------- | ---- | ---------------- | ---------------------------- | --------------------------------------------- | -------------------------------------------------------- | ------- |
| UI-35   | UI   | FR-25            | Ticket information read-only | No editable Ticket fields                     | `client/src/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| UI-36   | UI   | Scope            | Later-lab controls excluded  | Comments/status/Actions Taken controls absent | `client/src/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| UI-37   | UI   | FR-24            | Ticket Detail loading        | Loading state displayed                       | `client/src/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| UI-38   | UI   | AC-05            | Inaccessible Ticket          | Safe not-found/failure state displayed        | `client/src/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |

---

# 15. Attachment UI Tests

| Test ID | Type | Requirement / AC | What It Tests               | Expected Result                            | Automated Test File                                  | Final   |
| ------- | ---- | ---------------- | --------------------------- | ------------------------------------------ | ---------------------------------------------------- | ------- |
| UI-39   | UI   | AC-20            | Active Attachment display   | Filename, size, Download, Remove shown     | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-40   | UI   | AC-24            | Download action             | Active Attachment download available       | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-41   | UI   | BR-60, AC-25     | Removal confirmation        | Confirmation shown before removal          | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-42   | UI   | BR-61, AC-25     | Removal reason required     | Invalid reason prevents request            | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-43   | UI   | AC-26            | Removed Attachment metadata | Removed state, reason, date remain visible | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-44   | UI   | AC-27            | Removed Attachment controls | Download/preview unavailable               | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-45   | UI   | UI Spec          | Upload busy state           | `Uploading…`; duplicate upload blocked     | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-46   | UI   | UI Spec          | Attachment upload failure   | File-specific safe error displayed         | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Planned |

---

# 16. UI Style Tests

| Test ID  | Type     | Requirement / AC | What It Tests                    | Expected Result                                     | Automated Test File                         | Final   |
| -------- | -------- | ---------------- | -------------------------------- | --------------------------------------------------- | ------------------------------------------- | ------- |
| STYLE-01 | UI Style | FR-35            | Primary Zen Green usage          | Primary actions/header use approved primary styling | `client/src/tests/lab-02/ui-style.test.tsx` | Planned |
| STYLE-02 | UI Style | UI Spec          | Editable/read-only distinction   | Different required classes/states exist             | `client/src/tests/lab-02/ui-style.test.tsx` | Planned |
| STYLE-03 | UI Style | AC-32            | Required marker and error styles | Asterisk and message both present                   | `client/src/tests/lab-02/ui-style.test.tsx` | Planned |
| STYLE-04 | UI Style | AC-31            | Focus behavior                   | Focusable controls retain focus styling/class       | `client/src/tests/lab-02/ui-style.test.tsx` | Planned |
| STYLE-05 | UI Style | UI Spec          | Active page navigation           | Active page has visible state                       | `client/src/tests/lab-02/ui-style.test.tsx` | Planned |
| STYLE-06 | UI Style | UI Spec          | Badge consistency                | Priority/status badges contain text labels          | `client/src/tests/lab-02/ui-style.test.tsx` | Planned |
| STYLE-07 | UI Style | FR-14            | Busy button                      | Busy state visibly distinct and disabled            | `client/src/tests/lab-02/ui-style.test.tsx` | Planned |
| STYLE-08 | UI Style | UI Spec          | Destructive Attachment action    | Removal action uses destructive presentation        | `client/src/tests/lab-02/ui-style.test.tsx` | Planned |

---

# 17. Responsive Tests

Responsive automated checks and Playwright screenshots shall cover three viewport classes required by the Lab 2 specification.

Recommended test viewports:

```text
Desktop: 1440 × 900
Tablet:  834 × 1112
Mobile:  390 × 844
```

| Test ID | Type       | Requirement / AC | What It Tests                       | Expected Result                                          | Automated Test File                        | Final   |
| ------- | ---------- | ---------------- | ----------------------------------- | -------------------------------------------------------- | ------------------------------------------ | ------- |
| RESP-01 | Responsive | AC-30            | Create Ticket desktop               | Multi-column layout; no overflow                         | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| RESP-02 | Responsive | AC-30            | Create Ticket tablet                | Two-column where practical; readable                     | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| RESP-03 | Responsive | AC-30            | Create Ticket mobile                | Vertically stacked; no horizontal scroll                 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| RESP-04 | Responsive | AC-30            | My Tickets desktop                  | Readable table                                           | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| RESP-05 | Responsive | AC-30            | My Tickets tablet                   | Controls remain usable                                   | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| RESP-06 | Responsive | AC-30            | My Tickets mobile                   | Ticket cards displayed; no forced table scroll           | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| RESP-07 | Responsive | AC-30            | Ticket Detail desktop/tablet/mobile | Information and Attachment controls remain usable        | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| RESP-08 | Responsive | UI Spec          | Long Attachment filename            | Filename does not break layout                           | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| RESP-09 | Responsive | AC-30            | Horizontal overflow                 | Page `scrollWidth` does not exceed viewport unexpectedly | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

# 18. End-to-End Tests

| Test ID | Type | Requirement / AC    | What It Tests                         | Expected Result                                    | Automated Test File                        | Final   |
| ------- | ---- | ------------------- | ------------------------------------- | -------------------------------------------------- | ------------------------------------------ | ------- |
| E2E-01  | E2E  | AC-01, AC-04        | Select Requester → create Ticket      | Success displays official number and correct owner | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02  | E2E  | AC-01, AC-06        | Create Ticket → find in My Tickets    | Newly created Ticket appears                       | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-03  | E2E  | AC-06               | My Tickets → Ticket Detail            | Owned Ticket opens successfully                    | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-04  | E2E  | AC-07               | Requester A → Requester B             | A's Tickets disappear; B's Tickets appear          | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-05  | E2E  | AC-05               | Direct foreign Ticket URL             | Access rejected                                    | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-06  | E2E  | AC-14, AC-15        | Search and filter Tickets             | Correct Requester-owned results shown              | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-07  | E2E  | AC-16, AC-17        | Sort and paginate                     | Requested order/page displayed                     | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-08  | E2E  | AC-18               | Requester with no Tickets             | Empty state shown                                  | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-09  | E2E  | AC-19               | Search with no matches                | No-results state shown                             | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-10  | E2E  | AC-20, AC-24        | Add and download Attachment           | File added and active download works               | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-11  | E2E  | AC-25, AC-26, AC-27 | Soft-remove Attachment                | Reason stored, metadata retained, download blocked | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-12  | E2E  | AC-28               | Direct foreign Attachment access      | Request rejected                                   | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-13  | E2E  | AC-08               | Invalid Ticket submission             | Field errors visible; no Ticket created            | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-14  | E2E  | AC-21, AC-22        | Valid + invalid Attachment selection  | Valid file retained; invalid file identified       | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-15  | E2E  | AC-12               | Simulated backend failure             | Safe error; form values preserved                  | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-16  | E2E  | AC-30               | Desktop/tablet/mobile workflows       | Required screens usable at all viewports           | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-17  | E2E  | AC-31, AC-32        | Keyboard and validation accessibility | Focus visible; labels/errors accessible            | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

# 19. Acceptance-Criterion Traceability

Every Acceptance Criterion must map to at least one planned test.

| AC    | Description Summary                       | Planned Test Evidence                                          |
| ----- | ----------------------------------------- | -------------------------------------------------------------- |
| AC-01 | Valid Ticket creation                     | API-11, API-12, E2E-01, E2E-02                                 |
| AC-02 | No Requester redirects/shows selector     | UI-01                                                          |
| AC-03 | Only active Requesters                    | API-01, API-02, UI-02, UI-03                                   |
| AC-04 | Ticket saved with selected Requester      | API-14, E2E-01                                                 |
| AC-05 | Cross-Requester Ticket blocked            | API-49, API-50, UI-38, E2E-05                                  |
| AC-06 | My Tickets contains only owned Tickets    | API-29, UI-24, E2E-02, E2E-03                                  |
| AC-07 | Requester switching reloads data          | UI-09, UI-33, E2E-04                                           |
| AC-08 | Invalid Ticket submission                 | UNIT-03, UNIT-04, UNIT-06, UNIT-07, API-16–21, UI-12, E2E-13   |
| AC-09 | Summary trimming                          | UNIT-02, API-22                                                |
| AC-10 | Description trimming                      | UNIT-05, API-23                                                |
| AC-11 | Submit busy/disabled                      | UI-15                                                          |
| AC-12 | Failure preserves entered values          | UI-17, E2E-15                                                  |
| AC-13 | Duplicate submission prevented            | API-26, API-27                                                 |
| AC-14 | Search                                    | API-30, API-31, UI-25, E2E-06                                  |
| AC-15 | Filtering                                 | API-33, UI-26, E2E-06                                          |
| AC-16 | Sorting                                   | API-37, API-38, API-39, UI-27, E2E-07                          |
| AC-17 | Pagination                                | API-40, API-41, API-42, UI-28, E2E-07                          |
| AC-18 | Empty My Tickets state                    | API-46, UI-29, E2E-08                                          |
| AC-19 | No-results state                          | API-47, UI-30, E2E-09                                          |
| AC-20 | Valid Attachment upload                   | UNIT-09, API-52–55, UI-18, UI-39, E2E-10                       |
| AC-21 | Unsupported Attachment rejected           | UNIT-09, API-56, API-57, UI-19, E2E-14                         |
| AC-22 | Oversized Attachment rejected             | UNIT-10, API-58, API-59, UI-20, E2E-14                         |
| AC-23 | Five-active-Attachment limit              | API-60, API-61, API-62                                         |
| AC-24 | Active Attachment download                | API-66, UI-40, E2E-10                                          |
| AC-25 | Soft removal with reason                  | UNIT-11, UNIT-12, API-68, API-69, API-70, UI-41, UI-42, E2E-11 |
| AC-26 | Removed metadata retained                 | API-65, API-71, UI-43, E2E-11                                  |
| AC-27 | Removed download/preview blocked          | API-72, API-73, UI-44, E2E-11                                  |
| AC-28 | Cross-Requester Attachment blocked        | API-67, API-74, E2E-12                                         |
| AC-29 | Ticket retained after Attachment failure  | API-76, UI-21                                                  |
| AC-30 | Responsive behavior                       | RESP-01–09, E2E-16                                             |
| AC-31 | Keyboard accessibility/focus              | STYLE-04, E2E-17                                               |
| AC-32 | Required markers and non-color validation | UI-13, STYLE-03, E2E-17                                        |
| AC-33 | Requester loading state                   | UI-04                                                          |
| AC-34 | No active Requesters state                | UI-05                                                          |
| AC-35 | Requester API failure state               | API-06, UI-06                                                  |

---

# 20. Business-Rule Test Traceability

Important Business Rules are additionally covered as follows.

| Business Rule Area               | Evidence                                               |
| -------------------------------- | ------------------------------------------------------ |
| Backend Ticket Number generation | UNIT-01, API-12                                        |
| New status default               | API-13                                                 |
| Requester context                | API-01–06, UI-01–09                                    |
| Ownership protection             | API-29, API-49, API-50, API-67, API-74, E2E-05, E2E-12 |
| Summary validation               | UNIT-02–04, API-16, API-22                             |
| Description validation           | UNIT-05–07, API-17, API-23                             |
| Requested Priority               | UNIT-08, API-20, API-21                                |
| Search                           | API-30–32                                              |
| Filters                          | API-33–36                                              |
| Sorting                          | API-37–39                                              |
| Pagination                       | API-40–45                                              |
| Duplicate submission             | API-26, API-27                                         |
| Safe server errors               | API-06, API-28, API-75                                 |
| Attachment type/size             | UNIT-09, UNIT-10, API-52–59                            |
| Five active Attachments          | API-60–62                                              |
| Safe filename/storage            | API-63, API-64                                         |
| Soft removal                     | API-68–74                                              |
| Partial Attachment failure       | API-76, UI-21                                          |
| Responsive UI                    | RESP-01–09                                             |
| Accessibility                    | STYLE-03, STYLE-04, E2E-17                             |

---

# 21. Responsive and Visual Checklist

The following checklist shall be completed during final visual inspection.

## Zen Green Theme

* [ ] Primary Green `#006B3C` is used for primary actions and strong emphasis.
* [ ] Secondary Green `#0B7A46` is used consistently for active/focus accents.
* [ ] Pale Green `#EAF6EF` is used for subtle selected/success states.
* [ ] Main page background is near-white.
* [ ] Cards use white surfaces with restrained borders/shadows.
* [ ] UI remains recognizably consistent with the Zen Green specification.

## Application Shell

* [ ] TokTickIT identity is clearly visible.
* [ ] My Tickets navigation exists.
* [ ] Create Ticket navigation exists.
* [ ] Active page is visibly indicated.
* [ ] Current Requester is displayed.
* [ ] Change Requester is accessible.
* [ ] Mobile navigation remains usable.

## Development Requester Selection

* [ ] Screen states that this is for Lab 2 testing only.
* [ ] Dropdown is labelled.
* [ ] Only active Requesters appear.
* [ ] Continue is disabled before selection.
* [ ] Loading state is clear.
* [ ] Empty state is clear.
* [ ] Failure state is clear.

## Form Fields

* [ ] Labels appear above controls.
* [ ] Required fields display a red asterisk.
* [ ] Required asterisk does not replace validation text.
* [ ] Editable fields use consistent white styling.
* [ ] Read-only fields are visibly different.
* [ ] Invalid fields have clear border/message.
* [ ] Validation appears near affected fields.
* [ ] Disabled controls are visibly disabled.
* [ ] Focus state remains visible.

## Create Ticket

* [ ] Ticket Number is visibly read-only.
* [ ] Ticket Date is visibly read-only.
* [ ] Requester is visibly read-only.
* [ ] Category is usable.
* [ ] Related System is usable.
* [ ] Summary has sufficient width.
* [ ] Description has sufficient height.
* [ ] Attachment restrictions are visible.
* [ ] Submit is clearly primary.
* [ ] Busy state is clearly visible.
* [ ] Success state prominently displays Ticket Number.
* [ ] API failure preserves entered form values.

## My Tickets

* [ ] Desktop Ticket table is readable.
* [ ] Mobile Ticket cards are readable.
* [ ] Search is usable.
* [ ] Filters are usable.
* [ ] Sorting is understandable.
* [ ] Clear Filters is available.
* [ ] Pagination is usable.
* [ ] Empty state is understandable.
* [ ] No-results state differs from empty state.
* [ ] Create Ticket action is visible.

## Ticket Detail

* [ ] Ticket information is read-only.
* [ ] Ticket information is separated from Attachment actions.
* [ ] Public Comments are absent.
* [ ] Internal Notes are absent.
* [ ] Actions Taken are absent.
* [ ] Status-change controls are absent.
* [ ] Active Attachment controls are clear.
* [ ] Removed Attachment state is clear.

## Attachment States

* [ ] Active Attachment shows filename.
* [ ] Active Attachment shows Download.
* [ ] Active Attachment shows Remove.
* [ ] Uploading state is visible.
* [ ] Invalid-file state is visible.
* [ ] Upload failure is visible.
* [ ] Removed Attachment metadata remains readable.
* [ ] Removed reason remains readable.
* [ ] Removed Download is unavailable.

## Desktop ≥ 992 px

* [ ] Multi-column layout works where specified.
* [ ] Content is centered.
* [ ] No clipped labels.
* [ ] No overlapping controls.
* [ ] No unintended horizontal scrolling.

## Tablet 768–991 px

* [ ] Two-column layout works where practical.
* [ ] Summary remains readable.
* [ ] Description remains usable.
* [ ] Search/filter controls wrap correctly.
* [ ] No overlapping messages.
* [ ] No unintended horizontal scrolling.

## Mobile < 768 px

* [ ] Fields stack vertically.
* [ ] Ticket list uses mobile cards or equivalent.
* [ ] Buttons remain touch-friendly.
* [ ] Filters remain usable.
* [ ] Attachment names do not break layout.
* [ ] No hidden buttons.
* [ ] No unintended horizontal page scrolling.

## Accessibility

* [ ] All controls have labels.
* [ ] Placeholder text is not the only label.
* [ ] Keyboard tab order is logical.
* [ ] Focus is visibly indicated.
* [ ] Errors do not rely on color alone.
* [ ] Priority/status does not rely on color alone.
* [ ] Icon-only controls, if present, have accessible names.
* [ ] Disabled controls cannot be activated.

---

# 22. Required Screenshot Evidence

Playwright and/or manual evidence shall be stored under:

```text
artifacts/lab-02/screenshots/
```

Required groups:

```text
artifacts/lab-02/screenshots/
├── requester-selection/
├── create-ticket/
├── my-tickets/
└── ticket-detail/
```

Important screenshots include:

### Development Requester Selection

* initial
* loaded dropdown
* loading
* failure
* empty if practical

### Create Ticket

* initial
* validation failure
* submitting
* success
* API failure
* invalid Attachment
* desktop
* tablet
* mobile

### My Tickets

* Requester A list
* Requester B list
* search
* filters
* sorting
* pagination
* empty
* no results
* desktop
* tablet
* mobile

### Ticket Detail

* owned Ticket
* active Attachment
* upload
* removal confirmation
* removed Attachment
* blocked removed download evidence
* unauthorized access evidence
* desktop
* tablet
* mobile

---

# 23. Test Data Requirements

Automated test data shall include at least:

## Requesters

* Requester A — active
* Requester B — active
* Requester C — active
* Requester D — active
* Requester Inactive — inactive

## Categories

* Account and Access
* Hardware
* Software
* Network

## Related Systems

At least:

* Email
* Campus Wi-Fi
* VPN
* LEB2 App
* Grade Submission App
* Printer
* Corporate Laptop

## Tickets

Test data shall include:

* Tickets owned by Requester A
* Tickets owned by Requester B
* multiple Categories
* multiple Related Systems
* multiple Requested Priorities
* enough Tickets to test pagination
* search matches
* search non-matches

## Attachments

Test fixtures should include:

* valid JPG/JPEG
* valid PNG
* valid WEBP
* valid PDF
* invalid extension
* oversized file
* file with unusual/suspicious filename
* active Attachment
* removed Attachment

---

# 24. Test Isolation

Tests shall avoid depending on execution order.

Each test or test suite shall:

* create required data;
* reset or isolate relevant test database state;
* avoid relying on manually seeded development Tickets unless explicitly testing seed data; and
* remove temporary uploaded files after execution where practical.

A failure in one test shall not cause unrelated tests to fail because of leftover data.

---

# 25. TDD Workflow

For implementation Issues, the intended workflow is:

```text
1. Read specification.md.
2. Read api-spec.md.
3. Read ui-spec.md.
4. Read this tests.md.
5. Select the tests associated with the current Issue.
6. Implement failing tests first where practical.
7. Confirm failure is for the expected missing behavior.
8. Implement the smallest correct feature.
9. Re-run tests until green.
10. Refactor without breaking tests.
11. Update Final status in tests.md.
12. Commit and open PR.
```

The coding agent shall not declare an Issue complete solely because the UI appears to work manually.

---

# 26. Planned Test Commands

The exact commands shall follow the package scripts already used by the repository.

Before final submission, replace or confirm the commands below against the actual Lab 1 project scripts.

## Server Unit/API Tests

From the server project directory, use the repository's configured test command.

Typical form:

```bash
npm test
```

or the project's equivalent test script.

Specific Lab 2 tests should also be runnable independently where supported.

Example:

```bash
npm test -- lab-02
```

## Client Component/UI Tests

From the client project directory:

```bash
npm test
```

or the project's configured equivalent.

## End-to-End Tests

Using the repository's Playwright configuration:

```bash
npx playwright test e2e/lab-02/requester-ticket-flow.spec.ts
```

## Playwright Report

If configured:

```bash
npx playwright show-report
```

## Full Test Run

The final README and this document shall record the exact verified commands used to run:

1. server unit tests;
2. server API/integration tests;
3. client UI tests; and
4. E2E tests.

---

# 27. Final Test Results

This section must be updated after implementation.

Do not mark tests as Pass before they have actually run successfully.

Current planning status:

| Test Group                | Planned | Final Status    |
| ------------------------- | ------: | --------------- |
| Unit                      |      12 | Not implemented |
| Development Requester API |       6 | Not implemented |
| Reference Data API        |       4 | Not implemented |
| Create Ticket API         |      18 | Not implemented |
| My Tickets API            |      19 | Not implemented |
| Ticket Detail API         |       4 | Not implemented |
| Attachment API            |      25 | Not implemented |
| Development Requester UI  |       9 | Not implemented |
| Create Ticket UI          |      14 | Not implemented |
| My Tickets UI             |      11 | Not implemented |
| Ticket Detail UI          |       4 | Not implemented |
| Attachment UI             |       8 | Not implemented |
| UI Style                  |       8 | Not implemented |
| Responsive                |       9 | Not implemented |
| E2E                       |      17 | Not implemented |

Before final submission, update this section with:

* total passed;
* total failed;
* total skipped;
* screenshots of final passing output;
* actual commands used;
* date of final run; and
* final commit/branch tested.

Required final condition:

```text
Failed: 0
Skipped required tests: 0
```

---

# 28. Known Limitations or Deferred Tests

At the beginning of Lab 2, no required Lab 2 behavior is intentionally deferred.

The following features are outside the Lab 2 test scope because they are explicitly excluded from the sprint:

* real login/authentication;
* logout;
* passwords;
* sessions;
* authentication tokens;
* role-based authorization;
* IT Staff dashboard;
* Ticket claiming;
* Ticket reassignment;
* IT Priority modification;
* Public Comments;
* Internal Notes;
* Actions Taken;
* resolution workflow;
* closing Tickets;
* reopening Tickets;
* cancelling Tickets;
* administrator functions.

These exclusions shall not be reported as Lab 2 test failures.

If any required Lab 2 test must later be deferred because of a justified technical limitation, it shall be documented here before submission with:

* Test ID;
* reason;
* affected requirement/Acceptance Criterion;
* impact; and
* remediation plan.

A required test shall never be silently skipped.

---

# 29. Test Completion Checklist

Before Lab 2 is declared complete:

* [ ] All Unit tests pass.
* [ ] All API/integration tests pass.
* [ ] All UI component tests pass.
* [ ] All UI style tests pass.
* [ ] All responsive checks pass.
* [ ] All required E2E tests pass.
* [ ] Every AC has test evidence.
* [ ] No required test is skipped.
* [ ] No required test is disabled.
* [ ] No required test is commented out.
* [ ] Ownership tests pass.
* [ ] Multi-Requester tests pass.
* [ ] Validation boundary tests pass.
* [ ] Attachment lifecycle tests pass.
* [ ] Safe failure tests pass.
* [ ] Loading states are tested.
* [ ] Empty states are tested.
* [ ] No-results states are tested.
* [ ] Desktop screenshots exist.
* [ ] Tablet screenshots exist.
* [ ] Mobile screenshots exist.
* [ ] Visual checklist is complete.
* [ ] Actual test-file paths match this document.
* [ ] Actual test commands are documented.
* [ ] Final results are updated from `Not implemented` to real results.
* [ ] Final complete test run is performed on the final `main` branch.
