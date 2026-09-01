# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Lab 2 delivers the Requester-facing MVP of TokTickIT. A Development Requester can select a temporary testing identity, create an IT support ticket, upload permitted attachments, receive an official backend-generated Ticket Number, view and search their own tickets, open Ticket Detail, and manage permitted attachments.

The sprint also establishes the reusable Zen Green UI foundation, database structure, REST API behavior, ownership rules, responsive layouts, validation conventions, and automated test requirements that later TokTickIT sprints will extend.

The Development Requester mechanism is strictly a Lab 2 testing mechanism and is **not authentication**. Real authentication and role-based authorization will be introduced in Lab 3.

---

## 2. Stakeholder Request Interpretation

The IT department requires a usable Requester-facing ticketing application so end users can submit and review support requests.

For Lab 2, the application must simulate multiple Requesters before real authentication exists. The user must first choose an active Development Requester. That selected Requester becomes the current testing context used when creating tickets, viewing My Tickets, opening Ticket Detail, and managing attachments.

The application must protect Requester ownership at the backend so that changing URLs or API requests cannot expose another Requester's Ticket or Attachment.

The implementation must also establish a consistent, reusable, responsive Zen Green design system covering application navigation, forms, validation, loading states, error states, empty states, badges, ticket lists, Ticket Detail, and attachments.

---

## 3. Scope

### 3.1 Included

Lab 2 includes:

* Development Requester selection.
* Loading active Development Requesters from PostgreSQL.
* Switching the current Development Requester.
* Displaying the selected Requester in the application shell.
* Creating a new Ticket.
* Backend generation of the official Ticket Number.
* Automatic Ticket Date and Current Status.
* Selecting Category.
* Selecting Related System.
* Entering Ticket Summary.
* Selecting Requested Priority.
* Entering Description.
* Uploading permitted attachments.
* Attachment validation.
* Viewing My Tickets.
* Showing only Tickets belonging to the selected Requester.
* Searching Tickets.
* Filtering Tickets.
* Sorting Tickets.
* Paginating Tickets.
* Opening Requester Ticket Detail.
* Viewing Ticket information in read-only form.
* Viewing Attachment metadata.
* Adding an Attachment to an existing Ticket.
* Downloading an active Attachment.
* Soft-removing an Attachment.
* Recording a removal reason.
* Keeping metadata for removed Attachments.
* Blocking downloads or previews of removed Attachments.
* Ownership checks for Tickets and Attachments.
* Loading states.
* Empty states.
* No-results states.
* Validation states.
* Safe API failure states.
* Responsive desktop, tablet, and mobile layouts.
* Keyboard-accessible controls.
* Reusable Zen Green UI components.
* Automated unit, API/integration, UI, responsive, visual, and E2E testing.

### 3.2 Excluded

The following are explicitly outside Lab 2:

* Real authentication.
* Username/password login.
* Logout.
* Password hashing.
* Authentication sessions.
* Authentication tokens.
* Real authenticated identity.
* Role-based authorization.
* IT Staff dashboard.
* IT Staff queue.
* Ticket claiming.
* Ticket reassignment.
* IT Priority modification by IT Staff.
* Public Comments.
* Internal Notes.
* Actions Taken.
* Resolving Tickets.
* Closing Tickets.
* Reopening Tickets.
* Cancelling Tickets.
* Status transitions after initial creation.
* Administrator functions.
* User administration.
* Role administration.
* Reference-data administration.

---

## 4. Functional Requirements

### Development Requester Context

**FR-01**
The system shall provide a Development Requester Selection screen before Requester-specific Ticket screens may be used.

**FR-02**
The Development Requester Selection screen shall retrieve only active Development Requesters from PostgreSQL.

**FR-03**
The user shall be able to select one active Development Requester and continue into the application.

**FR-04**
The application shell shall display the currently selected Development Requester.

**FR-05**
The application shall provide a Change Requester action.

**FR-06**
Changing Requester shall reload Requester-specific Ticket data.

### Ticket Creation

**FR-07**
A selected Development Requester shall be able to open the Create Ticket screen.

