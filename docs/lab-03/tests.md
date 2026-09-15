# Lab 3 Test Plan and Traceability

## 1. Purpose

This document defines the planned Lab 3 verification strategy before implementation is completed.

Testing covers:

- authentication
- mandatory first-login password change
- session behavior
- role-based authorization
- Requester ownership protection
- Lab 2 regression
- IT Staff Ticket Queue
- IT Staff Ticket Detail
- Ticket ownership
- IT Priority
- Ticket status transitions
- Public Comments
- Internal Notes
- Administrator User Management
- migration
- responsive behavior
- accessibility
- safe failure behavior
- end-to-end workflows

Every Acceptance Criterion in `specification.md` shall map to at least one planned test.

---

# 2. Required Test Levels

Lab 3 uses:

- Unit tests
- API / integration tests
- UI component tests
- UI style tests
- responsive tests
- security / authorization tests
- migration / regression tests
- end-to-end tests

Final evidence shall use test results from the final `main` branch.

---

# 3. Server Test Structure

Required server test directory:

```text
server/tests/lab-03/
```

Planned files:

```text
auth.api.test.ts
authorization.api.test.ts
staff-queue.api.test.ts
staff-ticket-detail.api.test.ts
comments-notes.api.test.ts
users-admin.api.test.ts
migration-regression.test.ts
```

---

# 4. Client Test Structure

Planned client tests:

```text
client/tests/lab-03/Login.test.tsx
client/tests/lab-03/ChangePassword.test.tsx
client/tests/lab-03/RoleNavigation.test.tsx
client/tests/lab-03/RequesterTicketDetail.test.tsx
client/tests/lab-03/StaffTicketQueue.test.tsx
client/tests/lab-03/StaffTicketDetail.test.tsx
client/tests/lab-03/UserManagement.test.tsx
client/tests/lab-03/ui-style.test.ts
client/tests/lab-03/responsive.test.tsx
```

---

# 5. E2E Test Structure

Required E2E directory:

```text
e2e/lab-03/
```

Planned files:

```text
authentication.spec.ts
requester-regression.spec.ts
staff-ticket-flow.spec.ts
user-administration.spec.ts
authorization.spec.ts
```

---

# 6. Authentication API Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| API-01 | API | AC-01 | Active user with valid credentials logs in | Authenticated response with safe user data | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-02 | API | AC-02 | Wrong password login | Generic authentication failure | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-03 | API | AC-02 | Unknown email login | Same generic failure as wrong password | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-04 | API | AC-03 | Inactive account login | Authentication rejected safely | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-05 | API | AC-01 | Email lookup is case-insensitive | Valid account authenticates | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-06 | API | AC-01 | Successful login creates authenticated session | Session cookie returned | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-07 | API | AC-07 | Logout | Session invalidated | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-08 | API | AC-07 | Protected API after logout | 401 Unauthorized | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-09 | API | AC-07 | Missing authentication | 401 Unauthorized | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-10 | API | AC-01 | Current authenticated user | Safe identity and role returned | `server/tests/lab-03/auth.api.test.ts` | Planned |

---

# 7. Mandatory Password Change Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| API-11 | API | AC-04 | Initial-password login | Authentication succeeds but normal APIs remain blocked | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-12 | API | AC-04 | User requiring password change accesses normal endpoint | 403 PASSWORD_CHANGE_REQUIRED | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-13 | API | AC-05 | Wrong current password | Password change rejected | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-14 | API | AC-05 | Password below minimum length | Validation rejected | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-15 | API | AC-05 | Password missing uppercase | Validation rejected | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-16 | API | AC-05 | Password missing lowercase | Validation rejected | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-17 | API | AC-05 | Password missing number | Validation rejected | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-18 | API | AC-05 | Password missing special character | Validation rejected | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-19 | API | AC-05 | Confirmation mismatch | Validation rejected | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-20 | API | AC-05 | New password equals current password | Validation rejected | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-21 | API | AC-06 | Valid mandatory password change | Password updated and requirement cleared | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-22 | API | AC-06 | Login with new password | Authentication succeeds | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-23 | API | AC-06 | Login using old password after change | Authentication rejected | `server/tests/lab-03/auth.api.test.ts` | Planned |

