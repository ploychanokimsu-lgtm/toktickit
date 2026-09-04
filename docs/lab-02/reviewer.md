# Lab 2 Peer Review Record

## Student

Ploychanok Imsuwan

## Peer Reviewer

Kiatisakk - peer reviewer
Pimchaya Suprateravanit - peer reviewer
Natsumi Takagi - peer reviewer
Pow Wongtanakarn — peer reviewer


---

# 1. Review Process

Lab 2 development followed the required staged Git workflow.

Feature work was developed on separate branches and submitted through Pull Requests before integration into `lab2-staging`.

The peer reviewer checked implementation behavior, automated test results, ownership rules, UI behavior, and regression safety before approval.

The student reviewed the feedback, replied to review comments, made corrections where required, and merged approved work into `lab2-staging`.

---

# 2. Lab 2 Pull Requests

| PR | Work | Review Result |
|---|---|---|
| [#22 – Lab 2 Engineering Contract](/ploychanokimsu-lgtm/toktickit/pull/22) | Sprint specification and test planning | Reviewed and merged |
| [#23 – Lab 2 Database Models and Seed Data](/ploychanokimsu-lgtm/toktickit/pull/23) | Prisma models and seed data | Reviewed and merged |
| [#24 – Lab 2 Development Requester Context](/ploychanokimsu-lgtm/toktickit/pull/24) | Initial Development Requester work | Reviewed; workflow correction later required |
| [#25 – Lab 2 Development Requester Context](/ploychanokimsu-lgtm/toktickit/pull/25) | Requester-context workflow correction | Reviewed |
| [#26 – Restore Lab 2 Development Requester Context](/ploychanokimsu-lgtm/toktickit/pull/26) | Correct restoration into staging workflow | Reviewed and merged |
| [#27 – Lab 2 Zen Green UI Foundation](/ploychanokimsu-lgtm/toktickit/pull/27) | Reusable responsive UI foundation | Reviewed and merged |
| [#28 – Create Ticket](/ploychanokimsu-lgtm/toktickit/pull/28) | Create Ticket API and UI | Reviewed and merged |
| [#29 – Lab 2 My Tickets](/ploychanokimsu-lgtm/toktickit/pull/29) | Requester-owned Ticket list | Reviewed and merged |
| [#30 – Lab 2 Requester Ticket Detail](/ploychanokimsu-lgtm/toktickit/pull/30) | Read-only Ticket Detail | Reviewed and merged |
| [#31 – Lab 2 Attachment Lifecycle](/ploychanokimsu-lgtm/toktickit/pull/31) | Attachment lifecycle | Reviewed and merged |
| [#32 – Lab 2 Automated and E2E Testing](/ploychanokimsu-lgtm/toktickit/pull/32) | Playwright and responsive evidence | Reviewed and merged |

---

# 3. Selected Review Evidence

## Engineering Contract

### Reviewer Feedback

The engineering contract was reviewed for sprint scope, business rules, acceptance criteria, API decisions, UI behavior, test planning, and Definition of Done before feature implementation continued.

### Student Response

The specification documents were reviewed and approved as the working Lab 2 engineering contract before implementation.

---

## Database Models and Seed Data

### Reviewer Feedback

The database design was checked for Requester, Ticket, Attachment, Category, and Related System relationships, required seed data, repeatable seeding, constraints, and support for ownership.

### Student Response

The schema and seed data were verified and automated database behavior was checked before merge.

---

## Development Requester Context

### Reviewer Feedback

The Development Requester selector, active-user filtering, session persistence, switching behavior, API handling, and automated tests were reviewed.

### Student Response

The implementation and tests were rechecked. A Git workflow mistake involving the original Requester-context integration was corrected through dedicated corrective Pull Requests so the final `lab2-staging` history contained the intended implementation.

---

## Zen Green UI Foundation

### Reviewer Feedback

The reusable Zen Green styles were reviewed for consistency, responsive behavior, form presentation, validation states, loading/error states, and reusable UI classes.

### Student Response

The styling, responsive behavior, and UI-style tests were rechecked before merge.

---

## Create Ticket

### Reviewer Feedback

The Create Ticket workflow was reviewed for Development Requester data, database-loaded Category and Related System values, validation, backend-generated Ticket Number, default priority, New status, failure handling, and automated tests.

### Student Response

The API and UI behavior were rechecked, including validation, persistence, generated Ticket Number, Requester ownership, and test results.

---

## My Tickets

### Reviewer Feedback

Requester ownership enforcement, search, Category/Related System/Priority filters, sorting, pagination, loading, empty, no-results, and failure states were reviewed.

### Student Response

The Requester ownership behavior, search/filtering, sorting, pagination, responsive layout, and automated test suites were rechecked before merge.

---

## Requester Ticket Detail

### Reviewer Feedback

The Ticket Detail API was reviewed for backend Requester ownership, safe missing/non-owned Ticket behavior, read-only information, navigation, responsive presentation, and automated tests.

### Student Response

Ownership rules, displayed Ticket information, navigation, error handling, test suites, and builds were rechecked.

---

## Attachment Lifecycle

### Reviewer Feedback

Attachment upload, metadata retrieval, download, soft removal, removal reason, file-type validation, 5 MB limit, five-active-Attachment limit, Requester ownership, and removed-file protection were reviewed.

### Student Response

Upload, validation, download, soft-removal behavior, ownership checks, removed-file behavior, UI states, automated tests, and builds were rechecked.

---

## Automated and E2E Testing

### Reviewer Feedback

Playwright coverage was reviewed for Development Requester selection, Ticket creation, My Tickets, Ticket Detail, Attachment upload/download/removal, removed-file protection, Requester isolation, and responsive behavior.

### Student Response

All Playwright tests, responsive checks, screenshots, server tests, client tests, and builds were rechecked before merge.

---

# 4. Review Corrections

Peer review and testing resulted in several corrections during the sprint, including:

- correcting the Development Requester Git integration workflow;
- fixing TypeScript narrowing/build errors;
- correcting generated JavaScript build artifacts before commits;
- improving My Tickets ownership and pagination behavior;
- correcting Ticket Detail navigation;
- stabilizing database-heavy test execution;
- correcting Attachment UI/test integration;
- correcting Playwright file naming and asynchronous reference-data timing; and
- making responsive E2E selectors explicitly select the visible desktop or mobile Ticket layout.

These corrections were made before the corresponding work was considered complete.

---

# 5. Approval Summary

All Lab 2 feature increments were reviewed before final staged integration.

Final product areas reviewed:

- Engineering Contract
- Database Models and Seed Data
- Development Requester Context
- Zen Green UI Foundation
- Create Ticket
- My Tickets
- Requester Ticket Detail
- Attachment Lifecycle
- Automated and E2E Testing

The final release is eligible to proceed after documentation verification and the full regression test suite passes.