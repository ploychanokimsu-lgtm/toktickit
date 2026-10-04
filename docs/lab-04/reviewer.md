# Lab 4 Peer Review Record

## Student

Ploychanok Imsuwan (GitHub: `ploychanokimsu-lgtm`)

## Peer Reviewer

Pow Wongtanakarn (GitHub: `Powwong`)

---

# 1. Review Process

Lab 4 followed the staged Git workflow used in Labs 2 and 3:

1. Each GitHub Issue (#55–#61) was developed on its own feature branch created from `lab4-staging`.
2. Each branch was submitted as a Pull Request into `lab4-staging`, with a description of the changes and the verification that was run.
3. The peer reviewer checked the changes, the test evidence, and the screenshots, then posted a review and approved the PR.
4. The student replied to every review, explained decisions, and recorded follow-up work in later issues.
5. Approved PRs were merged into `lab4-staging` with a merge commit, and the linked issue was closed.
6. `lab4-staging` is merged into `main` through a final reviewed Pull Request.

No PR was merged without an approval, and nothing was pushed directly to `main` or `lab4-staging`.

---

# 2. Lab 4 Pull Requests

| PR | Issue | Work | Reviewer | Result |
|---|---|---|---|---|
| [#62](https://github.com/ploychanokimsu-lgtm/toktickit/pull/62) | #55 | Sprint 4 Engineering Contract | Powwong | Approved, merged 2026-10-04 |
| [#63](https://github.com/ploychanokimsu-lgtm/toktickit/pull/63) | #56 | Actions Taken Foundation | Powwong | Approved, merged 2026-10-04 |
| [#64](https://github.com/ploychanokimsu-lgtm/toktickit/pull/64) | #57 | Actions Taken UI on Ticket Detail | Powwong | Approved, merged 2026-10-04 |
| [#65](https://github.com/ploychanokimsu-lgtm/toktickit/pull/65) | #58 | Ticket Workflow and Resolution Gate | Powwong | Approved, merged 2026-10-04 |
| [#66](https://github.com/ploychanokimsu-lgtm/toktickit/pull/66) | #59 | Requester Dashboard | Powwong | Approved, merged 2026-10-04 |
| [#67](https://github.com/ploychanokimsu-lgtm/toktickit/pull/67) | #60 | IT Staff and Administrator Dashboard | Powwong | Approved, merged 2026-10-04 |
| Issue #61 PR | #61 | Final Hardening, Regression and Release Evidence | Powwong | This record is part of that PR |
| `lab4-staging` → `main` | All | Lab 4 release | Powwong | Final release PR |

---

# 3. Review Comments and Responses

## PR #62: Sprint 4 Engineering Contract

**Review (Powwong, approved):** The specification documents are clearly structured, and the requirements, API, UI, and planned tests are consistent. D-01 still needed confirmation: the grading criteria mention assigning, completing, and cancelling Actions Taken, including inactive-assignee rejection, but those fields were not in the main field list. The reopen behavior and the `expectedStatus` approach look reasonable. The full server suite should be run against `toktickit_test` before implementation.

**Response (Ploy):** D-01 stays pending until confirmed. The reopen documentation inconsistency and the `expectedStatus` changes are noted for #58. The full server suite will run against `toktickit_test` before implementation.

**Outcome:** D-01 was decided in #56: Option B (assignee plus a Planned/Completed/Cancelled lifecycle) was adopted and recorded in `specification.md` §11.1. The full server suite (134 tests) was run before any Lab 4 code was written.

## PR #63: Actions Taken Foundation

**Review (Powwong, approved):** The migration only adds the Actions Taken table, so Lab 1–3 data is protected. Performed By comes from the signed-in user, and recording an action does not change the Ticket Owner. Concurrency and lifecycle validation are covered. Suggestion for #60: add an IT Staff seed account with no assigned Tickets to demonstrate the zero "My Assigned" state. The server tests were run against `toktickit_test`: 183 passed.

**Response (Ploy):** The seed account will be added in #60. No changes were needed for this PR. Verification: 183 server tests, 67 client tests, both builds, and `git diff --check`.

**Outcome:** Implemented in #60 (Mali Kaewdee, PR #67).

## PR #64: Actions Taken UI on Ticket Detail

**Review (Powwong, approved):** Staff can list, add, view, and edit actions; Requesters get a read-only view. Follow-up validation, loading, error handling, and stale-edit recovery work. Edit appears only when allowed, and write controls are hidden on Closed or Cancelled Tickets. No horizontal scrolling at 375px. Dates follow the browser locale; standardize them in #61.

**Response (Ploy):** Dates will be standardized in #61 together with the navigation contrast clean-up. Verification: 82 client tests, 183 server tests, 2 Lab 4 E2E tests, and the Lab 3 E2E.

**Outcome:** Navigation contrast was fixed in #59 (PR #66). Dates now use one shared format (`client/src/format.ts`, Asia/Bangkok) in #61.

## PR #65: Ticket Workflow and Resolution Gate

**Review (Powwong, approved):** The resolution rules match the specification, including follow-up handling and cancelled actions. Transition tests cover allowed and rejected changes. The stale-status check and the gate run safely before the update. Blocked resolution shows clear reasons; Closed and Cancelled require confirmation with proper keyboard and focus behavior. Question: should reopening a Closed Ticket also require confirmation?

**Response (Ploy):** Confirmation is kept for Closed and Cancelled only, because those make Actions Taken read-only. Reopening restores editing and removes no data, as defined in `ui-spec.md` §6.

**Outcome:** No change; decision documented.

## PR #66: Requester Dashboard

**Review (Powwong, approved):** Dashboard data is limited to the signed-in Requester, and the status filter does not expose other users' Tickets. "Waiting for Me" opens My Tickets with the correct filter. Signed-in Requesters land on the Dashboard while Lab 2 development mode still opens Create Ticket. The empty state and the new navigation work. Suggestion: add "Updated" before the time in Recently Updated.

**Response (Ploy):** "Updated" will be added to both dashboards' Ticket lists in #60.

**Outcome:** Implemented in #60 (shared `DashboardTicketList`).

## PR #67: IT Staff and Administrator Dashboard

**Review (Powwong, approved):** Metrics, Ticket lists, and navigation behave correctly for IT Staff and Administrators. Mali Kaewdee demonstrates the zero "My Assigned" state. Including Reopened HIGH Tickets in Urgent makes sense because Reopened is active. The Lab 3 test changes only add the navigation step, so the original coverage is kept.

**Response (Ploy):** Reopened HIGH Tickets are included on purpose because Reopened is an active status (BR-26).

**Outcome:** No change needed.

---

# 4. Summary

Every Lab 4 Pull Request was reviewed and approved by the peer reviewer before merging. All five reviewer suggestions or questions were answered. Three led to changes in later issues (zero-assignment seed account, "Updated" label, consistent date format), and two were answered with documented decisions (reopen confirmation, Urgent includes Reopened).