---

# 8. Authorization Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-01 | Security | AC-08 | Client sends another requesterId | Authenticated identity remains authoritative | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-02 | Security | AC-08 | Client sends old Development Requester header | Header does not change authenticated identity | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-03 | Security | AC-10 | Requester requests another Requester's Ticket | Safe 404; no protected data | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-04 | Security | AC-10 | Requester requests another Requester's Attachment | Safe failure; no protected data | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-05 | Security | AC-12 | Requester requests Internal Notes | 403; no Note data | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-06 | Security | AC-32 | Requester calls Administrator API | 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-07 | Security | AC-32 | IT Staff calls Administrator API | 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-08 | Security | Role rules | Requester calls IT Staff Queue API | 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-09 | Security | Role rules | Administrator uses unauthorized IT Staff operation | Operation rejected according to authorization matrix | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-10 | Security | Safe errors | Forbidden operation does not leak protected resource details | Safe response only | `server/tests/lab-03/authorization.api.test.ts` | Planned |

---

# 9. Requester Regression Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| REG-01 | Regression | AC-09 | Authenticated Requester creates Ticket | Ticket created for logged-in user | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| REG-02 | Regression | AC-09 | My Tickets | Only authenticated Requester's Tickets returned | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| REG-03 | Regression | AC-09 | Requester Ticket Detail | Owned Ticket returned correctly | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| REG-04 | Regression | AC-09 | Requester Ticket search/filter/sort/pagination | Existing behavior preserved | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| REG-05 | Regression | AC-09 | Attachment upload | Existing Lab 2 behavior preserved | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| REG-06 | Regression | AC-09 | Attachment listing | Existing behavior preserved | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| REG-07 | Regression | AC-09 | Attachment download | Owned active Attachment downloads | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| REG-08 | Regression | AC-09 | Attachment soft removal | Existing behavior preserved | `server/tests/lab-03/migration-regression.test.ts` | Planned |

---

# 10. Requester Public Comment and Resolution Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| API-24 | API | AC-11 | Requester creates valid Public Comment | Comment created | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-25 | API | AC-11 | Public Comment author | Authenticated user stored as author | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-26 | API | AC-11 | Public Comment timestamp | Backend timestamp stored | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-27 | API | AC-23 | Empty Public Comment | Rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-28 | API | AC-23 | Whitespace-only Public Comment | Rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-29 | API | AC-23 | Comment exceeds length limit | Rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-30 | API | AC-13 | Problem Appears Resolved | Indication timestamp recorded | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-31 | API | AC-13 | Resolution indication does not change formal status | Status remains unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |

---

# 11. IT Staff Queue Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| API-32 | API | AC-14 | Staff Queue default retrieval | Queue data returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-33 | API | AC-14 | Search Ticket Number | Matching Tickets returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-34 | API | AC-14 | Search Summary | Matching Tickets returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-35 | API | AC-14 | Search Requester Name | Matching Tickets returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-36 | API | AC-14 | Search Requester Email | Matching Tickets returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-37 | API | AC-14 | Status filter | Only matching statuses returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-38 | API | AC-14 | IT Priority filter | Only matching priorities returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-39 | API | AC-14 | UNASSIGNED filter | Only unassigned Tickets returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-40 | API | AC-14 | MINE filter | Only authenticated Staff-owned Tickets returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-41 | API | AC-14 | Sorting | Correct field and direction applied | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-42 | API | AC-14 | Pagination | Correct items and metadata returned | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-43 | API | Queue rules | Invalid sort value | 400 safe validation response | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-44 | API | Queue rules | Invalid page size | 400 safe validation response | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-45 | API | AC-15 | Search with zero matches | Empty item list returned without server failure | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |

---

