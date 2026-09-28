# Lab 3 UI Specification

## 1. UI Goal

Lab 3 extends the existing TokTickIT Zen Green interface from Lab 2. The application shall support authenticated Requester, IT Staff, and Administrator users while preserving the same visual language, reusable components, responsive behavior, and accessibility conventions.

The Development Requester selector from Lab 2 shall be removed and replaced with the authenticated user's name and role.

---

## 2. Application Shell

After authentication, the application header shall display:

- TokTickIT logo/name
- current user's name
- current user's role
- role-specific navigation
- Logout action

### Requester Navigation

- My Tickets
- Create Ticket
- Profile / Logout

### IT Staff Navigation

- My Queue
- Profile / Logout

### Administrator Navigation

- Admin
- Profile / Logout

Unauthorized destinations shall not be displayed.

Backend authorization remains authoritative even when frontend controls are hidden.

---

## 3. Login Screen

### Fields

- Email Address
- Password

### Actions

- Sign In
- Show/Hide Password

### Required States

- initial
- validation error
- signing in
- invalid credentials
- inactive account
- safe API failure

During submission, the Sign In button shall be disabled and display a busy state.

Authentication failures shall not reveal whether the email address or password was incorrect.

Example safe message:

`The email address or password is incorrect.`

---

## 4. Mandatory Change Password Screen

Users marked as requiring a password change shall see this screen before normal application access.

### Fields

- Current Password
- New Password
- Confirm New Password

### Password Rules

The new password must:

- contain at least 8 characters
- contain an uppercase letter
- contain a lowercase letter
- contain a number
- contain a special character
- match the confirmation field

### Actions

- Continue
- Show/Hide Password

Normal application navigation shall remain unavailable until the password change succeeds.

Required states:

- initial
- validation error
- saving
- success
- safe failure

---

## 5. Requester Screens

The following Lab 2 screens remain:

- Create Ticket
- My Tickets
- Requester Ticket Detail
- Attachments

The Development Requester selector and Change Requester action shall be removed.

Requester identity shall come from the authenticated account.

---

## 6. Requester Ticket Detail Additions

Lab 3 adds:

- Public Comments
- Problem Appears Resolved

### Public Comments

Each Public Comment displays:

- author name
- author role
- timestamp
- comment content

Requester may enter a Public Comment using a multiline text field.

Actions:

- Post Comment

Whitespace-only comments shall be rejected.

### Problem Appears Resolved

Requester Ticket Detail shall provide:

`Problem Appears Resolved`

Selecting this action shall display confirmation before saving.

The interface shall clearly explain that IT Staff remain responsible for formally resolving or closing the Ticket.

---

## 7. IT Staff Ticket Queue

The IT Staff home screen shall be:

`My Queue`

The Queue shall provide:

- search
- filters
- sorting
- pagination
- Ticket ownership information
- Requested Priority
- IT Priority
- Ticket status
- action to open Ticket Detail

### Search

Searchable information:

- Ticket Number
- Summary
- Requester Name
- Requester Email

### Filters

Required filters:

- Status
- IT Priority
- Ownership

Ownership options should include:

- All Tickets
- Unassigned
- My Tickets

### Sorting

Supported fields may include:

- Last Updated
- Created Date
- Ticket Number
- Summary
- Requested Priority
- IT Priority
- Status

Default:

`Last Updated - Newest First`

---

## 8. Ticket Queue Desktop Layout

Recommended columns:

| Field |
| --- |
| Ticket Number |
| Updated |
| Summary |
| Requested Priority |
| IT Priority |
| Status |
| Owner |
| Open |

The Queue shall avoid an unreadable mega-grid.

Unassigned Tickets shall explicitly show:

`Unassigned`

---

## 9. Ticket Queue Mobile Layout

The desktop table shall change to cards or another compact vertical layout.

Each Ticket card shall include:

- Ticket Number
- Summary
- Requested Priority
- IT Priority
- Status
- Owner
- Last Updated
- Open Ticket action

Mobile screens shall not require horizontal page scrolling.

---

## 10. Ticket Queue States

The Queue shall support:

### Loading

Show loading indicator or skeleton rows/cards.

### Empty

`There are currently no tickets in the queue.`

### No Results

