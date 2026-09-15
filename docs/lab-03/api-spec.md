# Lab 3 REST API Specification

## 1. Purpose

This document defines the Lab 3 REST API contract for authentication, authorization, authenticated Requester workflows, IT Staff Ticket operations, Public Comments, Internal Notes, and Administrator User Management.

All protected endpoints require authenticated access.

Backend authorization is authoritative. Hidden frontend controls are not security controls.

---

## 2. General API Rules

Base path:

```text
/api
```

JSON is used for normal request and response bodies.

API responses must never expose:

- password hashes
- raw passwords
- session secrets
- stack traces
- database internals
- filesystem paths
- Internal Notes to Requesters

Standard status codes:

| Status | Meaning |
| --- | --- |
| 200 | Successful request |
| 201 | Resource created |
| 400 | Invalid input |
| 401 | Authentication required or failed |
| 403 | Authenticated but forbidden |
| 404 | Resource not found or safely unavailable |
| 409 | Conflict |
| 500 | Safe unexpected server failure |

---

## 3. Authentication Approach

Lab 3 uses server-managed authenticated sessions.

Passwords are hashed using bcrypt.

After successful login:

1. the server validates the email and password;
2. the server creates an authenticated session;
3. the session is sent using an HttpOnly cookie;
4. the client does not store authentication secrets directly.

Cookie settings:

```text
HttpOnly
SameSite=Lax
Path=/
```

`Secure` shall be enabled when HTTPS is used.

Logout invalidates the authenticated session.

---

# 4. Authentication API

## 4.1 Login

```text
POST /api/auth/login
```

Request:

```json
{
  "email": "jennifer@example.com",
  "password": "Initial1!"
}
```

Success:

```text
200 OK
```

```json
{
  "user": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer@example.com",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": true
  }
}
```

Invalid credentials:

```text
401 Unauthorized
```

```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "The email address or password is incorrect."
}
```

The same response shall be used for unknown email addresses and incorrect passwords.

Inactive account:

```text
401 Unauthorized
```

```json
{
  "error": "AUTHENTICATION_FAILED",
  "message": "Unable to sign in with this account."
}
```

---

## 4.2 Logout

```text
POST /api/auth/logout
```

Success:

```text
200 OK
```

```json
{
  "message": "Logged out successfully."
}
```

The current authenticated session is invalidated.

---

## 4.3 Current User

```text
GET /api/auth/me
```

Success:

```json
{
  "user": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer@example.com",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": false
  }
}
```

Unauthenticated request:

```text
401 Unauthorized
```

```json
{
  "error": "UNAUTHENTICATED",
  "message": "Authentication is required."
}
```

---

## 4.4 Change Password

```text
POST /api/auth/change-password
```

Request:

```json
{
  "currentPassword": "Initial1!",
  "newPassword": "NewPassword1!",
  "confirmPassword": "NewPassword1!"
}
```

Password rules:

- minimum 8 characters;
- uppercase letter;
- lowercase letter;
- number;
- special character;
- confirmation must match.

Success:

```text
200 OK
```

```json
{
  "message": "Password changed successfully.",
  "mustChangePassword": false
}
```

Invalid password:

```text
400 Bad Request
```

```json
{
  "error": "INVALID_PASSWORD",
  "message": "The new password does not meet the password requirements."
}
```

---

# 5. Mandatory First-Login Password Change

When:

```text
mustChangePassword = true
```

the authenticated user may use only:

```text
GET /api/auth/me
POST /api/auth/change-password
POST /api/auth/logout
```

Other protected endpoints return:

```text
403 Forbidden
```

```json
{
  "error": "PASSWORD_CHANGE_REQUIRED",
  "message": "You must change your password before continuing."
}
```

---

# 6. Requester Identity

Lab 3 removes the Lab 2 Development Requester identity mechanism.

Requester identity is always determined from the authenticated User.

The client must not control ownership using:

```text
requesterId
```

or:

```text
X-Development-Requester-Id
```

---

# 7. Requester Ticket APIs

## 7.1 Categories

```text
GET /api/categories
```

Returns available Ticket Categories.

---

## 7.2 Related Systems

```text
GET /api/related-systems
```

Returns available Related Systems.

---

## 7.3 Create Ticket

```text
POST /api/tickets
```

Required role:

```text
REQUESTER
```

Request:

```json
{
  "categoryId": 1,
  "relatedSystemId": 2,
  "requestedPriority": "MEDIUM",
  "summary": "Cannot connect to WiFi",
  "description": "The laptop disconnects after several minutes."
}
```

The backend determines `requesterId` from the authenticated user.

New Tickets initially use:

```text
currentStatus = NEW
ownerId = null
itPriority = requestedPriority
```

Success:

```text
201 Created
```

