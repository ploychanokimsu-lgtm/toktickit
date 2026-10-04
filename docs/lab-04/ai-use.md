# Lab 4 AI Use and Reflection

## LLM Used

**Claude Opus 5.5 (Anthropic)**, used through **Claude Code** in the terminal, connected to the local repository and to GitHub through the GitHub CLI.

It was used in two roles:

- **Specification agent (Issue #55):** read the Lab 4 handout and the Lab 3 specification, code and tests, then drafted the Sprint 4 engineering contract (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) and the seven GitHub Issues.
- **Coding agent (Issues #56–#61):** implemented each issue on its own feature branch, ran the server, client and Playwright suites against a dedicated `toktickit_test` database, and opened a Pull Request into `lab4-staging`.

The student team stayed responsible for every decision and review. The peer reviewer (Pow Wongtanakarn) reviewed and approved every Pull Request on GitHub, and the student (Ploychanok Imsuwan) replied to each review and merged the approved work. AI attribution was intentionally kept out of commits and Pull Requests; this document is where AI use is disclosed.

---

## Selected Key Prompts

| # | Prompt / Task | How It Helped |
|---|---|---|
| 1 | "Check Lab 4 for me: what do I need to do, how many GitHub issues to create, how much code to modify. Draft everything needed." | Produced the Lab 4 plan, the seven-issue breakdown and a size estimate from the handout and the Lab 3 codebase. |
| 2 | "Search GitHub to ensure the seven Lab 4 issues do not already exist, then create them … Before freezing the Actions Taken specification, clearly flag the ambiguity concerning assign, complete, cancel, and inactive-assignee rejection. Do not invent requirements silently." | Created Issues #55–#61 without duplicates. The conflict between the handout's Action Taken field list and the Part 6 grading was recorded as open decision D-01 instead of being implemented silently. |
| 3 | "Complete all Issue 1 documentation requirements following the specification-first workflow." | Drafted the four contract documents. Cross-checking them against the Lab 3 code found three documentation/code mismatches (terminal statuses, error shape, queue parameter names), recorded as decisions D-04 and D-05. |
| 4 | "Let's get to the new issue … just do your thing." (Issue #56) | Adopted Option B for D-01 and built the `ActionTaken` migration, idempotent seed, staff and Requester APIs and 49 server tests. A local test database was created first so the full suite could run before any change was committed. |
| 5 | "Review merged, start #57." (Actions Taken UI) | Built the Actions Taken list, create, view and edit UI with component and E2E tests. The E2E run exposed a real bug (an action recorded in the same minute a Ticket was created was rejected), which was fixed in the backend rule. |
| 6 | "Done merge and start next." (Issue #58, Workflow) | Added the resolution gate and `expectedStatus` stale-update check in one transaction, the workflow endpoint, and a status control with an accessible confirmation dialog. The Lab 3 tests that used the old request shape were updated, not removed. |
| 7 | "Review is done merge and start next one." (Issue #59, Requester Dashboard) | Added the Requester dashboard with drill-down to a new My Tickets status filter. Reviewing the screenshots found two earlier-lab defects (unreadable navigation, a fixed "New" status badge), which were fixed. |
| 8 | "Merge done start next!" (Issue #60, Staff Dashboard) | Added the staff and administrator dashboard, let Administrators reach the Ticket Queue, and wrote tests comparing every count with a direct database query. |
| 9 | "Merge and start next." (Issue #61, Final Hardening) | Added a regression E2E covering the Lab 2–3 features through the signed-in app with a console-error check, keyboard and style tests, one shared date format, the review record, and the release evidence. |

---

## My Reflection

**Specification agent.** Working specification-first made the rest of the sprint smoother. The most valuable moment was not the drafting itself but the cross-check against the existing code: the AI found that the Lab 3 documents and the Lab 3 code disagreed on terminal statuses, the error format, and queue parameter names. Without that check, Lab 4 would have been specified against behavior that did not exist. Asking it explicitly to flag ambiguity rather than resolve it silently was important. D-01 stayed visible in the contract and the review until the team made a decision, instead of quietly becoming a design choice.

**Coding agent.** The coding agent was fast, but the useful part was the verification loop. Every issue was run against a dedicated test database before a Pull Request was opened, and several problems were only found that way: a real date-boundary bug discovered by an end-to-end test, a client build failure caused by a test type error, and unreadable navigation that only showed up when the screenshots were actually looked at. The agent also made mistakes, mostly in its own scripted file edits, which the tests caught before anything was committed.

**What I learned.** AI makes it easy to produce a lot of code quickly, which makes review and evidence more important, not less. The parts I relied on most were the traceability from acceptance criteria to tests, the habit of reading screenshots instead of only trusting green test runs, and keeping decisions written down in the specification so the reviewer could challenge them. I remained responsible for the decisions, the reviews and what was merged.