**FR-08**
The Create Ticket screen shall display Ticket Number, Ticket Date, Requester, Category, Related System, Ticket Summary, Requested Priority, Description, and Attachments.

**FR-09**
The system shall validate required fields before submitting a Ticket.

**FR-10**
The backend shall validate Ticket input independently of frontend validation.

**FR-11**
The backend shall generate the official Ticket Number.

**FR-12**
A successfully created Ticket shall be associated with the currently selected Development Requester.

**FR-13**
The application shall display the official Ticket Number after successful creation.

**FR-14**
The Submit button shall show a busy state and prevent repeated activation while submission is processing.

**FR-15**
If Ticket submission fails, the application shall display a safe error message and preserve the Requester's entered values.

### My Tickets

**FR-16**
The selected Development Requester shall be able to view their own Tickets in My Tickets.

**FR-17**
The My Tickets API shall return only Tickets owned by the selected Development Requester.

**FR-18**
The user shall be able to search their Tickets.

**FR-19**
The user shall be able to filter their Tickets.

**FR-20**
The user shall be able to sort their Tickets.

**FR-21**
The Ticket list shall support pagination.

**FR-22**
The application shall provide separate empty-list and no-search-results states.

**FR-23**
A Ticket displayed in My Tickets shall provide a clear action for opening Ticket Detail.

### Ticket Detail

**FR-24**
The selected Development Requester shall be able to retrieve an owned Ticket's details.

**FR-25**
Ticket Detail fields shall be displayed as read-only information.

**FR-26**
The backend shall prevent a selected Requester from retrieving another Requester's Ticket.

### Attachments

**FR-27**
The Requester shall be able to upload permitted Attachments during Ticket creation.

**FR-28**
The Requester shall be able to add permitted Attachments to an existing owned Ticket.

**FR-29**
The Requester shall be able to retrieve Attachment metadata for an owned Ticket.

**FR-30**
The Requester shall be able to download an active Attachment belonging to an owned Ticket.

**FR-31**
The Requester shall be able to soft-remove an active Attachment belonging to an owned Ticket.

**FR-32**
The system shall retain metadata for a soft-removed Attachment.

**FR-33**
The system shall prevent removed Attachments from being downloaded or previewed.

**FR-34**
The backend shall prevent access to Attachments belonging to another Requester.

### UI and Responsive Behavior

**FR-35**
The application shall use reusable Zen Green UI components and design tokens.

**FR-36**
The application shall provide clear loading, validation, success, empty, no-results, and failure states.

**FR-37**
The application shall remain usable at desktop, tablet, and mobile viewport sizes.

**FR-38**
Interactive controls shall support keyboard navigation and visible focus indicators.

**FR-39**
Validation messages shall appear near the affected field.

**FR-40**
Required fields shall display a red asterisk in addition to their validation message.

---

## 5. Business Rules

### Ticket Rules

**BR-01**
The official Ticket Number shall be generated by the backend and shall be unique.

**BR-02**
Every new Ticket shall begin with Current Status `NEW`.

**BR-03**
Lab 2 shall use a Development Requester selector instead of authentication.

**BR-04**
The Development Requester identity is a testing mechanism only and shall not be represented as secure authentication.

**BR-05**
The Requester associated with a Ticket shall be determined from the current Development Requester context.

**BR-06**
Ticket Number shall be read-only in the UI.

**BR-07**
Ticket Date shall be generated by the backend and displayed as read-only.

**BR-08**
Requester shall be displayed as read-only on Create Ticket and Ticket Detail.

**BR-09**
Category is required.

**BR-10**
Related System is required.

**BR-11**
Ticket Summary is required.

**BR-12**
Ticket Summary shall be trimmed before validation and storage.

**BR-13**
Ticket Summary shall contain between 5 and 150 characters after trimming.

**BR-14**
Description is required.

**BR-15**
Description shall be trimmed before validation and storage.

**BR-16**
Description shall contain between 10 and 5,000 characters after trimming.

**BR-17**
Requested Priority is required.

