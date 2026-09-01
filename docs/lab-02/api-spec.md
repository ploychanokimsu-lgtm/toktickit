# Lab 2 REST API Specification

## 1. Purpose

This document defines the REST API contract for the Lab 2 Requester-facing TokTickIT application.

The API supports:

* active Development Requester retrieval
* active Category retrieval
* active Related System retrieval
* Ticket creation
* Requester-owned Ticket listing
* search, filtering, sorting, and pagination
* Requester-owned Ticket Detail retrieval
* Attachment upload
* Attachment metadata retrieval
* active Attachment download
* Attachment soft removal
* Requester ownership protection
* validation and safe error behavior

The Development Requester identity used in Lab 2 is a temporary testing mechanism and is **not authentication**.

---

# 2. General API Conventions

## 2.1 Base Path

All Lab 2 API endpoints use:

```text
/api
```

Examples:

```text
GET /api/requesters
POST /api/tickets
GET /api/tickets
```

---

## 2.2 Content Types

Normal JSON requests and responses use:

```http
Content-Type: application/json
```

Attachment upload uses:

```http
Content-Type: multipart/form-data
```

Attachment download returns the stored file using its appropriate MIME type.

---

## 2.3 JSON Naming Convention

JSON property names use camelCase.

Example:

```json
{
  "ticketNumber": "TKT-2026-000123",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW"
}
```

---

## 2.4 Date and Time Format

API timestamps shall use ISO 8601 format.

Example:

```text
2026-08-24T07:30:45.123Z
```

The backend is authoritative for stored timestamps.

The frontend may convert timestamps into local display format.

---

# 3. Development Requester Context

## 3.1 Purpose

Lab 2 does not implement real authentication.

The frontend stores the selected Development Requester ID in browser `sessionStorage`.

Requester-specific API calls shall send the selected Development Requester ID using:

```http
X-Development-Requester-Id: 1
```

This header exists only for Lab 2 testing.

Example:

```http
GET /api/tickets
X-Development-Requester-Id: 1
```

---

## 3.2 Important Security Limitation

`X-Development-Requester-Id` shall **not** be described or treated as authentication.

A user could manually change the header.

Its purpose is only to simulate different Requester identities during Lab 2.

Real authenticated identity will replace this mechanism in Lab 3.

---

## 3.3 Requester Validation

For requester-specific operations, the backend shall verify that:

1. the header exists;
2. the value is a valid Requester ID;
3. the Requester exists; and
4. the Requester is active.

If the Requester context is missing or invalid:

```http
400 Bad Request
```

Example:

```json
{
  "error": {
    "code": "INVALID_REQUESTER_CONTEXT",
    "message": "A valid Development Requester must be selected."
  }
}
```

---

# 4. Standard Success Response Principles

Single-resource endpoints return the requested resource directly or inside a consistently named property.

Example:

```json
{
  "ticket": {
    "id": 123,
    "ticketNumber": "TKT-2026-000123"
  }
}
```

Collection endpoints return an array and, where required, pagination metadata.

---

# 5. Standard Error Format

All JSON API errors shall use the same general structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable safe message",
    "fields": {}
  }
}
```

`fields` is optional and is mainly used for validation failures.

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some ticket information is invalid.",
    "fields": {
      "summary": "Ticket Summary must contain between 5 and 150 characters.",
      "description": "Description is required."
    }
  }
}
```

---

# 6. Safe Error Requirements

API responses shall never expose:

* stack traces
* database connection strings
* SQL queries
* file-system paths
* environment variables
* secrets
* internal exception objects

Unexpected errors use:

```http
500 Internal Server Error
```

