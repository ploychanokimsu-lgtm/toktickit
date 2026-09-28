# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal

Lab 3 evolves TokTickIT from the Lab 2 Development Requester prototype into an authenticated, role-based ticketing application. Users sign in with email and password, users with an initial password must change it before entering the normal application, and the system enforces permissions for Requester, IT Staff, and Administrator roles at the backend.

The sprint preserves all completed Lab 2 Requester Ticket and Attachment behavior while replacing the temporary Development Requester selector with authenticated identity. It also introduces the IT Staff Ticket Queue and Ticket Detail workflow, Ticket ownership and IT Priority, Public Comments, Internal Notes, the expanded Ticket status workflow, and a minimalist Administrator User Management screen.

---

## 2. Stakeholder Request Interpretation

TokTickIT must now use real users instead of the temporary Lab 2 Development Requester selector.

A user must authenticate using an email address and password. If the account is using an initial password, the user must choose a valid new password before the normal application is available. Once authenticated, the application shell must display the signed-in user's identity and role and expose only navigation appropriate for that role.

Requesters must continue using the completed Lab 2 Ticket and Attachment functions, but ownership must now come only from the authenticated Requester identity. A Requester must never be able to obtain another Requester's protected Ticket or Attachment by modifying a request. Requesters may post Public Comments and indicate that their reported problem appears resolved, but they may not formally set a Ticket to Resolved or Closed.

IT Staff need a professional Ticket Queue and Ticket Detail workflow. They must be able to locate work, inspect Ticket information, claim or reassign ownership, set IT Priority, perform permitted status changes, communicate through Public Comments, and record private Internal Notes.

Administrators need a deliberately small User Management interface. They can view users, search by name or email, optionally filter by role, create users, edit basic account information, assign exactly one permitted role, activate or deactivate accounts, and set a new initial password. User deletion, multiple roles, bulk administration, email invitations, and advanced identity-management functions are outside Lab 3.

Backend authorization is mandatory. Hidden or disabled frontend controls are user feedback only and are not treated as security controls.

---

## 3. Scope

### 3.1 Included

Lab 3 includes:

* Email-and-password authentication.
* Secure password hashing.
* Login validation and safe authentication failures.
* Inactive-account handling.
* Authenticated-session creation and expiration.
* Logout and session invalidation.
* Current authenticated-user retrieval.
* Mandatory first-login password change for initial passwords.
* Password confirmation and password-rule validation.
* Requester, IT Staff, and Administrator roles.
* Exactly one permitted role per user.
* Backend role-based authorization.
* Backend Requester ownership authorization.
* Role-specific application navigation.
* Migration from Lab 2 `RequesterUser` records to the authenticated `User` model.
* Removal of the Development Requester selector and `X-Development-Requester-Id` identity mechanism.
* Preservation of existing Lab 2 Ticket ownership.
* Preservation of existing Lab 2 Attachment data and behavior.
* Authenticated Requester Ticket creation.
* Authenticated Requester My Tickets.
* Authenticated Requester Ticket Detail.
* Authenticated Requester Attachment upload, download, and soft removal.
* Requester Public Comments.
* Requester "Problem Appears Resolved" indication.
* IT Staff Ticket Queue.
* Queue search.
* Queue filters.
* Queue sorting.
* Queue pagination.
* Assigned and unassigned Ticket display.
* Ticket ownership claim.
* Ticket assignment and reassignment.
* IT Priority.
* Expanded Ticket statuses: New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, and Cancelled.
* Defined Ticket status-transition rules.
* IT Staff Public Comments.
* IT Staff Internal Notes.
* Append-only Public Comments.
* Append-only Internal Notes.
* Administrator User Management.
* User listing.
* Search users by name or email.
* Optional user-role filtering.
* User creation.
* Basic user editing.
* Account activation and deactivation.
* New initial-password assignment by an Administrator.
* Prevention of duplicate email addresses.
* Prevention of Administrator self-deactivation.
* Prevention of removing or deactivating the last active Administrator.
* Idempotent Lab 3 seed data.
* Zen Green design-system continuation.
* Desktop, tablet, and mobile behavior.
* Loading, saving, busy, success, validation, empty, no-results, forbidden, not-found, conflict, and safe API-failure feedback where meaningful.
* Unit, API/integration, UI component, UI style, responsive, security/authorization, migration/regression, and end-to-end tests.