**BR-18**
Requested Priority shall support `LOW`, `MEDIUM`, and `HIGH`.

**BR-19**
The default Requested Priority shall be `MEDIUM`.

**BR-20**
Current Status shall not be editable by the Requester.

**BR-21**
Lab 2 shall not provide Ticket status-transition controls.

### Development Requester Rules

**BR-22**
Only active Development Requesters shall appear in the Development Requester selector.

**BR-23**
An inactive Development Requester shall not be selectable through the normal UI.

**BR-24**
The selected Development Requester ID shall be stored in browser session storage so it survives a page refresh within the current browser tab but is not treated as a persistent login.

**BR-25**
Opening a Requester-specific route without a valid selected Requester shall redirect the user to Development Requester Selection.

**BR-26**
Changing Requester shall clear requester-specific list data currently displayed and reload data for the new Requester.

**BR-27**
A manually supplied invalid or inactive Development Requester context shall be rejected by the backend.

### Ownership Rules

**BR-28**
A Requester may view only Tickets that belong to that Requester.

**BR-29**
Ticket ownership shall be enforced by the backend, not only by frontend filtering.

**BR-30**
A Requester requesting another Requester's Ticket shall receive a safe not-found response that does not disclose whether the Ticket exists.

**BR-31**
Attachment ownership shall be derived through the Attachment's parent Ticket.

**BR-32**
A Requester shall not retrieve, download, upload to, or remove an Attachment associated with another Requester's Ticket.

### Search, Filter, Sort, and Pagination Rules

**BR-33**
Ticket search shall search at least Ticket Number and Ticket Summary.

**BR-34**
Search text shall be trimmed before use.

**BR-35**
My Tickets shall support filtering by Category.

**BR-36**
My Tickets shall support filtering by Related System.

**BR-37**
My Tickets shall support filtering by Requested Priority.

**BR-38**
My Tickets shall support filtering by Current Status.

**BR-39**
My Tickets shall support sorting by Ticket Number, Created Date, Last Updated, and Summary.

**BR-40**
The default Ticket-list sort shall be Last Updated descending.

**BR-41**
A deterministic secondary sort shall be applied using Ticket ID descending.

**BR-42**
Pagination shall use 1-based page numbers.

**BR-43**
The default page size shall be 10 Tickets.

**BR-44**
Permitted page sizes shall be 10, 20, and 50.

**BR-45**
Invalid pagination, filtering, or sorting parameters shall return a safe validation error rather than being silently accepted.

### Duplicate Submission and Failure Rules

**BR-46**
The frontend shall disable Ticket submission while a submission request is in progress.

**BR-47**
Each Create Ticket form submission shall use a client-generated submission identifier.

**BR-48**
The backend shall prevent duplicate Tickets from being created when the same submission identifier is retried.

**BR-49**
If a duplicate submission identifier is received after the original Ticket was successfully created, the backend shall return the existing Ticket rather than create another one.

**BR-50**
When Ticket creation fails, editable form values shall remain available to the Requester for correction or retry.

**BR-51**
Unexpected backend errors shall return a safe generic error response and shall not expose stack traces, database details, file-system paths, or secrets.

### Attachment Rules

**BR-52**
Permitted Attachment file types are JPG/JPEG, PNG, WEBP, and PDF.

**BR-53**
The maximum Attachment size shall be 5 MB per file.

**BR-54**
A Ticket shall contain no more than five active Attachments.

**BR-55**
Removed Attachments shall not count toward the five-active-Attachment limit.

**BR-56**
Attachment removal shall use soft removal; the Attachment database row shall not be physically deleted.

**BR-57**
A removed Attachment shall retain metadata including its original filename, removal timestamp, and removal reason.

**BR-58**
A removed Attachment shall remain visible in Ticket Detail as removed metadata.

**BR-59**
A removed Attachment shall not be downloadable or previewable.

**BR-60**
Removing an Attachment shall require confirmation.

**BR-61**
Removing an Attachment shall require a reason between 3 and 200 characters after trimming.