Example:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "The request could not be completed. Please try again."
  }
}
```

---

# 7. Reference Data API

## 7.1 Get Active Development Requesters

### Endpoint

```http
GET /api/requesters
```

### Requester Context Required

No.

This endpoint is used before a Requester has been selected.

### Success

```http
200 OK
```

Example:

```json
{
  "requesters": [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@example.com"
    },
    {
      "id": 2,
      "name": "Michael Brown",
      "email": "michael.brown@example.com"
    }
  ]
}
```

### Rules

* Return only active Requesters.
* Inactive Requesters shall not appear.
* Results should be ordered predictably, preferably by name ascending.

### Empty Result

```http
200 OK
```

```json
{
  "requesters": []
}
```

The frontend interprets this as the Development Requester empty state.

### Unexpected Failure

```http
500 Internal Server Error
```

---

# 8. Get Active Categories

### Endpoint

```http
GET /api/categories
```

### Requester Context Required

No.

### Success

```http
200 OK
```

```json
{
  "categories": [
    {
      "id": 1,
      "name": "Account and Access"
    },
    {
      "id": 2,
      "name": "Hardware"
    },
    {
      "id": 3,
      "name": "Software"
    },
    {
      "id": 4,
      "name": "Network"
    }
  ]
}
```

### Rules

* Return only active Categories.
* Results shall use deterministic ordering.

---

# 9. Get Active Related Systems

### Endpoint

```http
GET /api/related-systems
```

### Requester Context Required

No.

### Success

```http
200 OK
```

Example:

```json
{
  "relatedSystems": [
    {
      "id": 1,
      "name": "Email"
    },
    {
      "id": 2,
      "name": "Campus Wi-Fi"
    },
    {
      "id": 3,
      "name": "VPN"
    },
    {
      "id": 4,
      "name": "LEB2 App"
    },
    {
      "id": 5,
      "name": "Grade Submission App"
    },
    {
      "id": 6,
      "name": "Printer"
    },
    {
      "id": 7,
      "name": "Corporate Laptop"
    }
  ]
}
```

### Rules

* Return only active Related Systems.
* Results shall use deterministic ordering.

---

# 10. Ticket Representation

A Ticket returned by the API may use the following structure:

```json
{
  "id": 123,
  "ticketNumber": "TKT-2026-000123",
  "requester": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com"
  },
  "category": {
    "id": 2,
    "name": "Hardware"
  },
  "relatedSystem": {
    "id": 7,
    "name": "Corporate Laptop"
  },
  "summary": "Laptop battery drains quickly",
  "description": "The laptop battery drops from full charge to 20 percent within two hours.",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "itPriority": null,
  "createdAt": "2026-08-24T07:30:45.123Z",
  "updatedAt": "2026-08-24T07:30:45.123Z"
}
```

---

# 11. Create Ticket

## 11.1 Endpoint

```http
POST /api/tickets
```

### Requester Context Required

Yes.

Example:

```http
X-Development-Requester-Id: 1
```

The Ticket owner shall be determined from the Requester context.

The request body shall **not** be trusted to select a different Requester.

---

## 11.2 Request Body

```json
{
  "clientSubmissionId": "8117a21a-0d88-4e73-84b1-4c9604df2af1",
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "description": "The laptop battery drops from full charge to 20 percent within two hours."
}
```

---

# 12. Ticket Creation Validation

## 12.1 clientSubmissionId

Required.

Must be a valid unique identifier generated by the client for the current form submission.

It is used to prevent duplicate Ticket creation.

---

## 12.2 categoryId

Required.

Must reference an existing active Category.

---

## 12.3 relatedSystemId

Required.

Must reference an existing active Related System.

---

## 12.4 summary

Required.

Before validation:

* trim leading whitespace
* trim trailing whitespace

Length after trimming:

```text
5–150 characters
```

---

## 12.5 requestedPriority

Required.

Allowed:

```text
LOW
MEDIUM
HIGH
```

Any other value is invalid.

---

## 12.6 description

Required.

Before validation:

* trim leading whitespace
* trim trailing whitespace

Length after trimming:

```text
10–5000 characters
```

---

# 13. Successful Ticket Creation

### Status

```http
201 Created
```

### Response

```json
{
  "ticket": {
    "id": 123,
    "ticketNumber": "TKT-2026-000123",
    "requester": {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@example.com"
    },
    "category": {
      "id": 2,
      "name": "Hardware"
    },
    "relatedSystem": {
      "id": 7,
      "name": "Corporate Laptop"
    },
    "summary": "Laptop battery drains quickly",
    "description": "The laptop battery drops from full charge to 20 percent within two hours.",
    "requestedPriority": "MEDIUM",
    "currentStatus": "NEW",
    "itPriority": null,
    "createdAt": "2026-08-24T07:30:45.123Z",
    "updatedAt": "2026-08-24T07:30:45.123Z"
  }
}
```

---

# 14. Backend-Generated Ticket Values

The backend generates:

* Ticket ID
* Ticket Number
* Ticket Date / `createdAt`
* `updatedAt`
* Current Status

A newly created Ticket always has:

```json
{
  "currentStatus": "NEW"
}
```

The frontend shall not generate or override these stored values.

---

# 15. Duplicate Submission Prevention

If a request is repeated using the same:

```text
clientSubmissionId
```

the backend shall not create another Ticket.

Instead, it shall return the already-created Ticket.

Recommended response:

```http
200 OK
```

Example:

```json
{
  "ticket": {
    "id": 123,
    "ticketNumber": "TKT-2026-000123"
  },
  "duplicateSubmission": true
}
```

Exactly one Ticket shall exist for the submission identifier.

---

# 16. Ticket Creation Validation Failure

### Status

```http
400 Bad Request
```

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some ticket information is invalid.",
    "fields": {
      "summary": "Ticket Summary must contain between 5 and 150 characters.",
      "description": "Description must contain between 10 and 5000 characters."
    }
  }
}
```