### 3.2 Excluded

The following are explicitly outside Lab 3:

* Email invitations.
* Password-reset email.
* Email delivery of initial passwords.
* Multi-factor authentication.
* Social login.
* Single sign-on.
* Self-registration.
* Requester-created accounts.
* Multiple roles assigned to one user.
* User deletion.
* Bulk user operations.
* User import or export.
* User role history.
* Account audit-history screens.
* Departments.
* Organizations.
* Multi-tenant administration.
* Profile photos or extended user profiles.
* Account unlocking workflows.
* Administrator approval workflows.
* Advanced account-recovery functions.
* Mandatory pagination for the Administrator user list.
* Multi-column user-list sorting.
* Multiple simultaneous user-list filters.
* Actions Taken by IT Staff.
* Formal SLA calculation.
* Escalation rules.
* Notification services.
* Dashboards or KPI analytics beyond simple queue counts.
* Production-grade deployment changes.
* Cloud-infrastructure changes.

---

## 4. Functional Requirements

### Authentication and Session

**FR-01**  
The system shall provide a Login screen accepting email address and password.

**FR-02**  
The backend shall authenticate only an active user with valid credentials.

**FR-03**  
The backend shall return a safe authentication failure without revealing whether an unknown email address or an incorrect password caused the failure.

**FR-04**  
The system shall create an authenticated session after successful login.

**FR-05**  
The system shall provide a current-user endpoint returning safe authenticated identity data including user ID, name, email, role, activation state, and password-change requirement.

**FR-06**  
The system shall provide Logout and invalidate the current authenticated session.

**FR-07**  
After Logout, protected API endpoints and protected application screens shall no longer be accessible through the invalidated session.

### Mandatory Password Change

**FR-08**  
A user whose account is marked as requiring a password change shall be redirected to a mandatory Change Password screen after successful authentication.

**FR-09**  
A user requiring a password change shall not be permitted to enter the normal application until a valid new password is saved.

**FR-10**  
The Change Password screen shall require the current password, new password, and confirmation of the new password.

**FR-11**  
The backend shall validate the current password before accepting a password change.

**FR-12**  
After a valid password change, the backend shall save the new password securely, clear the password-change requirement, and allow the user to continue into the application.

### Role-Based Application Shell and Authorization

**FR-13**  
The authenticated application shell shall display the current user's name and role.

**FR-14**  
The application shall show navigation destinations appropriate for the current user's role.

**FR-15**  
Every protected backend endpoint shall enforce authentication and the required role and/or ownership rules independently of frontend visibility.

**FR-16**  
Unauthenticated, forbidden, invalid, missing, conflicting, and unexpected-failure conditions shall produce distinguishable safe responses.

### Requester Regression and Authenticated Identity

**FR-17**  
The Development Requester selector and Change Requester action from Lab 2 shall be removed.

**FR-18**  
Requester-specific backend operations shall derive Requester identity only from the authenticated user and shall ignore any client-supplied requester identity.

**FR-19**  
An authenticated Requester shall be able to create a Ticket using the completed Lab 2 fields and validation behavior.

**FR-20**  
An authenticated Requester shall be able to view, search, filter, sort, and paginate only their own Tickets using My Tickets.

**FR-21**  
An authenticated Requester shall be able to open only an owned Ticket in Requester Ticket Detail.

**FR-22**  
An authenticated Requester shall be able to use the completed Lab 2 Attachment upload, metadata, download, and soft-removal functions only for owned Tickets and Attachments.

### Public Comments and Requester Resolution Indication

**FR-23**  
An authenticated Requester shall be able to retrieve Public Comments for an owned Ticket.