# 12. IT Staff Ticket Detail Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| API-46 | API | Staff Detail | IT Staff retrieves Ticket Detail | Required operational data returned | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-47 | API | AC-16 | Claim unassigned Ticket | Authenticated IT Staff becomes owner | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-48 | API | AC-17 | Reassign to active IT Staff | Owner updated | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-49 | API | AC-17 | Assign inactive user | Rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-50 | API | AC-17 | Assign Requester as owner | Rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-51 | API | AC-18 | Change IT Priority | IT Priority updated | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-52 | API | AC-18 | Change IT Priority | Requested Priority unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-53 | API | AC-19 | Permitted status transition | New status persisted | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-54 | API | AC-20 | Invalid status transition | 409 and old status preserved | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-55 | API | AC-20 | CLOSED terminal status | Further transition rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-56 | API | AC-20 | CANCELLED terminal status | Further transition rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-57 | API | AC-21 | Existing Attachments appear in Staff Detail | Attachment continuity preserved | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |

---

# 13. Public Comment and Internal Note Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| API-58 | API | AC-22 | IT Staff creates Public Comment | Comment stored | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-59 | API | AC-22 | IT Staff creates Internal Note | Note stored | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-60 | API | AC-22 | Author comes from authentication | Correct author stored | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-61 | API | AC-22 | Timestamp generated by backend | Timestamp stored | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-62 | API | AC-23 | Empty Internal Note | Rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-63 | API | AC-23 | Whitespace-only Internal Note | Rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-64 | API | AC-23 | Internal Note exceeds length limit | Rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-65 | API | AC-12 | Requester reads Internal Notes | 403 and zero note content | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-66 | API | AC-21 | Administrator permitted to read Internal Notes | Note list returned | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-67 | API | Append-only rule | Attempted Comment edit/delete route | Unsupported | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-68 | API | Append-only rule | Attempted Note edit/delete route | Unsupported | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |

---

# 14. Administrator User Management Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| API-69 | API | AC-24 | Administrator lists users | Safe user list returned | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-70 | API | AC-25 | Search by user name | Matching users returned | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-71 | API | AC-25 | Search by user email | Matching users returned | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-72 | API | Admin scope | Filter by role | Correct users returned | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-73 | API | AC-26 | Create valid Requester | User created with one role | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-74 | API | AC-26 | Create valid IT Staff | User created with one role | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-75 | API | AC-26 | Create valid Administrator | User created with one role | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-76 | API | AC-26 | New user initial password | mustChangePassword=true | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-77 | API | AC-27 | Duplicate exact email | 409 conflict | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-78 | API | AC-27 | Duplicate email with different case | 409 conflict | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-79 | API | Admin validation | Invalid role | Rejected | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-80 | API | AC-28 | Edit name | Persisted | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-81 | API | AC-28 | Edit email | Persisted | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-82 | API | AC-28 | Change role | Exactly one new role persisted | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-83 | API | AC-28 | Deactivate user | Account becomes inactive | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-84 | API | AC-28 | Reactivate user | Account becomes active | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-85 | API | AC-29 | Administrator self-deactivation | 409 conflict | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-86 | API | AC-30 | Deactivate final active Administrator | 409 conflict | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-87 | API | AC-30 | Change final active Administrator role | 409 conflict | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-88 | API | AC-31 | Set new initial password | Password replaced and mustChangePassword=true | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-89 | API | AC-31 | User logs in using new initial password | Password-change flow required | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-90 | API | Admin security | User responses expose no password hash | Sensitive fields absent | `server/tests/lab-03/users-admin.api.test.ts` | Planned |

---

# 15. Migration and Seed Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| MIG-01 | Migration | AC-33 | Existing Requesters become Users | IDs preserved | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-02 | Migration | AC-33 | Existing Ticket requester IDs | Ownership remains correct | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-03 | Migration | AC-33 | Existing Ticket Numbers | Values preserved | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-04 | Migration | AC-33 | Existing Attachments | Relationships preserved | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-05 | Migration | AC-33 | Existing Categories | Records remain valid | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-06 | Migration | AC-33 | Existing Related Systems | Records remain valid | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-07 | Migration | Migration rules | Existing IT Priority | Backfilled from Requested Priority | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-08 | Migration | Migration rules | Migrated Requester role | REQUESTER | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-09 | Migration | Migration rules | Migrated Requester initial password state | mustChangePassword=true | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-10 | Migration | AC-34 | Seed run once | Required seed data created | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-11 | Migration | AC-34 | Seed run repeatedly | No duplicate required seed records | `server/tests/lab-03/migration-regression.test.ts` | Planned |
| MIG-12 | Migration | AC-34 | Required account counts | Minimum required active/inactive accounts exist | `server/tests/lab-03/migration-regression.test.ts` | Planned |