`No tickets match your current search or filters.`

Provide:

`Clear Filters`

### Forbidden

`You do not have permission to access this page.`

### Failure

`The ticket queue could not be loaded. Please try again.`

---

## 11. IT Staff Ticket Detail

The Ticket Detail screen shall display:

- Ticket Number
- Ticket Date
- Requester
- Category
- Related System
- Requested Priority
- IT Priority
- Ticket Owner
- Current Status
- Summary
- Description
- Requester resolution indication
- Public Comments
- Internal Notes
- Attachments

Read-only and editable fields shall be visually different.

---

## 12. Ticket Ownership

Ticket Owner shall show either:

- assigned user's name
- `Unassigned`

For an unassigned Ticket, IT Staff shall have:

`Claim Ticket`

IT Staff may also assign or reassign the Ticket using an eligible owner selection control.

Only active eligible Ticket Owners shall appear.

Required states:

- saving
- success
- validation failure
- safe API failure

---

## 13. Requested Priority and IT Priority

Requested Priority shall remain read-only.

IT Priority shall be editable by permitted users.

Both shall be displayed clearly as separate values.

Priority badges:

- Low
- Medium
- High

Changing IT Priority shall not visually or functionally change Requested Priority.

---

## 14. Ticket Status

Required Ticket statuses:

- New
- Open
- In Progress
- Waiting for Requester
- Resolved
- Closed
- Reopened
- Cancelled

The status control shall show only permitted next transitions where practical.

Significant changes such as Resolved, Closed, or Cancelled should request confirmation.

The backend shall still validate all transitions.

---

## 15. Public Comments — IT Staff

Public Comments shall clearly indicate:

`Visible to Requester`

Each entry displays:

- author
- role
- timestamp
- content

IT Staff may add a comment using:

`Post Comment`

Whitespace-only content shall be rejected.

---

## 16. Internal Notes

Internal Notes shall be visually distinct from Public Comments.

The interface shall clearly state:

`Private — IT Staff and Administrators only`

Each Internal Note displays:

- author
- role
- timestamp
- content

IT Staff may add:

`Add Internal Note`

Action:

`Add Note`

The interface shall also display:

`This note is not visible to the Requester.`

Internal Notes shall not provide edit or delete actions in Lab 3.

---

## 17. Attachments

Existing Lab 2 Attachment functionality and presentation shall continue to work.

IT Staff Ticket Detail shall preserve access to permitted Attachment information.

Long filenames shall wrap or truncate safely without causing horizontal overflow.

---

## 18. Administrator User Management

The Administrator screen shall be intentionally simple.

Title:

`Users`

Required functions:

- user list
- search
- optional role filter
- Create User
- Edit User
- activate/deactivate account
- set new initial password

---

## 19. User List

Desktop columns:

| Field |
| --- |
| Name |
| Email |
| Role |
| Status |
| Edit |

Role badges:

- Requester
- IT Staff
- Administrator

Status badges:

- Active
- Inactive

---

## 20. User Search and Filter

Search placeholder:

`Search name or email`

Optional role filter:

- All Roles
- Requester
- IT Staff
- Administrator

No-results message:

`No users match your current search or filter.`

---

## 21. Create User

Required fields:

- Full Name
- Email Address
- Role
- Active
- Initial Password

Exactly one role may be selected.

Allowed roles:

- Requester
- IT Staff
- Administrator

The Initial Password section shall state:

`The user must change this password at the next login.`

Actions:

- Create User
- Cancel

---

## 22. Create User Validation

Validation shall cover:

- missing name
- invalid email
- duplicate email
- invalid role
- missing initial password
- invalid password

Example duplicate message:

`A user with this email address already exists.`

---

## 23. Edit User

Editable fields:

- Name
- Email
- Role
- Activation State

Action:

`Save Changes`

The user's existing password shall never be displayed.

---

## 24. Set New Initial Password

Administrator may select:

`Set New Initial Password`

The interface shall request a new password and explain:

`The user will be required to change this password at the next login.`

After success:

`New initial password set successfully.`

The password shall not be displayed afterward.

---

## 25. User Activation

Active accounts may be deactivated.

Inactive accounts may be activated.

Deactivation shall use clear warning/destructive styling.