**FR-24**  
An authenticated Requester shall be able to post a non-empty Public Comment to an owned Ticket.

**FR-25**  
Requester Ticket Detail shall provide a "Problem Appears Resolved" action.

**FR-26**  
The "Problem Appears Resolved" action shall record the Requester's indication without allowing the Requester to formally set the Ticket to Resolved or Closed.

### IT Staff Ticket Queue

**FR-27**  
An authenticated IT Staff user shall be able to open the IT Staff Ticket Queue.

**FR-28**  
The Ticket Queue shall display enough information to locate and prioritize work without becoming an unreadable mega-grid.

**FR-29**  
The Ticket Queue shall support search.

**FR-30**  
The Ticket Queue shall support suitable filters including status, IT Priority, and ownership.

**FR-31**  
The Ticket Queue shall support sorting.

**FR-32**  
The Ticket Queue shall support pagination and return pagination metadata.

**FR-33**  
The Ticket Queue shall clearly distinguish assigned and unassigned Tickets.

**FR-34**  
The Ticket Queue shall provide an action to open IT Staff Ticket Detail.

### IT Staff Ticket Detail and Ticket Operations

**FR-35**  
An authenticated IT Staff user shall be able to retrieve a Ticket for IT Staff operations.

**FR-36**  
IT Staff Ticket Detail shall display Ticket information, Ticket Owner, Requested Priority, IT Priority, Current Status, Attachments, Public Comments, and Internal Notes.

**FR-37**  
An IT Staff user shall be able to claim an unassigned Ticket.

**FR-38**  
An IT Staff user shall be able to assign or reassign a Ticket to an eligible active Ticket Owner.

**FR-39**  
An IT Staff user shall be able to update IT Priority.

**FR-40**  
An IT Staff user shall be able to perform only permitted Ticket status transitions.

**FR-41**  
IT Staff Ticket Detail shall visually separate Public Comments from Internal Notes.

**FR-42**  
An IT Staff user shall be able to retrieve and post Public Comments.

**FR-43**  
An IT Staff user shall be able to retrieve and create Internal Notes.

**FR-44**  
Existing Attachments shall remain available in IT Staff Ticket Detail without breaking Lab 2 Attachment continuity.

### Administrator User Management

**FR-45**  
An authenticated Administrator shall be able to open the User Management screen.

**FR-46**  
User Management shall display Name, Email, Role, Status, and an Edit action for each user.

**FR-47**  
An Administrator shall be able to search users by name or email.

**FR-48**  
User Management may filter users by one role at a time.

**FR-49**  
An Administrator shall be able to create a user with name, email address, exactly one permitted role, activation state, and an initial password.

**FR-50**  
An Administrator shall be able to edit a user's name, email address, role, and activation state.

**FR-51**  
An Administrator shall be able to set a new initial password for a user.

**FR-52**  
A user receiving a new initial password shall be required to change it at the next successful login.

**FR-53**  
User Management shall reject duplicate email addresses and invalid role values.

**FR-54**  
The system shall prevent an Administrator from deactivating their own account.

**FR-55**  
The system shall prevent any operation that would leave the system with no active Administrator.

**FR-56**  
Non-Administrators shall be forbidden from Administrator user-management APIs and screens.

### UI, Responsive Behavior, and Feedback

**FR-57**  
Lab 3 screens shall extend the existing Zen Green design language and reusable component conventions from Lab 2.

**FR-58**  
Status, Requested Priority, IT Priority, and role values shall use consistent badges.

**FR-59**  
Editable and read-only fields shall remain visually distinguishable.

**FR-60**  
Major Lab 3 screens shall provide meaningful loading, saving, busy, success, validation, empty, no-results, forbidden, not-found, conflict, and safe API-failure feedback where applicable.

**FR-61**  
Major Lab 3 screens shall remain usable on desktop, tablet, and mobile viewport sizes.

**FR-62**  
Interactive controls shall remain keyboard-accessible and show visible focus feedback.

---