---

# 16. Login UI Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| UI-01 | UI | AC-01 | Login fields render | Email/password/Sign In visible | `client/tests/lab-03/Login.test.tsx` | Planned |
| UI-02 | UI | AC-02 | Missing email/password | Validation shown | `client/tests/lab-03/Login.test.tsx` | Planned |
| UI-03 | UI | AC-02 | Signing-in state | Button disabled and busy state visible | `client/tests/lab-03/Login.test.tsx` | Planned |
| UI-04 | UI | AC-02 | Invalid credentials | Safe message displayed | `client/tests/lab-03/Login.test.tsx` | Planned |
| UI-05 | UI | AC-03 | Inactive-account response | Safe failure displayed | `client/tests/lab-03/Login.test.tsx` | Planned |
| UI-06 | UI | Safe failure | Server failure | Safe retry message displayed | `client/tests/lab-03/Login.test.tsx` | Planned |

---

# 17. Change Password UI Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| UI-07 | UI | AC-04 | Required fields render | Current/new/confirm visible | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-08 | UI | AC-04 | Password rules render | Requirements visible | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-09 | UI | AC-05 | Confirmation mismatch | Validation shown | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-10 | UI | AC-05 | Invalid password | Validation shown | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-11 | UI | AC-06 | Successful change | Normal app becomes available | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-12 | UI | AC-04 | Normal navigation before change | Not available | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |

---

# 18. Role Navigation UI Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| UI-13 | UI | Role navigation | Requester navigation | My Tickets/Create Ticket visible | `client/tests/lab-03/RoleNavigation.test.tsx` | Planned |
| UI-14 | UI | Role navigation | IT Staff navigation | My Queue visible | `client/tests/lab-03/RoleNavigation.test.tsx` | Planned |
| UI-15 | UI | Role navigation | Administrator navigation | Admin visible | `client/tests/lab-03/RoleNavigation.test.tsx` | Planned |
| UI-16 | UI | Role navigation | Requester unauthorized destinations | Staff/Admin destinations absent | `client/tests/lab-03/RoleNavigation.test.tsx` | Planned |
| UI-17 | UI | Role navigation | IT Staff Admin destination | Absent | `client/tests/lab-03/RoleNavigation.test.tsx` | Planned |
| UI-18 | UI | Lab 3 migration | Development Requester selector | Not rendered | `client/tests/lab-03/RoleNavigation.test.tsx` | Planned |
| UI-19 | UI | App shell | Authenticated name and role | Visible | `client/tests/lab-03/RoleNavigation.test.tsx` | Planned |

---

# 19. Requester UI Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| UI-20 | UI | AC-09 | Requester Ticket Detail | Lab 2 information preserved | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | Planned |
| UI-21 | UI | AC-11 | Public Comments render | Entries visible | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | Planned |
| UI-22 | UI | AC-11 | Post Comment | Request sent and UI updates | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | Planned |
| UI-23 | UI | AC-23 | Empty Public Comment | Validation shown | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | Planned |
| UI-24 | UI | AC-13 | Problem Appears Resolved action | Confirmation shown | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | Planned |
| UI-25 | UI | AC-13 | Confirm resolution indication | Informational state shown | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | Planned |
| UI-26 | UI | Role restriction | Internal Notes | Not visible to Requester | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | Planned |

---