---

## 7.4 My Tickets

```text
GET /api/tickets
```

Required role:

```text
REQUESTER
```

Only Tickets owned by the authenticated Requester are returned.

Supported query parameters:

```text
search
status
priority
sortBy
sortOrder
page
pageSize
```

Example:

```text
GET /api/tickets?status=NEW&page=1&pageSize=10
```

Example response:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

---

## 7.5 Requester Ticket Detail

```text
GET /api/tickets/:ticketId
```

Required role:

```text
REQUESTER
```

The Ticket must belong to the authenticated Requester.

If another Requester's Ticket is requested:

```text
404 Not Found
```

```json
{
  "error": "NOT_FOUND",
  "message": "The requested item could not be found."
}
```

The API shall not reveal that the Ticket belongs to another user.

---

# 8. Attachment APIs

Existing Lab 2 Attachment behavior continues.

## List Attachments

```text
GET /api/tickets/:ticketId/attachments
```

## Upload Attachment

```text
POST /api/tickets/:ticketId/attachments
```

## Download Attachment

```text
GET /api/attachments/:attachmentId/download
```

## Remove Attachment

```text
DELETE /api/attachments/:attachmentId
```

Requester ownership shall be checked by the backend for every Attachment operation.

---

# 9. Public Comments

Public Comments are visible to:

- Requester owning the Ticket;
- IT Staff;
- Administrator.

Public Comments are append-only.

---

## 9.1 Requester List Public Comments

```text
GET /api/tickets/:ticketId/comments
```

Required role:

```text
REQUESTER
```

The Ticket must belong to the authenticated Requester.

Example response:

```json
{
  "items": [
    {
      "id": 1,
      "author": {
        "id": 1,
        "name": "Jennifer Anderson",
        "role": "REQUESTER"
      },
      "content": "The problem still happens after restarting.",
      "createdAt": "2026-09-15T10:30:00.000Z"
    }
  ]
}
```

---

## 9.2 Requester Create Public Comment

```text
POST /api/tickets/:ticketId/comments
```

Request:

```json
{
  "content": "The problem still happens after restarting."
}
```

Rules:

```text
1–2000 characters after trimming
```

Whitespace-only comments are rejected.

Author and creation time are determined by the backend.

Success:

```text
201 Created
```

---

# 10. Problem Appears Resolved

```text
POST /api/tickets/:ticketId/problem-appears-resolved
```

Required role:

```text
REQUESTER
```

The Ticket must belong to the authenticated Requester.

Success:

```json
{
  "message": "Resolution indication recorded.",
  "requesterResolutionIndicatedAt": "2026-09-15T11:00:00.000Z"
}
```

This endpoint does not allow the Requester to directly set:

```text
RESOLVED
```

or:

```text
CLOSED
```

IT Staff remain responsible for formal Ticket resolution and closure.

---

# 11. IT Staff Ticket Queue

```text
GET /api/staff/tickets
```

Required role:

```text
IT_STAFF
```

Supported query parameters:

```text
search
status
itPriority
ownership
sortBy
sortOrder
page
pageSize
```

Example:

```text
GET /api/staff/tickets?status=IN_PROGRESS&ownership=MINE&page=1&pageSize=10
```

Search fields:

- Ticket Number
- Summary
- Requester Name
- Requester Email

Status values:

```text
NEW
OPEN
IN_PROGRESS
WAITING_FOR_REQUESTER
RESOLVED
CLOSED
REOPENED
CANCELLED
```

IT Priority values:

```text
LOW
MEDIUM
HIGH
```

Ownership values:

```text
ALL
UNASSIGNED
MINE
```

Sortable fields:

```text
updatedAt
createdAt
ticketNumber
summary
requestedPriority
itPriority
currentStatus
```

Default sort:

```text
updatedAt desc
```

Supported page sizes:

```text
10
20
50
```