## 5. Business Rules

### Authentication and Account Rules

**BR-01**  
Only an active user with valid credentials may authenticate.

**BR-02**  
Email addresses shall be trimmed and compared case-insensitively for authentication and uniqueness.

**BR-03**  
Authentication shall use the same generic invalid-credentials response for an unknown email address and an incorrect password.

**BR-04**  
Passwords shall never be stored in plaintext.

**BR-05**  
Passwords shall be hashed using a password-hashing algorithm intended for password storage.

**BR-06**  
The approved implementation shall use `bcrypt` with a work factor of 12 for local Lab 3 password hashing.

**BR-07**  
A valid new password shall contain at least 8 characters and at most 72 characters.

**BR-08**  
A valid new password shall contain at least one uppercase letter, one lowercase letter, one number, and one special character.

**BR-09**  
Password confirmation must exactly match the new password.

**BR-10**  
The new password must be different from the current password.

**BR-11**  
A user marked `mustChangePassword = true` may authenticate but may access only the current-user, change-password, and logout functions until a valid new password is saved.

**BR-12**  
An inactive user shall not be permitted to authenticate.

**BR-13**  
If an authenticated user's account becomes inactive, subsequent protected requests shall be rejected and the session shall no longer grant application access.

### Session Rules

**BR-14**  
Lab 3 shall use server-managed opaque authenticated sessions rather than exposing authentication secrets to client code.

**BR-15**  
A successful login shall generate a cryptographically random session token.

**BR-16**  
Only a cryptographic hash of the session token shall be stored in PostgreSQL.

**BR-17**  
The raw session token shall be sent only in an `HttpOnly` authentication cookie.

**BR-18**  
The authentication cookie shall use `SameSite=Lax`, shall be scoped to the application, and shall use `Secure` when the application is served over HTTPS.

**BR-19**  
Authenticated sessions shall expire after 8 hours.

**BR-20**  
Logout shall invalidate the current server-side session and expire the authentication cookie.

**BR-21**  
Because authentication uses a cookie, state-changing requests shall reject cross-site requests using the approved same-origin/SameSite strategy; production-grade CSRF-token infrastructure is not required for this local course lab.

### Role and Authorization Rules

**BR-22**  
Each user shall have exactly one role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.

**BR-23**  
Frontend navigation visibility is not authorization; protected operations shall be enforced by the backend.

**BR-24**  
Unauthenticated access to a protected endpoint shall return `401 Unauthorized`.

**BR-25**  
Authenticated access without sufficient permission shall return `403 Forbidden`.

**BR-26**  
Protected resource failures shall not reveal whether another user's inaccessible Ticket, Attachment, or Internal Note exists.

### Requester Ownership Rules

**BR-27**  
The authenticated user identity, not a `requesterId` supplied by the client, determines Requester ownership.

**BR-28**  
The Lab 2 `X-Development-Requester-Id` header shall no longer be accepted as identity for protected Requester operations.

**BR-29**  
A Requester may create a Ticket only for their own authenticated user account.

**BR-30**  
A Requester may retrieve only Tickets for which `ticket.requesterId` equals the authenticated user's ID.

**BR-31**  
A Requester may access Attachment metadata, upload, download, or soft removal only through an owned Ticket.

**BR-32**  
Requester attempts to access another user's protected Ticket or Attachment shall return a safe not-found-style response without protected resource details.

### Ticket Ownership and Priority Rules

**BR-33**  
A Ticket may have zero or one primary Ticket Owner.

**BR-34**  
A newly created Ticket shall initially be unassigned unless the approved seed data explicitly creates assigned historical examples.

**BR-35**  
A Ticket Owner must be an active user with role `IT_STAFF` or `ADMINISTRATOR`.

**BR-36**  
An IT Staff user may claim an unassigned Ticket by assigning the Ticket to themselves.

**BR-37**  
An IT Staff user may assign or reassign a Ticket only to an eligible active Ticket Owner.

**BR-38**  
Requested Priority remains the value submitted by the Requester and is not modified through IT Staff operations.