Confirmation example:

`Deactivate this user?`

Supporting text:

`The user will no longer be able to sign in. Existing ticket history will remain.`

---

## 26. Administrator Safety Rules

### Self-Deactivation

The logged-in Administrator shall not be allowed to deactivate their own account.

Display:

`You cannot deactivate your own account.`

### Last Active Administrator

If an operation would leave no active Administrator:

`At least one active Administrator must remain.`

Backend enforcement remains mandatory.

---

## 27. Responsive User Management

Desktop may use:

- user table
- create/edit side panel

Tablet may use:

- reduced table
- drawer/panel

Mobile shall use:

- stacked user cards
- full-width or responsive create/edit panel

No horizontal page scrolling shall be required.

---

## 28. Badges

Consistent badges shall be used for:

### Ticket Status

- New
- Open
- In Progress
- Waiting for Requester
- Resolved
- Closed
- Reopened
- Cancelled

### Priority

- Low
- Medium
- High

### User Role

- Requester
- IT Staff
- Administrator

### User Status

- Active
- Inactive

Badge text shall always be displayed. Color shall not be the only indication.

---

## 29. Global Feedback

Major screens shall provide appropriate feedback for:

- Loading
- Saving
- Success
- Validation
- Empty
- No Results
- Forbidden
- Not Found
- Conflict
- Safe API Failure

Raw backend errors, stack traces, database errors, and internal system information shall never be displayed.

---

## 30. Forbidden State

Reusable message:

`You do not have permission to access this page.`

No protected content shall be rendered before or behind the message.

---

## 31. Safe Not Found State

For inaccessible or missing protected resources:

`The requested item could not be found.`

Requester ownership failures shall not reveal that another Requester owns the resource.

---

## 32. Session Expiration

When a session expires:

- authenticated state shall be cleared
- protected content shall no longer be accessible
- user shall return to Login

Optional message:

`Your session has expired. Please sign in again.`

---

## 33. Responsive Requirements

### Desktop

- tables may be used
- Ticket information may use multiple columns
- User Management may use split layout

### Tablet

- controls may wrap
- reduced tables or cards may be used
- no content overlap

### Mobile

- forms stack vertically
- wide tables become cards
- controls remain touch-friendly
- no unintended horizontal overflow
- required actions remain accessible

---

## 34. Accessibility

Lab 3 shall preserve Lab 2 accessibility expectations.

Required:

- labels associated with inputs
- keyboard-accessible controls
- visible focus states
- logical tab order
- sufficient contrast
- text labels in addition to color
- accessible confirmation dialogs
- readable validation messages
- no required interaction based only on hover

---

## 35. Safe Rendering

Public Comments and Internal Notes shall be displayed as plain text.

User content shall not be rendered as executable HTML.

Long content shall wrap safely.

---

## 36. Required Screen Modes

### Login

- initial
- validation
- busy
- authentication failure
- safe failure

### Change Password

- initial
- validation
- busy
- success
- safe failure

### Requester Ticket Detail

- loading
- normal view
- posting comment
- resolution confirmation
- validation
- success
- not found
- safe failure

### IT Staff Queue

- loading
- populated
- empty
- no results
- forbidden
- safe failure

### IT Staff Ticket Detail

- loading
- view
- editing
- saving
- success
- validation/conflict
- forbidden
- not found
- safe failure

### User Management

- loading
- list
- search/filter result
- no results
- create
- edit
- saving
- success
- validation
- conflict
- forbidden
- safe failure

---

## 37. Suggested Reusable Components

Existing Lab 2 components should be reused where possible.

New reusable components may include:

- AppHeader
- UserIdentityMenu
- RoleBadge
- StatusBadge
- PriorityBadge
- LoadingState
- EmptyState
- NoResultsState
- ErrorState
- ForbiddenState
- Pagination
- SearchInput
- ConfirmationDialog
- PublicCommentList
- PublicCommentComposer
- InternalNoteList
- InternalNoteComposer
- TicketOwnerControl
- TicketStatusControl

---

## 38. Conceptual Routes

```text
/login
/change-password

/my-tickets
/tickets/new
/tickets/:ticketId

/staff/tickets
/staff/tickets/:ticketId

/admin/users