# 20. IT Staff Queue UI Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| UI-27 | UI | AC-14 | Queue data renders | Ticket rows/cards visible | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-28 | UI | AC-14 | Search | Query applied | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-29 | UI | AC-14 | Status filter | Query applied | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-30 | UI | AC-14 | Priority filter | Query applied | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-31 | UI | AC-14 | Ownership filter | Query applied | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-32 | UI | AC-14 | Sorting | Selected ordering applied | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-33 | UI | AC-14 | Pagination | Previous/Next/page behavior works | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-34 | UI | AC-14 | Assigned Ticket | Owner visible | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-35 | UI | AC-14 | Unassigned Ticket | Unassigned text visible | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-36 | UI | AC-15 | No results | No-results state displayed | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-37 | UI | Queue state | Loading | Loading state displayed | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-38 | UI | Queue state | Failure | Safe failure displayed | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |

---

# 21. IT Staff Ticket Detail UI Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| UI-39 | UI | Staff Detail | Required Ticket fields render | Correct values visible | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-40 | UI | AC-16 | Claim Ticket | Owner updates | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-41 | UI | AC-17 | Reassign Ticket | Selected owner saved | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-42 | UI | AC-18 | Requested Priority | Read-only | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-43 | UI | AC-18 | IT Priority | Editable | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-44 | UI | AC-19 | Status choices | Permitted next values displayed | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-45 | UI | AC-21 | Public Comments and Internal Notes | Visually distinct | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-46 | UI | AC-21 | Internal Note privacy helper | Visible | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-47 | UI | AC-22 | Post Public Comment | Comment appears | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-48 | UI | AC-22 | Add Internal Note | Note appears | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-49 | UI | AC-21 | Attachment continuity | Existing Attachment section visible | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-50 | UI | AC-13 | Requester resolution indication | Visible to IT Staff | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |

---

# 22. Administrator UI Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| UI-51 | UI | AC-24 | User list | Name/Email/Role/Status/Edit visible | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-52 | UI | AC-25 | Search | Matching users displayed | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-53 | UI | Admin scope | Role filter | Matching role displayed | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-54 | UI | AC-26 | Create User form | Required fields visible | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-55 | UI | AC-26 | Exactly one role selector | Single role selected | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-56 | UI | AC-27 | Duplicate email response | Conflict feedback shown | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-57 | UI | AC-28 | Edit user | Values updated | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-58 | UI | AC-29 | Self-deactivation | Disabled or conflict feedback shown | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-59 | UI | AC-30 | Last Administrator protection | Conflict feedback shown | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-60 | UI | AC-31 | Set new initial password | Success feedback shown | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-61 | UI | AC-32 | Non-Administrator Admin route | Forbidden state / redirect | `client/tests/lab-03/UserManagement.test.tsx` | Planned |

---

# 23. UI Style Tests

| ID | Type | Requirement | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| STYLE-01 | UI Style | Zen Green | Login uses expected shared classes/tokens | Pass | `client/tests/lab-03/ui-style.test.ts` | Planned |
| STYLE-02 | UI Style | Zen Green | Change Password uses shared form conventions | Pass | `client/tests/lab-03/ui-style.test.ts` | Planned |
| STYLE-03 | UI Style | Badges | Status badges use consistent component | Pass | `client/tests/lab-03/ui-style.test.ts` | Planned |
| STYLE-04 | UI Style | Badges | Priority badges use consistent component | Pass | `client/tests/lab-03/ui-style.test.ts` | Planned |
| STYLE-05 | UI Style | Badges | Role/active badges use consistent component | Pass | `client/tests/lab-03/ui-style.test.ts` | Planned |
| STYLE-06 | UI Style | Detail | Editable/read-only fields remain distinguishable | Pass | `client/tests/lab-03/ui-style.test.ts` | Planned |
| STYLE-07 | UI Style | Comments/Notes | Public and private communication have distinct treatment | Pass | `client/tests/lab-03/ui-style.test.ts` | Planned |
| STYLE-08 | UI Style | Focus | Interactive controls provide focus styling | Pass | `client/tests/lab-03/ui-style.test.ts` | Planned |

---