**BR-62**
Stored filenames shall not directly trust user-provided filenames.

**BR-63**
The application shall preserve the original filename separately for display.

**BR-64**
The backend shall generate a safe unique storage filename for each uploaded file.

**BR-65**
Both file extension and supported MIME type shall be validated.

**BR-66**
Invalid Attachments shall be rejected without invalidating otherwise valid Ticket form fields.

**BR-67**
Ticket creation and Attachment upload shall use a two-stage process: create the Ticket first, then upload selected Attachments.

**BR-68**
If Ticket creation succeeds but one or more Attachment uploads fail, the Ticket shall remain created.

**BR-69**
When an Attachment upload fails after Ticket creation, the UI shall identify the failed file and allow the Requester to retry by opening Ticket Detail.

### UI State Rules

**BR-70**
A Ticket list with zero Tickets before any search or filter is applied shall display an empty state.

**BR-71**
A Ticket list containing Tickets but returning zero matches after search or filters are applied shall display a no-results state.

**BR-72**
Loading states shall not display stale data as if it were current for a newly selected Requester.

**BR-73**
Error messages shall explain what the user can do next without exposing unsafe technical details.

### Lab 3 Transition Rules

**BR-74**
The temporary Requester context shall be isolated so it can later be replaced by an authenticated identity.

**BR-75**
Ticket ownership shall be represented using a Requester foreign key so Lab 3 authentication can resolve the logged-in user to the same ownership model.

---

## 6. UI Specification Summary

Detailed UI rules are defined in:

`docs/lab-02/ui-spec.md`

### Application Shell

The application shell shall include:

* TokTickIT identity.
* My Tickets navigation.
* Create Ticket navigation.
* Current Development Requester identity.
* Change Requester action.
* Clear active-page indication.
* Responsive mobile navigation.

### Development Requester Selection

The screen shall include:

* TokTickIT title.
* Explanation that the selector exists for Lab 2 testing only.
* Development Requester dropdown.
* Continue button.
* Loading state.
* Empty state.
* API failure state.
* Keyboard-accessible form controls.

Suggested explanatory text:

> Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3.

### Create Ticket

The screen shall visually separate system-generated/read-only information from editable fields.

Read-only information:

* Ticket Number.
* Ticket Date.
* Requester.
* Current Status where displayed.

Editable information:

* Category.
* Related System.
* Ticket Summary.
* Requested Priority.
* Description.
* Attachments.

The form shall provide field-level validation and a clearly visible primary Submit action.

### My Tickets

Desktop shall use a readable table.

Recommended columns:

* Ticket Number.
* Created Date.
* Summary.
* Category.
* Requested Priority.
* Current Status.
* Last Updated.

The screen shall provide:

* Search.
* Filters.
* Sorting.
* Clear Filters.
* Pagination.
* Create Ticket action.
* Loading state.
* Empty state.
* No-results state.
* Error state.

On mobile, Tickets shall use a card-based representation instead of forcing the full desktop table horizontally.

### Ticket Detail

Ticket information shall be read-only.

The screen shall clearly separate:

1. Ticket information.
2. Attachment information and actions.

No Public Comments, Internal Notes, Actions Taken, IT Staff controls, or status-changing controls shall be displayed.

### Zen Green Tokens

Required theme tokens include:

* Primary Green: `#006B3C`
* Secondary Green: `#0B7A46`
* Pale Green: `#EAF6EF`
* Page Background: `#F5F7F6`
* Surface: `#FFFFFF`
* Dark charcoal-green text.
* Dark-red validation/error styling.
* Amber warnings.

### Responsive Behavior

**Desktop ≥ 992 px**

* Multi-column layouts where appropriate.
* Centered content with sensible maximum width.

**Tablet 768–991 px**

* Two-column layouts where practical.
* Summary and Description receive sufficient width.

**Mobile < 768 px**

* Form fields stack vertically.
* Buttons remain touch-friendly.
* Ticket list changes to cards or an equivalent responsive representation.
* No horizontal page scrolling.

**All viewports**

