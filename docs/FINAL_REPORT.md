# Final report - CampusGig V1

Project: CampusGig V1 (Student Job and Micro-Task Marketplace) | Team CodeConnect | BUBT | CSE 328 Software Engineering Lab | SOW #001 (16 Sep 2026 - 15 Dec 2026) | Incremental Model

## 1. Summary

CampusGig is a two-sided web marketplace. University students find short-term jobs; individuals, businesses and organizations (posters) find reliable student help. Trust comes from profiles, a controlled application workflow, two-way reviews, reporting, and admin moderation. The system was delivered in eight increments. Increment 8 was added after Increment 7 because the course teacher asked for a new requirement (learning resources).

## 2. Delivered scope

| Area | What was delivered | Increment |
|---|---|---|
| Authentication and authorization | Register (Student or Poster), login, logout, session persistence, bcrypt hashing, JWT, backend role checks, suspended accounts blocked on every request | 2 |
| Profiles and dashboards | Student and poster profiles, profile completeness, rating summary, role dashboards | 2 |
| Job marketplace | Create, edit, close, cancel, delete jobs; public browse, search, filter, sort, pagination; job details | 3 |
| Applications | Apply once per job, shortlist, accept (rejects the rest, job becomes In progress), reject, withdraw | 4 |
| Completion, reviews, messaging, reports | Mark completed, two-way reviews (one per direction), non-real-time messaging, report a job or user | 5 |
| Admin panel | Statistics, suspend or reactivate users, remove or restore jobs and reviews, resolve or dismiss reports, manage categories | 6 |
| Final documentation | This report, viva preparation, final checklist | 7 |
| Learning resources | Admin attaches videos, links and notes to a job; students and visitors see them on the job page and the apply page | 8 |

Out of scope for Version 1 (listed as Version 2 ideas): payments and escrow, real-time chat, identity verification and trust badges, AI recommendations, profile photo upload, email change and verification, password reset, suspension reasons and appeals, resources shared across jobs.

## 3. Requirements coverage

All functional requirements FR-01 to FR-18 in `SRS.md` are implemented. Each has code in `server/src` and `client/src` and tests in `server/tests` (the browser-only parts are covered by `MANUAL_VERIFICATION.md`).

## 4. Architecture in one paragraph

A single-repository monolith: a React single-page app (Vite, React Router, Tailwind 4) calls an Express 4 REST API, which uses Mongoose models on MongoDB. The backend has fixed layers: route, then middleware (authenticate, authorize, validate), then controller, then service (business rules), then model. Every request body is checked by a zod schema. See `ARCHITECTURE.md`.

## 5. Size of the system

| Item | Count |
|---|---|
| Server source lines (`server/src`) | about 3,700 |
| Server test lines (`server/tests`) | about 4,100 |
| Client source lines (`client/src`) | about 5,000 |
| MongoDB collections | 9 (users, categories, jobs, applications, reviews, conversations, messages, reports, learningresources) |
| Route handlers | 57 |
| Client pages | 28 |
| Automated tests | 290 |

## 6. Verification

The developer ran the checks below on their own machine (Windows, local MongoDB). Details per increment are in `PROGRESS.md` and `TESTING.md`.

| Increment | Automated result | Browser result |
|---|---|---|
| 1-2 | 51 passed, 0 failed | Confirmed (registration, login, dashboards) |
| 3 | 83 passed, 0 failed | Confirmed (create job, categories, job details) |
| 4 | 117 passed, 0 failed | Confirmed (apply, shortlist, accept, withdraw) |
| 5 | Run by the developer, passed (186 tests at that point) | Confirmed (completion, reviews, messaging; chat polling added) |
| 6 | 246 passed, 0 failed | Confirmed (admin panel actions) |
| 8 | 290 passed, 0 failed (16 Nov 2026) | Checklist 65-73 to be ticked by the developer |

Static checks: ESLint was clean for client and server, and `node --check` passed on every server file (author's sandbox).

Not recorded as done: the browser checklist 54-73 as one final pass, and a fresh `vite build` of the final code. Run them before submission (see `MANUAL_VERIFICATION.md`).

## 7. Problems found and fixed (highlights)

| Bug | Cause | Fix |
|---|---|---|
| BF1: job creation and job links failed in the browser | `Job` and `Category` models lacked `toJSON: { virtuals: true }`, so `id` was missing from API responses | Added the option, added regression tests that assert `id` is present |
| BF2: deadline of "today" rejected | Date-only value parsed as UTC midnight; Bangladesh is UTC+6 | Deadline is the end of the picked day in local time |
| BF3: lint failures | Duplicate key in a test helper, unescaped apostrophe in a page | Fixed |
| Seed gave jobs to the wrong poster | Seed used positions, not emails | Seed looks posters up by email and clears applications |
| Chat only updated after refresh | No polling | Open threads check every 5 seconds |
| Server could not reach MongoDB (ECONNREFUSED) | MongoDB service was not running | Start MongoDB before seed, login or tests |

## 8. Key design decisions

The full list is in `DECISIONS.md` (D1-D50, B1-B21). The ones most worth knowing: monolith (D1); JWT with only the user id so suspension takes effect at once (D8); strict zod schemas against mass assignment (D11); admin removal is a flag, not a delete (B1, B11); accept is made safe with a conditional update instead of a transaction (D31); messages are near-real-time by polling (D38); learning resources are added only by an admin, per job (B16).

## 9. Known limitations

- Messaging is polling every 5 seconds, not instant push.
- No profile photo upload, email change, email verification or password reset.
- Suspension has no reason, expiry or appeal.
- JWT is kept in localStorage (D7); an XSS bug would expose it. Version 2 can use httpOnly cookies.
- The accept step is not a database transaction (D31); a crash between two updates could leave data half-updated.
- A learning resource belongs to one job; the admin must add the same lesson again for another job (B17).
- Learning resource links are chosen by the admin; the app does not check that a link is still alive.
- Assumptions B7-B9, B10-B15 and B16-B21 should be confirmed with the teacher.

## 10. Future scope (Version 2)

Payments and escrow, Socket.IO real-time chat, identity verification and trust badges, AI job recommendations and candidate matching, notifications, analytics, a shared learning-resource library linked to skills, student progress ("mark as learned"), production deployment.

## 11. How to run

See `README.md`: install server and client, copy `.env.example` to `server/.env`, start MongoDB, run `npm run seed`, then `npm run dev` in both folders. Tests: `cd server && npm test`.