# 24. Responsive Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| RESP-01 | Responsive | AC-35 | Login mobile | No clipping/overflow | `client/tests/lab-03/responsive.test.tsx` | Planned |
| RESP-02 | Responsive | AC-35 | Change Password mobile | Fields remain usable | `client/tests/lab-03/responsive.test.tsx` | Planned |
| RESP-03 | Responsive | AC-35 | Staff Queue desktop | Table usable | `client/tests/lab-03/responsive.test.tsx` | Planned |
| RESP-04 | Responsive | AC-35 | Staff Queue tablet | Layout usable | `client/tests/lab-03/responsive.test.tsx` | Planned |
| RESP-05 | Responsive | AC-35 | Staff Queue mobile | Card/reduced layout with no page overflow | `client/tests/lab-03/responsive.test.tsx` | Planned |
| RESP-06 | Responsive | AC-35 | Staff Detail mobile | Controls stack without overlap | `client/tests/lab-03/responsive.test.tsx` | Planned |
| RESP-07 | Responsive | AC-35 | User Management desktop | Table/panel usable | `client/tests/lab-03/responsive.test.tsx` | Planned |
| RESP-08 | Responsive | AC-35 | User Management tablet | Layout usable | `client/tests/lab-03/responsive.test.tsx` | Planned |
| RESP-09 | Responsive | AC-35 | User Management mobile | Cards/panel usable without overflow | `client/tests/lab-03/responsive.test.tsx` | Planned |
| RESP-10 | Responsive | AC-35 | Long Comments/Notes/emails/filenames | Content wraps safely | `client/tests/lab-03/responsive.test.tsx` | Planned |

---

# 25. Accessibility Checks

The following shall be tested automatically where practical and manually during final visual review:

| ID | Type | What It Tests | Expected Result | Final |
| --- | --- | --- | --- | --- |
| A11Y-01 | Accessibility | Form fields have accessible labels | Pass | Planned |
| A11Y-02 | Accessibility | Buttons have meaningful names | Pass | Planned |
| A11Y-03 | Accessibility | Keyboard navigation | Required controls reachable | Planned |
| A11Y-04 | Accessibility | Visible focus | Focus indicator visible | Planned |
| A11Y-05 | Accessibility | Badge meaning | Text exists in addition to color | Planned |
| A11Y-06 | Accessibility | Dialog controls | Keyboard accessible | Planned |
| A11Y-07 | Accessibility | Validation | Errors understandable and associated where practical | Planned |

---

# 26. End-to-End Authentication Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-01 | E2E | AC-01 | Valid Login | User enters authenticated app | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-02 | E2E | AC-02 | Invalid Login | Safe failure shown | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-03 | E2E | AC-03 | Inactive account | Login blocked | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-04 | E2E | AC-04, AC-06 | Initial-password Login and Change Password | Normal app opens only after valid change | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-05 | E2E | AC-07 | Logout | Protected page unavailable afterward | `e2e/lab-03/authentication.spec.ts` | Planned |

---

# 27. End-to-End Requester Regression Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-06 | E2E | AC-09 | Login as Requester and create Ticket | Ticket created | `e2e/lab-03/requester-regression.spec.ts` | Planned |
| E2E-07 | E2E | AC-09 | Open created Ticket from My Tickets | Correct Ticket opens | `e2e/lab-03/requester-regression.spec.ts` | Planned |
| E2E-08 | E2E | AC-09 | Upload Attachment | Attachment visible | `e2e/lab-03/requester-regression.spec.ts` | Planned |
| E2E-09 | E2E | AC-11 | Post Public Comment | Comment visible | `e2e/lab-03/requester-regression.spec.ts` | Planned |
| E2E-10 | E2E | AC-13 | Problem Appears Resolved | Indication recorded | `e2e/lab-03/requester-regression.spec.ts` | Planned |

---