* No clipped labels.
* No overlapping validation text.
* No hidden action buttons.
* No unreadable Attachment names.

---

## 7. Data Changes

The PostgreSQL database shall support the following concepts.

### 7.1 RequesterUser

Proposed fields:

* `id`
* `name`
* `email`
* `isActive`
* `createdAt`
* `updatedAt`

Constraints:

* Primary key on `id`.
* Unique constraint on `email`.
* Index on `isActive`.

### 7.2 Category

Proposed fields:

* `id`
* `name`
* `isActive`
* `createdAt`
* `updatedAt`

Required seed values:

1. Account and Access
2. Hardware
3. Software
4. Network

`name` shall be unique.

### 7.3 RelatedSystem

Proposed fields:

* `id`
* `name`
* `isActive`
* `createdAt`
* `updatedAt`

Initial seed values:

1. Email
2. Campus Wi-Fi
3. VPN
4. LEB2 App
5. Grade Submission App
6. Printer
7. Corporate Laptop

`name` shall be unique.

### 7.4 Ticket

Proposed fields:

* `id`
* `ticketNumber`
* `clientSubmissionId`
* `requesterId`
* `categoryId`
* `relatedSystemId`
* `summary`
* `description`
* `requestedPriority`
* `currentStatus`
* `itPriority` nullable for future use
* `createdAt`
* `updatedAt`

Relationships:

* One RequesterUser may own many Tickets.
* One Ticket belongs to one RequesterUser.
* One Category may be referenced by many Tickets.
* One RelatedSystem may be referenced by many Tickets.
* One Ticket may contain many Attachments.

Constraints/indexes:

* `ticketNumber` unique.
* `clientSubmissionId` unique.
* Foreign key on `requesterId`.
* Foreign key on `categoryId`.
* Foreign key on `relatedSystemId`.
* Index on `requesterId`.
* Composite index on `requesterId, updatedAt`.
* Index on `categoryId`.
* Index on `relatedSystemId`.
* Index on `requestedPriority`.
* Index on `currentStatus`.

### 7.5 Attachment

Proposed fields:

* `id`
* `ticketId`
* `originalFilename`
* `storedFilename`
* `mimeType`
* `sizeBytes`
* `storagePath`
* `isRemoved`
* `removedAt`
* `removalReason`
* `createdAt`
* `updatedAt`

Relationships:

* One Ticket may contain many Attachments.
* One Attachment belongs to one Ticket.

Indexes:

* Index on `ticketId`.
* Composite index on `ticketId, isRemoved`.

### 7.6 Seed Requirements

Seed execution shall be idempotent.

It shall contain:

* Four required Categories.
* At least six Related Systems.
* At least four active Development Requesters.
* At least one inactive Development Requester.

Running the seed repeatedly shall not create duplicates.

### 7.7 Database Design Decision

Requester ownership is stored as a foreign-key relationship between `Ticket.requesterId` and `RequesterUser.id`.

This design is preferred over storing only a Requester name or email because it enforces referential integrity, allows efficient requester-scoped queries, and allows Lab 3 authentication to resolve a real authenticated identity to the existing Requester ownership model without redesigning Ticket data.

---

## 8. API Contract

Detailed request and response shapes are defined in:

`docs/lab-02/api-spec.md`

The Lab 2 API shall support at least the following capabilities.

### Reference Data

`GET /api/requesters`

Returns active Development Requesters.

`GET /api/categories`

Returns active Categories.

`GET /api/related-systems`

Returns active Related Systems.

### Ticket Creation

`POST /api/tickets`

Creates one Ticket for the current Development Requester.

Expected success:

* `201 Created` for first successful creation.
* Official Ticket Number returned.

Repeated submission using the same `clientSubmissionId`:

* Existing Ticket returned without creating another Ticket.

### My Tickets

`GET /api/tickets`

Supported query parameters shall include:

* `search`
* `categoryId`
* `relatedSystemId`
* `requestedPriority`
* `status`
* `sort`
* `order`
* `page`
* `pageSize`

The response shall include:

* Ticket items.
* Current page.
* Page size.
* Total items.
* Total pages.