No Ticket shall be created.

---

# 17. My Tickets

## 17.1 Endpoint

```http
GET /api/tickets
```

### Requester Context Required

Yes.

The endpoint shall return only Tickets belonging to the selected Development Requester.

---

# 18. Ticket List Query Parameters

Supported parameters:

| Parameter           | Purpose                         |
| ------------------- | ------------------------------- |
| `search`            | Search Ticket Number or Summary |
| `categoryId`        | Filter by Category              |
| `relatedSystemId`   | Filter by Related System        |
| `requestedPriority` | Filter by requested priority    |
| `status`            | Filter by current status        |
| `sort`              | Select sort field               |
| `order`             | Ascending or descending         |
| `page`              | Current page                    |
| `pageSize`          | Number of Tickets per page      |

Example:

```http
GET /api/tickets?search=laptop&categoryId=2&requestedPriority=MEDIUM&sort=updatedAt&order=desc&page=1&pageSize=10
```

---

# 19. Search Rules

`search` shall:

* be optional
* be trimmed
* perform case-insensitive matching where supported
* search Ticket Number
* search Ticket Summary

Example:

```http
GET /api/tickets?search=laptop
```

may match:

```text
Laptop battery drains quickly
```

Search shall never return another Requester's Ticket.

---

# 20. Filter Rules

## 20.1 Category

```text
categoryId=<positive integer>
```

Must reference a valid Category.

---

## 20.2 Related System

```text
relatedSystemId=<positive integer>
```

Must reference a valid Related System.

---

## 20.3 Requested Priority

Allowed:

```text
LOW
MEDIUM
HIGH
```

---

## 20.4 Current Status

For Lab 2 the valid current status is at least:

```text
NEW
```

The API design may allow future statuses when they are introduced in later labs.

---

# 21. Sorting Rules

Allowed `sort` values:

```text
ticketNumber
createdAt
updatedAt
summary
```

Allowed order values:

```text
asc
desc
```

Default:

```text
sort=updatedAt
order=desc
```

A deterministic secondary sort shall use:

```text
id DESC
```

unless the selected primary sort requires another documented equivalent.

---

# 22. Pagination Rules

Pagination is 1-based.

Default:

```text
page=1
pageSize=10
```

Allowed page sizes:

```text
10
20
50
```

Example:

```http
GET /api/tickets?page=2&pageSize=10
```

Invalid values shall produce:

```http
400 Bad Request
```

Examples of invalid values:

```text
page=0
page=-1
pageSize=7
pageSize=1000
```

---

# 23. Ticket List Success Response

### Status

```http
200 OK
```

Example:

```json
{
  "items": [
    {
      "id": 123,
      "ticketNumber": "TKT-2026-000123",
      "summary": "Laptop battery drains quickly",
      "category": {
        "id": 2,
        "name": "Hardware"
      },
      "relatedSystem": {
        "id": 7,
        "name": "Corporate Laptop"
      },
      "requestedPriority": "MEDIUM",
      "currentStatus": "NEW",
      "createdAt": "2026-08-24T07:30:45.123Z",
      "updatedAt": "2026-08-24T07:30:45.123Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

# 24. Empty Ticket List

If the Requester owns no Tickets:

```http
200 OK
```

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

The frontend displays the normal empty state.

---

# 25. No Search or Filter Results

If Tickets exist for the Requester but none match the current search/filter query:

```http
200 OK
```

with:

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

The frontend determines the no-results state from the presence of active search/filter criteria.

---

# 26. Invalid Ticket-List Parameters

### Status

```http
400 Bad Request
```

Example:

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "One or more ticket-list parameters are invalid.",
    "fields": {
      "pageSize": "Page size must be 10, 20, or 50."
    }
  }
}
```