**BR-39**  
IT Priority shall initially copy Requested Priority when a Ticket is created or migrated.

**BR-40**  
IT Priority may be changed only by IT Staff or Administrator as required by the Lab 3 handout.

**BR-41**  
The permitted priority values are `LOW`, `MEDIUM`, and `HIGH`.

### Ticket Status Rules

**BR-42**  
The supported Ticket statuses are `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.

**BR-43**  
A newly created Ticket shall begin with status `NEW`.

**BR-44**  
A Requester shall not directly change Ticket status.

**BR-45**  
The Requester's "Problem Appears Resolved" action records a separate requester-resolution indication and does not directly set status to `RESOLVED` or `CLOSED`.

**BR-46**  
IT Staff may transition `NEW` to `OPEN`, `IN_PROGRESS`, or `CANCELLED`.

**BR-47**  
IT Staff may transition `OPEN` to `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, or `CANCELLED`.

**BR-48**  
IT Staff may transition `IN_PROGRESS` to `WAITING_FOR_REQUESTER`, `RESOLVED`, or `CANCELLED`.

**BR-49**  
IT Staff may transition `WAITING_FOR_REQUESTER` to `IN_PROGRESS`, `RESOLVED`, or `CANCELLED`.

**BR-50**  
IT Staff may transition `RESOLVED` to `CLOSED` or `REOPENED`.