Example response:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 37,
    "totalPages": 4
  }
}
```

Invalid query parameters return:

```text
400 Bad Request
```

---

# 12. IT Staff Ticket Detail

```text
GET /api/staff/tickets/:ticketId
```

Required role:

```text
IT_STAFF
```

Response shall include required Ticket information such as:

- Ticket Number
- Requester
- Category
- Related System
- Requested Priority
- IT Priority
- Current Status
- Ticket Owner
- Summary
- Description
- requester resolution indication
- Attachments
- Public Comments
- Internal Notes

---

# 13. Ticket Ownership

```text
PATCH /api/staff/tickets/:ticketId/owner
```

Required role:

```text
IT_STAFF
```

Request:

```json
{
  "ownerId": 10
}
```

The selected owner must be an active eligible IT Staff or Administrator user.

Success:

```text
200 OK
```

Invalid owner:

```text
400 Bad Request
```

or:

```text
409 Conflict
```

```json
{
  "error": "INVALID_OWNER",
  "message": "The selected ticket owner is not eligible."
}
```

Claiming a Ticket uses the same endpoint with the authenticated IT Staff user's ID.

---

# 14. IT Priority

```text
PATCH /api/staff/tickets/:ticketId/priority
```

Required role:

```text
IT_STAFF
```

Request:

```json
{
  "itPriority": "HIGH"
}
```

Allowed values:

```text
LOW
MEDIUM
HIGH
```

Requested Priority shall remain unchanged.

---

# 15. Ticket Status

```text
PATCH /api/staff/tickets/:ticketId/status
```

Required role:

```text
IT_STAFF
```

Request:

```json
{
  "status": "RESOLVED"
}
```

Allowed transitions:

| Current Status | Allowed Next Status |
| --- | --- |
| NEW | OPEN, IN_PROGRESS, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| CLOSED | None |
| CANCELLED | None |

Invalid transition:

```text
409 Conflict
```

```json
{
  "error": "INVALID_STATUS_TRANSITION",
  "message": "This status change is not permitted from the ticket's current status."
}
```

---

# 16. IT Staff Public Comments

## List

```text
GET /api/staff/tickets/:ticketId/comments
```

## Create

```text
POST /api/staff/tickets/:ticketId/comments
```

Request:

```json
{
  "content": "Please restart the laptop and test again."
}
```

Rules:

```text
1–2000 characters after trimming
```

Success:

```text
201 Created
```

The backend determines author and timestamp.

---

# 17. Internal Notes

Internal Notes are visible only to IT Staff and Administrator users.

Requesters must never receive Internal Note content.

---

## 17.1 List Internal Notes

```text
GET /api/staff/tickets/:ticketId/notes
```

Required role:

```text
IT_STAFF
```

Administrator read access is permitted according to the authorization rules.

---

## 17.2 Create Internal Note

```text
POST /api/staff/tickets/:ticketId/notes
```

Required role:

```text
IT_STAFF
```

Request:

```json
{
  "content": "Waiting for network team confirmation."
}
```

Rules:

```text
1–4000 characters after trimming
```

Whitespace-only content is rejected.

Success:

```text
201 Created
```

Internal Notes are append-only.

No edit or delete endpoint exists in Lab 3.

---

## 17.3 Requester Internal Note Access

Requester access returns:

```text
403 Forbidden
```

```json
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to perform this operation."
}
```

No Internal Note content shall be returned.

---

# 18. Administrator User Management

All endpoints under:

```text
/api/admin
```

require:

```text
ADMINISTRATOR
```

---

# 19. List Users

```text
GET /api/admin/users
```

Supported query parameters:

```text
search
role
```

Search matches:

- Name
- Email

Optional role values:

```text
REQUESTER
IT_STAFF
ADMINISTRATOR
```

Example response:

```json
{
  "items": [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer@example.com",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false
    }
  ]
}
```

Password hashes or secrets shall never be returned.

---

# 20. Create User

```text
POST /api/admin/users
```

Request:

```json
{
  "name": "Emily Davis",
  "email": "emily@example.com",
  "role": "REQUESTER",
  "isActive": true,
  "initialPassword": "Initial1!"
}
```

Allowed roles:

```text
REQUESTER
IT_STAFF
ADMINISTRATOR
```

Exactly one role is accepted.

Success:

```text
201 Created
```

```json
{
  "user": {
    "id": 20,
    "name": "Emily Davis",
    "email": "emily@example.com",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": true
  }
}
```

Duplicate email:

```text
409 Conflict
```

```json
{
  "error": "DUPLICATE_EMAIL",
  "message": "A user with this email address already exists."
}
```

Invalid role:

```text
400 Bad Request
```

```json
{
  "error": "INVALID_ROLE",
  "message": "The selected role is not valid."
}
```

---

# 21. Update User

```text
PATCH /api/admin/users/:userId
```

Editable fields:

```text
name
email
role
isActive
```

Example request:

```json
{
  "name": "Emily Davis",
  "email": "emily.davis@example.com",
  "role": "IT_STAFF",
  "isActive": true
}
```

Success:

```text
200 OK
```

---

# 22. Administrator Self-Deactivation

If the authenticated Administrator attempts to deactivate their own account:

```text
409 Conflict
```

```json
{
  "error": "SELF_DEACTIVATION_NOT_ALLOWED",
  "message": "You cannot deactivate your own account."
}
```

---

# 23. Last Active Administrator

An update that would leave zero active Administrators shall be rejected.

Examples:

- deactivating the final active Administrator;
- changing the final active Administrator to another role.

Response:

```text
409 Conflict
```

```json
{
  "error": "LAST_ADMIN_REQUIRED",
  "message": "At least one active Administrator must remain."
}
```

---

# 24. Set New Initial Password

```text
POST /api/admin/users/:userId/initial-password
```

Request:

```json
{
  "initialPassword": "NewInitial1!"
}
```

Success:

```text
200 OK
```

```json
{
  "message": "New initial password set successfully.",
  "mustChangePassword": true
}
```

The user must change the new initial password at the next login.

The password shall not be returned by the API.

---

# 25. Administrator Authorization

Requester or IT Staff access to Administrator APIs returns:

```text
403 Forbidden
```

```json
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to perform this operation."
}
```

No Administrator User Management information shall be returned.

---

# 26. User Deletion

Lab 3 does not provide user deletion.

The following endpoint shall not exist:

```text
DELETE /api/admin/users/:userId
```

Accounts are deactivated instead.

---

# 27. Validation Rules

## Name

```text
Required
Trimmed
1–100 characters
```

## Email

```text
Required
Valid email format
Trimmed
Case-insensitive uniqueness
Maximum 254 characters
```

## Password

```text
Minimum 8 characters
Uppercase letter
Lowercase letter
Number
Special character
```

## Public Comment

```text
1–2000 characters after trimming
```

## Internal Note

```text
1–4000 characters after trimming
```

---

# 28. Standard Safe Error Shape

General error:

```json
{
  "error": "ERROR_CODE",
  "message": "Safe user-facing explanation."
}
```

Validation error:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "One or more fields are invalid.",
  "fields": {
    "email": "Enter a valid email address."
  }
}
```