# 28. End-to-End IT Staff Flow

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-11 | E2E | AC-14 | Staff opens Queue | Realistic queue displayed | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-12 | E2E | AC-14 | Search/filter Queue | Results update correctly | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-13 | E2E | AC-16 | Claim Ticket | Staff becomes owner | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-14 | E2E | AC-18 | Change IT Priority | New IT Priority displayed | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-15 | E2E | AC-19 | Change Ticket status | Valid status persisted | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-16 | E2E | AC-22 | Post Public Comment | Comment visible | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-17 | E2E | AC-22 | Add Internal Note | Note visible to Staff | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-18 | E2E | AC-21 | Attachment continuity | Existing Attachment visible | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |

---

# 29. End-to-End User Administration

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-19 | E2E | AC-24 | Administrator opens Users | User list shown | `e2e/lab-03/user-administration.spec.ts` | Planned |
| E2E-20 | E2E | AC-25 | Search user | Matching account shown | `e2e/lab-03/user-administration.spec.ts` | Planned |
| E2E-21 | E2E | AC-26 | Create new user | Account created | `e2e/lab-03/user-administration.spec.ts` | Planned |
| E2E-22 | E2E | AC-27 | Duplicate email | Validation/conflict shown | `e2e/lab-03/user-administration.spec.ts` | Planned |
| E2E-23 | E2E | AC-28 | Edit user | Account changes saved | `e2e/lab-03/user-administration.spec.ts` | Planned |
| E2E-24 | E2E | AC-29 | Attempt self-deactivation | Operation blocked | `e2e/lab-03/user-administration.spec.ts` | Planned |
| E2E-25 | E2E | AC-30 | Attempt removal of final active Admin | Operation blocked | `e2e/lab-03/user-administration.spec.ts` | Planned |
| E2E-26 | E2E | AC-31 | Set initial password then Login | Password change required | `e2e/lab-03/user-administration.spec.ts` | Planned |

---

# 30. End-to-End Authorization Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-27 | E2E | AC-32 | Requester opens Admin URL directly | Forbidden/redirect | `e2e/lab-03/authorization.spec.ts` | Planned |
| E2E-28 | E2E | Role rules | Requester opens Staff Queue URL directly | Forbidden/redirect | `e2e/lab-03/authorization.spec.ts` | Planned |
| E2E-29 | E2E | AC-10 | Requester manually opens another Requester's Ticket | Safe not-found state | `e2e/lab-03/authorization.spec.ts` | Planned |
| E2E-30 | E2E | AC-12 | Requester attempts Internal Note API | Forbidden and no Note data | `e2e/lab-03/authorization.spec.ts` | Planned |

---

# 31. Safe Failure Tests

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| FAIL-01 | API | AC-36 | Unexpected Login server failure | Safe 500 response | `server/tests/lab-03/auth.api.test.ts` | Planned |
| FAIL-02 | API | AC-36 | Unexpected Queue failure | Safe 500 response | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| FAIL-03 | API | AC-36 | Unexpected Ticket Detail failure | Safe 500 response | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| FAIL-04 | API | AC-36 | Unexpected User Management failure | Safe 500 response | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| FAIL-05 | UI | AC-36 | Queue API failure | Safe failure UI shown | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| FAIL-06 | UI | AC-36 | Ticket Detail API failure | Safe failure UI shown | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| FAIL-07 | UI | AC-36 | User Management API failure | Safe failure UI shown | `client/tests/lab-03/UserManagement.test.tsx` | Planned |

---

# 32. Acceptance Criteria Traceability