---

# 27. Get Requester-Owned Ticket Detail

## 27.1 Endpoint

```http
GET /api/tickets/:ticketId
```

### Requester Context Required

Yes.

Example:

```http
GET /api/tickets/123
X-Development-Requester-Id: 1
```

---

# 28. Ticket Detail Success

### Status

```http
200 OK
```

Example:

```json
{
  "ticket": {
    "id": 123,
    "ticketNumber": "TKT-2026-000123",
    "requester": {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@example.com"
    },
    "category": {
      "id": 2,
      "name": "Hardware"
    },
    "relatedSystem": {
      "id": 7,
      "name": "Corporate Laptop"
    },
    "summary": "Laptop battery drains quickly",
    "description": "The laptop battery drops from full charge to 20 percent within two hours.",
    "requestedPriority": "MEDIUM",
    "currentStatus": "NEW",
    "itPriority": null,
    "createdAt": "2026-08-24T07:30:45.123Z",
    "updatedAt": "2026-08-24T07:30:45.123Z"
  }
}
```

---

# 29. Ticket Not Found or Not Owned

If:

* the Ticket does not exist, or
* the Ticket belongs to another Requester

return:

```http
404 Not Found
```

Example:

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket not found."
  }
}
```

The API shall intentionally avoid revealing whether another Requester's Ticket exists.

---

# 30. Attachment Representation

An Attachment metadata object may use:

```json
{
  "id": 45,
  "ticketId": 123,
  "originalFilename": "network-error.png",
  "mimeType": "image/png",
  "sizeBytes": 1258291,
  "isRemoved": false,
  "uploadedAt": "2026-08-24T07:35:10.100Z",
  "removedAt": null,
  "removalReason": null
}
```

The following internal values shall not normally be exposed to the frontend:

* physical storage path
* internal server path
* generated storage filename where unnecessary

---

# 31. Upload Attachment

## 31.1 Endpoint

```http
POST /api/tickets/:ticketId/attachments
```

### Requester Context Required

Yes.

### Content Type

```http
multipart/form-data
```

### Form Field

```text
file
```

Example conceptual request:

```text
file = network-error.png
```

---

# 32. Attachment Upload Rules

The backend shall verify:

1. Ticket exists.
2. Ticket belongs to selected Requester.
3. File is present.
4. File size does not exceed 5 MB.
5. File extension is permitted.
6. MIME type is permitted.
7. Ticket has fewer than five active Attachments.
8. Filename is handled safely.

Allowed extensions:

```text
.jpg
.jpeg
.png
.webp
.pdf
```

Allowed MIME types include:

```text
image/jpeg
image/png
image/webp
application/pdf
```

---

# 33. Attachment Filename Handling

The original filename is stored for display.

Example:

```text
network-error.png
```

The backend shall generate a unique safe storage filename.

Example conceptual value:

```text
a4d90764-4094-43de-9c92-556a499ae123.png
```

The user's filename shall not be directly used as the physical storage path.

Path traversal values such as:

```text
../../secret.txt
```

shall never control the destination path.

---

# 34. Successful Attachment Upload

### Status

```http
201 Created
```

Example:

```json
{
  "attachment": {
    "id": 45,
    "ticketId": 123,
    "originalFilename": "network-error.png",
    "mimeType": "image/png",
    "sizeBytes": 1258291,
    "isRemoved": false,
    "uploadedAt": "2026-08-24T07:35:10.100Z",
    "removedAt": null,
    "removalReason": null
  }
}
```

---

# 35. Unsupported Attachment Type

### Status

```http
415 Unsupported Media Type
```

Example:

```json
{
  "error": {
    "code": "UNSUPPORTED_ATTACHMENT_TYPE",
    "message": "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed."
  }
}
```

---

# 36. Attachment Too Large

### Status

```http
413 Payload Too Large
```

Example:

```json
{
  "error": {
    "code": "ATTACHMENT_TOO_LARGE",
    "message": "Attachment size must not exceed 5 MB."
  }
}
```

---

# 37. Attachment Limit Reached

If the Ticket already has five active Attachments:

```http
409 Conflict
```

Example:

```json
{
  "error": {
    "code": "ATTACHMENT_LIMIT_REACHED",
    "message": "This ticket already has the maximum of five active attachments."
  }
}
```

Removed Attachments do not count toward this limit.

---

# 38. Attachment Upload Ownership Failure

If the Ticket belongs to another Requester:

```http
404 Not Found
```

Example:

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket not found."
  }
}
```

