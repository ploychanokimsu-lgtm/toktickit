# Lab 2 AI Use and Reflection

## AI Tool Used

I used ChatGPT by OpenAI as an AI specification and coding assistant during Lab 2.

The AI was used to help interpret the stakeholder request, refine the engineering contract, plan tests, review implementation decisions, debug problems, and prepare documentation.

I remained responsible for reviewing the generated specifications, running the code and tests, checking the UI manually, correcting errors, managing Git branches and Pull Requests, and deciding when the implementation satisfied the Lab 2 requirements.

---

# Selected Key Prompts

| # | Prompt / Task | How It Helped |
|---|---|---|
| 1 | "Read the Lab 2 requirements and create a complete sprint engineering specification with functional requirements, business rules, acceptance criteria, data decisions, API decisions, UI rules, and Definition of Done." | Helped convert the stakeholder request into the initial engineering contract before implementation. |
| 2 | "Create the database models and repeatable seed data for Development Requesters, Tickets, Attachments, Categories, and Related Systems." | Helped design the Prisma increment and required Lab 2 seed data. |
| 3 | "Implement the temporary Development Requester context as a testing mechanism, not authentication, including active-user loading, selection persistence, and Change Requester behavior." | Helped implement the temporary multi-Requester testing context while keeping authentication out of Lab 2 scope. |
| 4 | "Implement Create Ticket using the approved specification and tests. The backend must generate the official Ticket Number and the Ticket must belong to the selected Development Requester." | Guided the Create Ticket API/UI implementation and validation behavior. |
| 5 | "Implement My Tickets with backend Requester ownership enforcement, search, filtering, sorting, pagination, loading, empty, no-results, and error states." | Helped build the Requester-owned Ticket listing and its automated tests. |
| 6 | "Implement Requester Ticket Detail as read-only information and return the same safe 404 for missing and non-owned Tickets." | Helped implement Ticket Detail while preventing ownership-information leakage. |
| 7 | "Implement the complete Attachment lifecycle: JPG/JPEG/PNG/WEBP/PDF only, maximum 5 MB, maximum five active attachments, download, soft removal with reason, retained metadata, and blocked download after removal." | Helped implement and test the most complex Lab 2 feature. |
| 8 | "Create Playwright E2E tests covering Requester selection, Ticket creation, My Tickets, Ticket Detail, Attachment lifecycle, ownership isolation, and responsive desktop/tablet/mobile screenshots." | Helped produce complete workflow and responsive verification evidence. |
| 9 | "Review failing TypeScript, Vitest, and Playwright output and identify the smallest safe correction without breaking previously passing functionality." | Helped debug build typing, test concurrency, asynchronous reference-data loading, and responsive selector issues. |
| 10 | "Review the completed Lab 2 repository against the handout and prepare reviewer, AI-use, final test, README, and release documentation." | Helped perform the final completion audit and prepare submission evidence. |

---

# My Reflection

Using AI was most useful when the task involved many connected requirements across the frontend, backend, database, tests, and Git workflow. It helped me turn the Lab 2 handout into smaller implementation steps and helped identify problems faster when tests failed.

I also learned that AI-generated code cannot simply be accepted as correct. Several solutions still required me to run tests, inspect the browser, check the database, verify Git branches, and correct mistakes. The most useful workflow was to use AI for planning and debugging, then verify each result using automated tests and manual evidence.

Overall, AI made development faster, but the specifications, test results, Pull Requests, and final application behavior were still my responsibility.