### Ticket Detail

`GET /api/tickets/:ticketId`

Returns one Ticket only when it belongs to the current Development Requester.

Cross-Requester access shall not return Ticket data.

### Attachments

`POST /api/tickets/:ticketId/attachments`

Uploads one permitted Attachment to an owned Ticket.

`GET /api/tickets/:ticketId/attachments`

Returns Attachment metadata for an owned Ticket.

`GET /api/attachments/:attachmentId/download`

Downloads an active Attachment when ownership and Attachment state permit it.

`DELETE /api/attachments/:attachmentId`

Soft-removes an active Attachment.

The removal request shall contain a valid removal reason.

### Expected Status Codes

The API may use:

* `200 OK` — successful retrieval or idempotent duplicate request.
* `201 Created` — resource created.
* `400 Bad Request` — invalid request or validation error.
* `404 Not Found` — missing resource or inaccessible cross-Requester resource.
* `409 Conflict` — documented resource/state conflict where appropriate.
* `413 Payload Too Large` — Attachment exceeds 5 MB.
* `415 Unsupported Media Type` — unsupported Attachment type.
* `500 Internal Server Error` — safe unexpected server error.

All error responses shall use a consistent safe response structure documented in `api-spec.md`.

---

## 9. Acceptance Criteria

**AC-01**
Given an active Development Requester is selected and valid Ticket data is entered, when the Requester submits the Ticket, then exactly one Ticket is saved with that Requester's ID and an official unique Ticket Number is returned.

**AC-02**
Given no Development Requester is selected, when the user attempts to open My Tickets, Create Ticket, or Ticket Detail, then the Development Requester Selection screen is shown.

**AC-03**
Given active and inactive Requesters exist in PostgreSQL, when the Development Requester selector loads, then only active Requesters appear.

**AC-04**
Given Requester A is selected, when a Ticket is created, then the saved Ticket contains Requester A's ID.

**AC-05**
Given Requester B is selected, when a Ticket belonging to Requester A is requested directly, then Ticket data is not returned.

**AC-06**
Given Requester A has Tickets, when Requester A opens My Tickets, then only Tickets belonging to Requester A are displayed.

**AC-07**
Given Requester A is selected and their Tickets are displayed, when the user changes to Requester B, then Requester A's Tickets disappear and Requester B's data is loaded.

**AC-08**
Given required Create Ticket fields are missing or invalid, when submission is attempted, then field-level validation messages are displayed and no Ticket is created.

**AC-09**
Given Summary contains surrounding whitespace, when the Ticket is submitted, then the value is trimmed before validation and storage.

**AC-10**
Given Description contains surrounding whitespace, when the Ticket is submitted, then the value is trimmed before validation and storage.

**AC-11**
Given the Ticket submission is in progress, when the Requester views the Submit control, then it displays a busy state and cannot be activated again.

**AC-12**
Given a Ticket submission fails because of a backend or network error, when the error is displayed, then previously entered editable form values remain available.

**AC-13**
Given the same `clientSubmissionId` is submitted more than once, when the backend processes the requests, then only one Ticket exists and the existing Ticket is returned for the duplicate request.

**AC-14**
Given Requester Tickets exist, when a matching Ticket Number or Summary is searched, then matching owned Tickets are returned.

**AC-15**
Given Requester Tickets exist across multiple Categories, when a Category filter is applied, then only owned Tickets matching that Category are returned.

**AC-16**
Given multiple owned Tickets exist, when a permitted sort option is selected, then the Tickets are returned in the requested deterministic order.

**AC-17**
Given the Requester has more Tickets than one page can display, when another page is requested, then the correct subset and accurate pagination metadata are returned.

**AC-18**
Given a Requester owns no Tickets, when My Tickets loads without active filters, then an empty-ticket state is displayed.

**AC-19**
Given a Requester owns Tickets but none match the active search or filters, when the filtered results load, then a no-results state is displayed separately from the empty-ticket state.