---

# 39. Retrieve Attachment Metadata

## 39.1 Endpoint

```http
GET /api/tickets/:ticketId/attachments
```

### Requester Context Required

Yes.

The Ticket must belong to the selected Requester.

---

# 40. Attachment Metadata Success

### Status

```http
200 OK
```

Example:

```json
{
  "attachments": [
    {
      "id": 45,
      "ticketId": 123,
      "originalFilename": "network-error.png",
      "mimeType": "image/png",
      "sizeBytes": 1258291,
      "isRemoved": false,
      "uploadedAt": "2026-08-24T07:35:10.100Z",
      "removedAt": null,
      "removalReason": null
    },
    {
      "id": 46,
      "ticketId": 123,
      "originalFilename": "old-screenshot.png",
      "mimeType": "image/png",
      "sizeBytes": 900123,
      "isRemoved": true,
      "uploadedAt": "2026-08-24T07:36:00.000Z",
      "removedAt": "2026-08-24T08:00:00.000Z",
      "removalReason": "Wrong screenshot uploaded"
    }
  ]
}
```

Both active and removed Attachment metadata shall remain available to the owner.

---

# 41. Download Active Attachment

## 41.1 Endpoint

```http
GET /api/attachments/:attachmentId/download
```

### Requester Context Required

Yes.

The backend shall verify:

* Attachment exists
* parent Ticket exists
* parent Ticket belongs to selected Requester
* Attachment has not been removed
* physical file is available

---

# 42. Successful Attachment Download

### Status

```http
200 OK
```

Recommended response headers:

```http
Content-Type: image/png
Content-Disposition: attachment; filename="network-error.png"
```

The returned filename should use the safe original display filename.

---

# 43. Removed Attachment Download

A soft-removed Attachment cannot be downloaded.

Recommended status:

```http
404 Not Found
```

Example:

```json
{
  "error": {
    "code": "ATTACHMENT_NOT_AVAILABLE",
    "message": "Attachment not available."
  }
}
```

---

# 44. Missing Physical Attachment File

If Attachment metadata exists but the physical file is unexpectedly unavailable:

```http
404 Not Found
```

Example:

```json
{
  "error": {
    "code": "ATTACHMENT_NOT_AVAILABLE",
    "message": "Attachment not available."
  }
}
```

Internal storage information shall not be exposed.

---

# 45. Cross-Requester Attachment Download

If the Attachment belongs to another Requester's Ticket:

```http
404 Not Found
```

The response shall not reveal ownership information.

---

# 46. Soft-Remove Attachment

## 46.1 Endpoint

```http
DELETE /api/attachments/:attachmentId
```

### Requester Context Required

Yes.

---

# 47. Removal Request Body

```json
{
  "reason": "Wrong screenshot uploaded"
}
```

---

# 48. Removal Reason Validation

Removal reason is required.

Before validation:

* trim leading whitespace
* trim trailing whitespace

Length after trimming:

```text
3–200 characters
```

---

# 49. Successful Soft Removal

The Attachment database record shall remain.

The backend updates:

```text
isRemoved = true
removedAt = current backend timestamp
removalReason = supplied reason
```

Recommended status:

```http
200 OK
```

Example:

```json
{
  "attachment": {
    "id": 45,
    "ticketId": 123,
    "originalFilename": "network-error.png",
    "mimeType": "image/png",
    "sizeBytes": 1258291,
    "isRemoved": true,
    "uploadedAt": "2026-08-24T07:35:10.100Z",
    "removedAt": "2026-08-24T08:05:00.000Z",
    "removalReason": "Wrong screenshot uploaded"
  }
}
```