Responses shall not expose internal implementation details.

---

# 29. Authorization Behavior

Unauthenticated protected request:

```text
401 Unauthorized
```

Authenticated user without required permission:

```text
403 Forbidden
```

Expired or invalid session:

```text
401 Unauthorized
```

Mandatory password change required:

```text
403 Forbidden
```

Requester ownership failure:

```text
404 Not Found
```

when required to avoid revealing protected resource existence.

---

# 30. Authorization Matrix

| Operation | Requester | IT Staff | Administrator |
| --- | --- | --- | --- |
| Login / Logout | Yes | Yes | Yes |
| Change Own Password | Yes | Yes | Yes |
| Create Ticket | Yes | No | No |
| View Requester Tickets | Own only | No | No |
| Requester Attachments | Own only | No | No |
| Public Comments | Own Ticket | Yes | Read |
| Problem Appears Resolved | Own Ticket | No | No |
| IT Staff Queue | No | Yes | No by normal Admin UI |
| IT Staff Ticket Detail | No | Yes | No by normal Admin UI |
| Claim / Reassign Ticket | No | Yes | No by normal Admin UI |
| Change IT Priority | No | Yes | Backend may permit Admin |
| Change Ticket Status | No | Yes | No by normal Admin UI |
| Read Internal Notes | No | Yes | Yes |
| Create Internal Notes | No | Yes | No by normal Admin UI |
| User Management | No | No | Yes |
| Set Initial Password | No | No | Yes |

---

# 31. Migration Compatibility

Lab 3 shall preserve existing Lab 2:

- Categories
- Related Systems
- Ticket IDs
- Ticket Numbers
- Requester ownership
- Attachments
- Attachment relationships

Existing Lab 2 Requesters shall be migrated into authenticated User accounts.

The Development Requester selector and client-side identity state shall be removed.

The application shall no longer depend on:

```text
X-Development-Requester-Id
```

for authorization.

---

# 32. API Definition of Done

The Lab 3 API is complete when:

- Login works.
- Invalid login returns safe errors.
- Inactive users cannot authenticate.
- Current-user retrieval works.
- Mandatory first-login password change works.
- Logout invalidates authenticated access.
- Backend role authorization works.
- Backend Requester ownership protection works.
- Development Requester identity is removed.
- Lab 2 Requester Ticket APIs still work.
- Lab 2 Attachment APIs still work.
- Public Comments work.
- Problem Appears Resolved works.
- IT Staff Queue supports search.
- IT Staff Queue supports filters.
- IT Staff Queue supports sorting.
- IT Staff Queue supports pagination.
- IT Staff Ticket Detail works.
- Ticket claim and reassignment work.
- IT Priority updates work.
- Requested Priority remains unchanged.
- Ticket status transitions are validated.
- Internal Notes are hidden from Requesters.
- Administrator User Management works.
- User creation works.
- Duplicate email is rejected.
- Exactly one valid role is accepted.
- User editing works.
- Activation and deactivation work.
- Administrator self-deactivation is rejected.
- Removal of the final active Administrator is rejected.
- New initial-password assignment works.
- Non-Administrators cannot access Administrator APIs.
- Safe errors expose no sensitive implementation information.