**AC-20**
Given a permitted JPG, JPEG, PNG, WEBP, or PDF not exceeding 5 MB is selected, when it is uploaded to an owned Ticket with fewer than five active Attachments, then the Attachment is saved and displayed.

**AC-21**
Given an unsupported Attachment type is selected, when upload is attempted, then the file is rejected and an understandable validation message is shown.

**AC-22**
Given an Attachment exceeds 5 MB, when upload is attempted, then the file is rejected and an understandable validation message is shown.

**AC-23**
Given a Ticket already contains five active Attachments, when another Attachment is uploaded, then the upload is rejected.

**AC-24**
Given an owned active Attachment exists, when the Requester downloads it, then the correct file is returned.

**AC-25**
Given an owned active Attachment exists, when the Requester confirms removal and provides a valid reason, then the Attachment is soft-removed rather than physically deleted.

**AC-26**
Given an Attachment has been soft-removed, when Ticket Detail is opened, then its metadata and removed state remain visible.

**AC-27**
Given an Attachment has been soft-removed, when download or preview is attempted, then access to the file is blocked.

**AC-28**
Given Requester B is selected, when an Attachment belonging to Requester A is requested directly, then the Attachment metadata or file is not returned.

**AC-29**
Given Ticket creation succeeds but one Attachment upload fails, when processing completes, then the Ticket remains created, successful uploads remain available, and the failed Attachment is clearly identified.

**AC-30**
Given the application is opened at desktop, tablet, and mobile viewport sizes, when the required screens are inspected, then labels, controls, messages, Attachments, and buttons remain readable without unintended horizontal page scrolling.

**AC-31**
Given a keyboard user navigates the application, when interactive controls receive focus, then they are reachable in a logical order and a visible focus indicator is shown.

**AC-32**
Given a required field is displayed, when the form is shown, then the label contains a required marker and validation failures also produce text rather than relying only on color.

**AC-33**
Given the Development Requester API is loading, when the selector screen is displayed, then an explicit loading state is shown.

**AC-34**
Given there are no active Development Requesters, when the selector loads, then an empty state is displayed and Continue cannot proceed.

**AC-35**
Given loading Development Requesters fails, when the API error is received, then a safe failure state is displayed without exposing internal server details.

---

## 10. Definition of Done

Lab 2 is complete only when all applicable items below are satisfied.

### Product Completion

* [ ] All approved Lab 2 Functional Requirements are implemented.
* [ ] All approved Business Rules are implemented.
* [ ] Every Acceptance Criterion has traceable test evidence.
* [ ] Development Requester Selection works with PostgreSQL seed data.
* [ ] Only active Development Requesters appear in the selector.
* [ ] Change Requester behavior works correctly.
* [ ] Ticket creation works.
* [ ] Official Ticket Numbers are generated by the backend.
* [ ] Duplicate Ticket submission is prevented.
* [ ] My Tickets returns only the selected Requester's Tickets.
* [ ] Search works.
* [ ] Filters work.
* [ ] Sorting works.
* [ ] Pagination works.
* [ ] Ticket Detail works for owned Tickets.
* [ ] Cross-Requester Ticket access is rejected.
* [ ] Valid Attachment upload works.
* [ ] Invalid Attachment type is rejected.
* [ ] Oversized Attachment is rejected.
* [ ] Five-active-Attachment limit is enforced.
* [ ] Active Attachment download works.
* [ ] Attachment soft removal works.
* [ ] Removal reason is recorded.
* [ ] Removed Attachment metadata remains visible.
* [ ] Removed Attachment download is blocked.
* [ ] Cross-Requester Attachment access is rejected.
* [ ] Form values are preserved after submission failure where required.
* [ ] Loading states are implemented.
* [ ] Empty states are implemented.
* [ ] No-results states are implemented.
* [ ] Safe error states are implemented.
* [ ] Zen Green UI conforms to `ui-spec.md`.
* [ ] Desktop responsive requirements pass.
* [ ] Tablet responsive requirements pass.
* [ ] Mobile responsive requirements pass.
* [ ] No unintended horizontal page scrolling exists.
* [ ] Required keyboard-accessibility behavior is implemented.
* [ ] Unit tests pass.
* [ ] API/integration tests pass.
* [ ] UI component tests pass.
* [ ] UI style tests pass.
* [ ] Responsive checks pass.
* [ ] E2E tests pass.
* [ ] No required test is skipped, disabled, or commented out.
* [ ] README setup and test instructions are current.
* [ ] Prisma migrations are committed.
* [ ] Seed command can be run repeatedly without creating duplicates.

