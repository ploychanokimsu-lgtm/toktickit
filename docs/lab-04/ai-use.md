# Lab 4 AI Use and Reflection

> Started in Issue #55. Completed in Issue #61.

## AI Tools Used

- **Claude (Anthropic) in Claude Code:** specification agent for Issue #55. It read the Lab 4 handout, the Lab 3 specification, code, and tests, and drafted the Sprint 4 engineering contract and the GitHub Issues.
- Coding-agent use for later issues will be recorded here as they are completed.

The student team remained responsible for reviewing every document, confirming open decisions with the TA, running tests, and approving Pull Requests.

---

## Selected Key Prompts

| # | Prompt / Task | How It Helped |
|---|---|---|
| 1 | "Check Lab 4 for me: what do I need to do, how many GitHub issues to create, how much code to modify. Draft everything needed." | Produced the Lab 4 plan, the 7-issue breakdown, and a size estimate from the handout and the Lab 3 codebase. |
| 2 | "Search GitHub to ensure the seven Lab 4 issues do not already exist, then create them … Before freezing the Actions Taken specification, clearly flag the ambiguity concerning assign, complete, cancel, and inactive-assignee rejection. Do not invent requirements silently." | Created issues #55–#61 without duplicates. The assignee/lifecycle conflict between handout §3/§8.3 and §14 Part 6 was recorded as open decision D-01 instead of being silently implemented. |
| 3 | "Complete all Issue 1 documentation requirements following the specification-first workflow." | Drafted `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`. Cross-checking against the Lab 3 code found three doc/code mismatches (terminal statuses, error shape, queue parameter names), which were recorded as decisions D-04 and D-05 and as notes in the API spec. |

| 4 | "Let's get to the new issue … just do your thing." (Issue #56, Actions Taken Foundation) | Adopted Option B for D-01 and implemented the `ActionTaken` migration, idempotent seed, staff and Requester APIs, and 49 server tests. The full server suite was run against a dedicated local test database before committing. |

| 5 | "Review merged, start #57." (Actions Taken UI) | Built the Actions Taken list, create, view and edit UI for staff and the read-only Requester view, with 15 component tests and 2 E2E tests. The E2E run found a real bug (an action recorded in the same minute as Ticket creation was rejected), which was fixed in the backend rule. |

| 6 | "Done merge and start next." (Issue #58, Ticket Workflow and Resolution Gate) | Moved the transition matrix into a shared module, added the resolution gate and `expectedStatus` stale-update check in one transaction, added the workflow endpoint and status control with a confirmation dialog, and updated the Lab 3 tests that relied on the old request shape. |

(Prompts 7–10 will be added during implementation issues #59–#61.)

---

## My Reflection

(To be written by the student in Issue #61.)