**BR-51**  
IT Staff may transition `REOPENED` to `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, or `CANCELLED`.

**BR-52**  
`CLOSED` is terminal in Lab 3.

**BR-53**  
`CANCELLED` is terminal in Lab 3.

**BR-54**  
Status changes outside the approved transition matrix shall be rejected with validation or conflict feedback and shall not change persisted status.

**BR-55**  
The Lab 4 Actions Taken completion rule shall not block resolution in Lab 3.

### Public Comment Rules

**BR-56**  
Public Comments are visible to the Requester who owns the Ticket, IT Staff, and Administrator.

**BR-57**  
A Requester may create a Public Comment only on an owned Ticket.

**BR-58**  
IT Staff may create Public Comments on Tickets accessible through the IT Staff workflow.

**BR-59**  
Public Comments are append-only in Lab 3 and cannot be edited or deleted.

**BR-60**  
Public Comment content shall be trimmed and whitespace-only content shall be rejected.

**BR-61**  
Public Comment content shall contain between 1 and 2000 characters after trimming.

**BR-62**  
The backend shall set the Public Comment author and creation time; the client shall not supply trusted author or timestamp values.

**BR-63**  
Public Comment content shall be rendered as plain text and shall not execute user-supplied HTML or script content.

### Internal Note Rules

**BR-64**  
Internal Notes are never visible to Requesters.

**BR-65**  
Internal Notes are visible to IT Staff and Administrator.

**BR-66**  
Only IT Staff may create Internal Notes through the Lab 3 operational UI.

**BR-67**  
Internal Notes are append-only in Lab 3 and cannot be edited or deleted.

**BR-68**  
Internal Note content shall be trimmed and whitespace-only content shall be rejected.

**BR-69**  
Internal Note content shall contain between 1 and 4000 characters after trimming.

**BR-70**  
The backend shall set the Internal Note author and creation time.

**BR-71**  
Internal Note content shall be rendered as plain text and shall not execute user-supplied HTML or script content.

### Administrator User Rules

**BR-72**  
Only an authenticated Administrator may use Administrator User Management operations.

**BR-73**  
An Administrator may create a user with exactly one permitted role.

**BR-74**  
A user's name shall be trimmed, required, and limited to 1-100 characters.

**BR-75**  
A user's email address shall be trimmed, normalized to lowercase for storage, syntactically valid, unique case-insensitively, and limited to 254 characters.

**BR-76**  
Creating a user requires an initial password that satisfies the Lab 3 password rules.

**BR-77**  
A newly created user shall have `mustChangePassword = true`.

**BR-78**  
Setting a new initial password shall replace the stored password hash and set `mustChangePassword = true`.

**BR-79**  
An Administrator may update another user's name, email address, role, and activation state.

**BR-80**  
An Administrator shall not be permitted to deactivate their own account.

**BR-81**  
An operation that would leave zero active Administrator accounts shall be rejected.

**BR-82**  
Users shall be deactivated rather than deleted.

**BR-83**  
Invalid or unsupported role values shall be rejected.

**BR-84**  
Changing a user's role shall not create an additional role; the existing role is replaced by exactly one permitted role.

### Queue Query Rules

**BR-85**  
IT Staff Queue search shall match Ticket Number, Summary, Requester Name, and Requester Email case-insensitively.

**BR-86**  
IT Staff Queue filters shall support status, IT Priority, and ownership state (`ALL`, `UNASSIGNED`, `MINE`, or a specific eligible owner where supported by the UI).

**BR-87**  
IT Staff Queue sortable fields shall be limited to `updatedAt`, `createdAt`, `ticketNumber`, `summary`, `requestedPriority`, `itPriority`, and `currentStatus`.

**BR-88**  
IT Staff Queue default ordering shall be `updatedAt desc` with Ticket ID descending as a deterministic tie-breaker.

**BR-89**  
Permitted Queue page sizes shall be 10, 20, and 50 with a default of 10.

**BR-90**  
Invalid Queue query parameters shall be rejected safely rather than silently executing unrestricted values.

### Regression, Migration, and Failure Rules

**BR-91**  
Existing Lab 2 Category, Related System, Ticket, and Attachment records shall remain valid after migration.

**BR-92**  
Existing Lab 2 Requester IDs and Ticket requester foreign-key relationships shall be preserved during migration.

**BR-93**  
Existing Requesters shall receive documented local-development initial passwords and `mustChangePassword = true`.

**BR-94**  
Seeded development credentials shall be local-development data only and shall not contain real personal passwords or secrets.

**BR-95**  
Seed operations shall be idempotent and safe to run repeatedly.

**BR-96**  
Unexpected server errors shall return safe error messages without stack traces, password hashes, session secrets, filesystem paths, or other internal details.

---

## 6. Authorization Matrix

| Operation | Requester | IT Staff | Administrator |
| --- | --- | --- | --- |
| Login / logout / current user | Own account | Own account | Own account |
| Mandatory password change | Own account | Own account | Own account |
| Create Ticket | Yes, self only | No | No |
| View My Tickets | Own Tickets only | No | No |
| View Requester Ticket Detail | Own Tickets only | No | No |
| Requester Attachment operations | Own Tickets only | No | No |
| Post Public Comment | Own Tickets only | Yes | Read-only by default |
| Read Public Comments | Own Tickets only | Yes | Yes |
| "Problem Appears Resolved" | Own Tickets only | No | No |
| Open IT Staff Queue | No | Yes | No by default |
| Open IT Staff Ticket Detail | No | Yes | No by default |
| Claim / assign / reassign Ticket | No | Yes | No through Admin UI |
| Change IT Priority | No | Yes | Backend permitted for Administrator to satisfy BR-40; not exposed in Admin UI |
| Change Ticket status | No | Yes | No through Admin UI |
| Read Internal Notes | No | Yes | Yes |
| Create Internal Note | No | Yes | No through Admin UI |
| View User Management | No | No | Yes |
| Create / edit / activate users | No | No | Yes |
| Set initial password | No | No | Yes |

Administrator and IT Staff responsibilities remain intentionally separate in the user interface. Administrator read visibility for comments/notes and the backend IT Priority permission are retained because the Lab 3 handout explicitly defines those visibility/priority rules. The Administrator navigation shall not automatically expose the IT Staff Queue.

---

## 7. UI Specification Summary

Detailed screen behavior is defined in `docs/lab-03/ui-spec.md`.

### 7.1 Login

The Login screen contains:

* TokTickIT Zen Green branding;
* Email Address;
* Password;
* password visibility control;
* Sign In action;
* field validation;
* disabled/busy state during submission; and
* safe invalid-credentials or inactive-account feedback.

The Lab 3 UI shall not provide a functional "Forgot password" flow because password-reset email and advanced account recovery are explicitly excluded.

### 7.2 Mandatory Change Password

The Change Password screen contains:

* Current Password;
* New Password;
* Confirm New Password;
* password visibility controls;
* visible password rules;
* field validation;
* busy state; and
* Continue action.

Normal application navigation remains unavailable until the change succeeds.

### 7.3 Authenticated Application Shell

The application shell shall:

* show the authenticated user's name and role;
* remove Development Requester UI;
* show role-specific navigation;
* provide Logout;
* preserve Zen Green tokens and responsive navigation behavior; and
* avoid rendering links to unauthorized destinations.

### 7.4 Requester Screens

The existing Lab 2 Create Ticket, My Tickets, Requester Ticket Detail, and Attachment experiences shall continue to work using authenticated identity.

Requester Ticket Detail gains:

* Public Comments; and
* "Problem Appears Resolved".

### 7.5 IT Staff Ticket Queue

The desktop Queue table shall use the following primary columns:

* Ticket Number;
* Updated;
* Summary;
* Requested Priority;
* IT Priority;
* Status;
* Owner; and
* Open action.

Category and Requester information may be shown in secondary text/detail instead of additional desktop columns to avoid an unreadable mega-grid.

The Queue shall include:

* search;
* filter controls;
* sorting;
* pagination;
* loading state;
* empty state;
* no-results state;
* forbidden state;
* safe failure state; and
* mobile/tablet representations defined in `ui-spec.md`.

### 7.6 IT Staff Ticket Detail

IT Staff Ticket Detail shall group:

* Ticket identity and Requester information;
* Category and Related System;
* Requested Priority;
* IT Priority;
* Ticket Owner;
* Current Status;
* Summary and Description;
* Requester resolution indication;
* Public Comments;
* Internal Notes; and
* Attachments.

Public Comments and Internal Notes shall use visibly different tabs/sections and labels so private notes are not accidentally posted publicly.

### 7.7 Administrator User Management

The Administrator screen shall remain intentionally simple and include:

* user list;
* Name;
* Email;
* Role badge;
* Active/Inactive status;
* Edit action;
* name/email search;
* optional role filter;
* Create User action;
* create/edit panel or dialog;
* activation control;
* initial-password field when creating or resetting credentials; and
* validation, success, forbidden, conflict, and safe failure feedback.

### 7.8 Zen Green and Responsive Behavior

Lab 3 shall reuse Lab 2 design tokens, spacing, typography, cards, forms, badges, buttons, validation placement, responsive breakpoints, visible focus states, and accessibility conventions.

Desktop, tablet, and mobile layouts shall avoid clipped controls, overlapping content, unreadable tables, and unintended horizontal page overflow.

---

## 8. Data Changes

### 8.1 `User`

Lab 3 replaces the Lab 2 `RequesterUser` concept with a real authenticated `User` model.

Required fields:

| Field | Type / Rule |
| --- | --- |
| `id` | Integer primary key; preserve existing Requester IDs |
| `name` | Required string, max 100 |
| `email` | Required, unique, normalized lowercase, max 254 |
| `role` | `UserRole` enum |
| `passwordHash` | Required hashed password |
| `isActive` | Boolean |
| `mustChangePassword` | Boolean |
| `createdAt` | Timestamp |
| `updatedAt` | Timestamp |

Relationships:

* one Requester User may submit many Tickets;
* one eligible IT Staff or Administrator User may own many Tickets;
* one User may author many Public Comments;
* one User may author many Internal Notes;
* one User may have multiple authenticated Session records over time.

Indexes:

* unique email;
* role;
* activation state; and
* role + activation state for eligible-owner/admin safety queries.

### 8.2 `UserRole`

```text
REQUESTER
IT_STAFF
ADMINISTRATOR