### Course Delivery

* [ ] Lab 2 work was decomposed into GitHub Issues.
* [ ] Each implementation Issue used its own feature branch.
* [ ] Feature branches entered `lab2-staging` through Pull Requests.
* [ ] Pull Requests received peer review.
* [ ] Review feedback was addressed.
* [ ] Integration testing was performed from `lab2-staging`.
* [ ] A final release Pull Request merged `lab2-staging` into `main`.
* [ ] Required `docs/lab-02/` documents exist.
* [ ] `reviewer.md` is complete.
* [ ] `ai-use.md` is complete.
* [ ] Required screenshot evidence is stored under `artifacts/lab-02/screenshots/`.
* [ ] Final evidence is taken from the final `main` branch.
* [ ] Final submission PDF contains Answer Part 1 through Answer Part 9 in the required order.

---

## 11. Assumptions and Decisions

### AD-01 — Temporary Requester Context

The selected Development Requester ID will be stored in browser `sessionStorage`.

This is intentionally not authentication. It only provides a convenient multi-user testing context for Lab 2 and can later be replaced by a real authenticated identity.

### AD-02 — Ticket Number Format

The backend will generate Ticket Numbers using the format:

`TKT-YYYY-NNNNNN`

Example:

`TKT-2026-000001`

The database unique constraint remains the final protection against duplicate Ticket Numbers.

### AD-03 — Requested Priority

Requested Priority values are:

* LOW
* MEDIUM
* HIGH

The default is MEDIUM.

These values represent the Requester's requested urgency and do not represent IT Staff priority decisions.

### AD-04 — Ticket Status

All Lab 2 Tickets begin with status `NEW`.

The Requester cannot change this value in Lab 2.

Additional lifecycle states may be added in later labs.

### AD-05 — IT Priority

`itPriority` may exist as a nullable database field to support later IT Staff functionality, but Lab 2 provides no Requester control for changing it.

When displayed, an unset IT Priority shall appear as a neutral read-only value such as `Not assigned`.

### AD-06 — Submission Idempotency

The frontend generates a unique `clientSubmissionId` for a Ticket form submission.

Retrying the same submission after an uncertain network result shall not create another Ticket.

### AD-07 — Attachment Transaction Strategy

Ticket creation and Attachment upload are separate operations.

The Ticket is created first. Selected Attachments are then uploaded.

This avoids deleting a valid Ticket when one supporting file fails to upload.

### AD-08 — Attachment Storage

The application shall keep the original filename for display but generate a unique safe server-side storage filename.

No user-provided relative or absolute file-system path shall be trusted.

### AD-09 — Ownership Failure

Cross-Requester Ticket and Attachment requests shall use a safe `404 Not Found` response so the API does not reveal whether another Requester's resource exists.

### AD-10 — My Tickets Mobile Representation

Desktop uses a Ticket table.

Mobile uses Ticket cards containing the most important identification and state information rather than requiring horizontal table scrolling.

### AD-11 — Search Scope

My Tickets text search covers:

* Ticket Number.
* Ticket Summary.

Other structured properties are handled through dedicated filters.

### AD-12 — Pagination

Pagination is 1-based.

Default page size:

`10`

Supported page sizes:

`10`, `20`, `50`

### AD-13 — Default Sorting

My Tickets defaults to:

1. `updatedAt DESC`
2. `id DESC`

The second field provides deterministic ordering when multiple Tickets have equal timestamps.

### AD-14 — Authentication Transition

Lab 3 shall replace the Development Requester selector with real authentication while preserving the Ticket-to-Requester database relationship and backend ownership-query structure.