---

# 50. Invalid Removal Reason

### Status

```http
400 Bad Request
```

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The attachment could not be removed.",
    "fields": {
      "reason": "Removal reason must contain between 3 and 200 characters."
    }
  }
}
```

---

# 51. Remove Already-Removed Attachment

If the Attachment is already removed:

```http
409 Conflict
```

Example:

```json
{
  "error": {
    "code": "ATTACHMENT_ALREADY_REMOVED",
    "message": "This attachment has already been removed."
  }
}
```

---

# 52. Cross-Requester Attachment Removal

If the Attachment belongs to another Requester's Ticket:

```http
404 Not Found
```

Example:

```json
{
  "error": {
    "code": "ATTACHMENT_NOT_FOUND",
    "message": "Attachment not found."
  }
}
```

---

# 53. Ticket Creation With Attachments

Ticket creation and Attachment upload use separate API operations.

The frontend workflow is:

```text
1. Validate Ticket form.
2. POST /api/tickets.
3. Receive created Ticket and Ticket ID.
4. Upload selected valid Attachments individually.
5. Display final Ticket creation result.
```

---

# 54. Partial Attachment Upload Failure

If:

```text
Ticket creation succeeds
```

but:

```text
one or more Attachment uploads fail
```

the Ticket shall remain created.

Example:

```text
Ticket TKT-2026-000123 created successfully.
2 attachments uploaded.
1 attachment failed.
```

The failed Attachment may later be retried from Ticket Detail.

The backend shall not delete a successfully created Ticket because an Attachment upload failed.

---

# 55. Ownership Enforcement

Ownership shall be enforced in the backend for:

```text
GET /api/tickets
GET /api/tickets/:ticketId
POST /api/tickets/:ticketId/attachments
GET /api/tickets/:ticketId/attachments
GET /api/attachments/:attachmentId/download
DELETE /api/attachments/:attachmentId
```

Frontend filtering alone is insufficient.

---

# 56. Ticket Ownership Query Principle

Requester-owned Ticket retrieval should effectively require both:

```text
Ticket ID
AND
Requester ID
```

rather than:

```text
Ticket ID only
```

Conceptually:

```text
ticket.id = requestedTicketId
AND
ticket.requesterId = currentRequesterId
```

This ensures direct URL access cannot bypass Requester ownership.

---

# 57. Attachment Ownership Query Principle

Attachment ownership shall be checked through its parent Ticket.

Conceptually:

```text
attachment.id = requestedAttachmentId
AND
attachment.ticket.requesterId = currentRequesterId
```

---

# 58. HTTP Status Summary

| Status                       | Usage                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `200 OK`                     | Successful retrieval, update/soft removal, or idempotent duplicate submission |
| `201 Created`                | Ticket or Attachment created                                                  |
| `400 Bad Request`            | Invalid input, invalid query parameter, invalid Requester context             |
| `404 Not Found`              | Missing resource, ownership failure, removed/unavailable downloadable file    |
| `409 Conflict`               | Attachment limit, already-removed Attachment, documented state conflict       |
| `413 Payload Too Large`      | File exceeds 5 MB                                                             |
| `415 Unsupported Media Type` | Unsupported Attachment type                                                   |
| `500 Internal Server Error`  | Safe unexpected backend failure                                               |

---

# 59. Endpoint Summary

| Method | Endpoint                                  | Purpose                                | Requester Context |
| ------ | ----------------------------------------- | -------------------------------------- | ----------------- |
| GET    | `/api/requesters`                         | Retrieve active Development Requesters | No                |
| GET    | `/api/categories`                         | Retrieve active Categories             | No                |
| GET    | `/api/related-systems`                    | Retrieve active Related Systems        | No                |
| POST   | `/api/tickets`                            | Create Ticket                          | Yes               |
| GET    | `/api/tickets`                            | Retrieve Requester's Tickets           | Yes               |
| GET    | `/api/tickets/:ticketId`                  | Retrieve one owned Ticket              | Yes               |
| POST   | `/api/tickets/:ticketId/attachments`      | Upload Attachment                      | Yes               |
| GET    | `/api/tickets/:ticketId/attachments`      | Retrieve Attachment metadata           | Yes               |
| GET    | `/api/attachments/:attachmentId/download` | Download active Attachment             | Yes               |
| DELETE | `/api/attachments/:attachmentId`          | Soft-remove Attachment                 | Yes               |

---

# 60. Acceptance-Criteria Traceability

The API shall support the acceptance criteria defined in `specification.md`, including:

| Acceptance Criterion | API Responsibility                          |
| -------------------- | ------------------------------------------- |
| AC-01                | Valid Ticket creation                       |
| AC-03                | Active Requester retrieval                  |
| AC-04                | Correct Requester ownership during creation |
| AC-05                | Cross-Requester Ticket access blocked       |
| AC-06                | Requester-scoped My Tickets                 |
| AC-07                | Requester-specific reload data support      |
| AC-08                | Backend Ticket validation                   |
| AC-09                | Summary trimming                            |
| AC-10                | Description trimming                        |
| AC-13                | Duplicate-submission prevention             |
| AC-14                | Ticket search                               |
| AC-15                | Ticket filtering                            |
| AC-16                | Ticket sorting                              |
| AC-17                | Ticket pagination                           |
| AC-20                | Valid Attachment upload                     |
| AC-21                | Unsupported Attachment rejection            |
| AC-22                | Oversized Attachment rejection              |
| AC-23                | Five-active-Attachment limit                |
| AC-24                | Active Attachment download                  |
| AC-25                | Attachment soft removal                     |
| AC-26                | Removed metadata retention                  |
| AC-27                | Removed download blocked                    |
| AC-28                | Cross-Requester Attachment access blocked   |
| AC-29                | Partial Attachment failure behavior         |
| AC-35                | Safe Requester API failure                  |

---

# 61. API Testing Requirements

Automated API/integration tests shall cover at least:

* active Requester retrieval
* inactive Requester exclusion
* active Category retrieval
* active Related System retrieval
* valid Ticket creation
* backend-generated Ticket Number
* initial `NEW` status
* correct Requester ownership
* invalid Ticket fields
* Summary boundaries
* Description boundaries
* invalid Category
* invalid Related System
* invalid Requested Priority
* duplicate submission
* Requester-owned list
* search
* filters
* sorting
* pagination
* invalid query parameters
* owned Ticket Detail
* cross-Requester Ticket access
* valid Attachment upload
* invalid Attachment extension/type
* oversized Attachment
* five-active-Attachment limit
* Attachment metadata retrieval
* Attachment download
* Attachment soft removal
* invalid removal reason
* already-removed Attachment behavior
* removed Attachment download rejection
* cross-Requester Attachment access
* safe unexpected-error behavior

The actual test-file paths shall be documented in:

```text
docs/lab-02/tests.md
```

---

# 62. Lab 3 Transition

The following Lab 2 header:

```http
X-Development-Requester-Id
```

is temporary.

In Lab 3, real authentication shall determine the Requester identity.

The Ticket and Attachment endpoints should therefore isolate Requester-context resolution so that the temporary header can later be replaced without redesigning Ticket ownership or API resource structures.

No passwords, authentication tokens, login sessions, or role-based authorization shall be added as part of Lab 2.

---

# 63. API Contract Approval Checklist

Before implementation begins:

* [ ] Endpoint paths are approved.
* [ ] HTTP methods are approved.
* [ ] Development Requester context mechanism is approved.
* [ ] Ticket request shape is approved.
* [ ] Ticket response shape is approved.
* [ ] Ticket Number generation responsibility is clear.
* [ ] Validation limits match `specification.md`.
* [ ] Search fields are documented.
* [ ] Filter fields are documented.
* [ ] Sort fields are documented.
* [ ] Pagination behavior is documented.
* [ ] Ownership behavior is documented.
* [ ] Cross-Requester behavior is documented.
* [ ] Attachment types are documented.
* [ ] 5 MB Attachment limit is documented.
* [ ] Five-active-Attachment limit is documented.
* [ ] Soft-removal behavior is documented.
* [ ] Removal reason behavior is documented.
* [ ] Removed Attachment download behavior is documented.
* [ ] Partial upload failure behavior is documented.
* [ ] Safe API errors are documented.
* [ ] Expected HTTP status codes are documented.
* [ ] Contract is consistent with `specification.md`.
* [ ] Contract is consistent with `ui-spec.md`.