| Acceptance Criterion | Planned Coverage |
| --- | --- |
| AC-01 | API-01, API-05, API-06, API-10, E2E-01 |
| AC-02 | API-02, API-03, UI-04, E2E-02 |
| AC-03 | API-04, UI-05, E2E-03 |
| AC-04 | API-11, API-12, UI-07, UI-12, E2E-04 |
| AC-05 | API-13 through API-20, UI-09, UI-10 |
| AC-06 | API-21 through API-23, UI-11, E2E-04 |
| AC-07 | API-07 through API-09, E2E-05 |
| AC-08 | SEC-01, SEC-02 |
| AC-09 | REG-01 through REG-08, E2E-06 through E2E-08 |
| AC-10 | SEC-03, SEC-04, E2E-29 |
| AC-11 | API-24 through API-26, UI-21, UI-22, E2E-09 |
| AC-12 | SEC-05, API-65, UI-26, E2E-30 |
| AC-13 | API-30, API-31, UI-24, UI-25, E2E-10 |
| AC-14 | API-32 through API-42, UI-27 through UI-35, E2E-11, E2E-12 |
| AC-15 | API-45, UI-36 |
| AC-16 | API-47, UI-40, E2E-13 |
| AC-17 | API-48 through API-50, UI-41 |
| AC-18 | API-51, API-52, UI-42, UI-43, E2E-14 |
| AC-19 | API-53, UI-44, E2E-15 |
| AC-20 | API-54 through API-56 |
| AC-21 | API-57, API-65, API-66, UI-45, UI-46, UI-49 |
| AC-22 | API-58 through API-61, UI-47, UI-48, E2E-16, E2E-17 |
| AC-23 | API-27 through API-29, API-62 through API-64, UI-23 |
| AC-24 | API-69, UI-51, E2E-19 |
| AC-25 | API-70, API-71, UI-52, E2E-20 |
| AC-26 | API-73 through API-76, UI-54, UI-55, E2E-21 |
| AC-27 | API-77, API-78, UI-56, E2E-22 |
| AC-28 | API-80 through API-84, UI-57, E2E-23 |
| AC-29 | API-85, UI-58, E2E-24 |
| AC-30 | API-86, API-87, UI-59, E2E-25 |
| AC-31 | API-88, API-89, UI-60, E2E-26 |
| AC-32 | SEC-06, SEC-07, UI-61, E2E-27 |
| AC-33 | MIG-01 through MIG-09 |
| AC-34 | MIG-10 through MIG-12 |
| AC-35 | RESP-01 through RESP-10 |
| AC-36 | FAIL-01 through FAIL-07 |

---

# 33. Final Test Commands

Final commands shall be updated to match the implemented package scripts.

Expected categories:

```text
server tests
client tests
Lab 3 API tests
Lab 3 UI tests
E2E tests
```

All required tests shall be run from the final `main` branch for submission evidence.

---

# 34. Final Test Evidence

Before submission:

- [ ] Server unit/API tests pass.
- [ ] Authentication tests pass.
- [ ] Authorization tests pass.
- [ ] Requester regression tests pass.
- [ ] Staff Queue tests pass.
- [ ] Staff Ticket Detail tests pass.
- [ ] Public Comment tests pass.
- [ ] Internal Note tests pass.
- [ ] Administrator tests pass.
- [ ] Migration tests pass.
- [ ] Seed idempotency tests pass.
- [ ] Client component tests pass.
- [ ] UI style tests pass.
- [ ] Responsive tests pass.
- [ ] E2E authentication flow passes.
- [ ] E2E Requester flow passes.
- [ ] E2E IT Staff flow passes.
- [ ] E2E Administrator flow passes.
- [ ] E2E authorization checks pass.
- [ ] No required test is skipped.
- [ ] No required test is disabled.
- [ ] Final test output from `main` is captured for evidence.

---

# 35. Test Definition of Done

Lab 3 testing is complete when:

- every approved Acceptance Criterion maps to at least one planned test;
- authentication and password-change boundaries are tested;
- direct API authorization is tested;
- Requester ownership is tested;
- Lab 2 Ticket and Attachment regression is tested;
- Queue search, filters, sorting, and pagination are tested;
- Ticket claim and reassignment are tested;
- IT Priority is tested;
- permitted and forbidden status transitions are tested;
- Public Comments are tested;
- Internal Note privacy is tested;
- Administrator User Management is tested;
- duplicate email protection is tested;
- one-role assignment is tested;
- Administrator self-deactivation protection is tested;
- last-active-Administrator protection is tested;
- initial-password reset behavior is tested;
- migration preservation is tested;
- seed idempotency is tested;
- responsive behavior is tested;
- accessibility expectations are checked;
- safe failure behavior is tested;
- end-to-end role workflows pass;
- final automated test results from `main` are recorded as Pass.