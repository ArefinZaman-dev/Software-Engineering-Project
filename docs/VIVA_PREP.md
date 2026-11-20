# Viva preparation - CampusGig V1

How to use this file: read the answer, then close it and say it again in your own words. Every answer points to the file where the code lives, so you can open it if the examiner asks "show me".

## A. The project in one minute

CampusGig connects university students with people who need short-term work done. A poster publishes a job; students apply; the poster shortlists, accepts one student, and later marks the job completed; both sides review each other. An admin moderates users, jobs, reviews, reports and categories, and (Increment 8) attaches learning resources to jobs so a student can learn a missing skill before applying.

Stack: React + Vite + Tailwind (client), Node + Express 4 (API), MongoDB + Mongoose, JWT + bcryptjs, zod, Node test runner + supertest.

## B. Process questions

**Why the Incremental Model?** The system has clear parts that build on each other (auth, then jobs, then applications, and so on). Each increment gave something runnable and testable, and a late requirement (learning resources) could be added as Increment 8 without redoing earlier work.

**What were the increments?** 1 foundation, 2 auth and profiles, 3 jobs, 4 applications, 5 completion/reviews/messaging/reports, 6 admin panel, 7 final documentation and verification, 8 learning resources.

**How did you handle the teacher's new requirement?** I read it as: a student who lacks a skill should get help inside the app before applying. I decided the admin adds resources per job (B16), added one collection, five endpoints, one section on the job page, one box on the apply page and one admin screen, then updated SRS (FR-18, UC26-29), API, DATABASE, DECISIONS, TESTING and the checklist.

**How did you test?** Three layers: unit tests for pure logic, API tests with supertest against a separate test database (290 tests), and a manual browser checklist (`MANUAL_VERIFICATION.md`). Real browser testing found bug BF1, which the automated tests had not caught, so I added a regression test for it.

## C. Architecture

**Why a monolith?** Simple to build, run and explain; microservices would add complexity a semester project does not need (D1).

**Explain the backend layers.** Route (maps URL) -> middleware (authenticate, authorize, validate) -> controller (thin, sends the response) -> service (business rules) -> model (schema and indexes). Business rules live only in services, so they are easy to test.

**Why is the app separated from the server start-up?** So tests can call the Express app directly without opening a network port (NFR-07). Files: `server/src/app.js` and `server.js`.

**Why does the client use `services/` and `apiClient.js`?** All HTTP calls are in one place; the client adds the token and turns failures into one error type.

**What do `useAsync`, `usePagedList`, `useAction` do?** `useAsync` gives loading/error/data for any async call; `usePagedList` is the shared list, search and pagination logic for admin pages; `useAction` runs a button action with loading and error state.

## D. Authentication and security

**How does login work?** The server finds the user by email, compares the password with bcrypt, and returns a JWT. The browser saves it and sends it as `Authorization: Bearer <token>`.

**Why does the token contain only the user id?** Role and status are read from the database on every request, so suspending a user works immediately (D8).

**How are passwords stored?** As bcrypt hashes (12 rounds; 4 in tests for speed). The hash field is `select:false`, so it is never returned (D9).

**Why one message for wrong email and wrong password?** So an attacker cannot learn which emails are registered (D10).

**What is mass assignment and how do you prevent it?** A client sending extra fields such as `role: ADMIN`. Update schemas are `.strict()` and return 400; registration schemas drop unknown fields; reviewer, reviewee, report status, `job` and `addedBy` are never taken from the body (D11, D36).

**Frontend route guards vs backend authorization?** The guards only help usability. The real protection is on the server: `authenticate`, then `authorizeRoles`, then ownership checks.

**Why 404 instead of 403 on someone else's job or application?** It does not confirm that the id belongs to another user (D24, D30).

**Weak point you should admit.** The token is in `localStorage`, so an XSS bug could expose it. React escapes output by default; Version 2 can move to httpOnly cookies (D7).

**Other protections.** helmet, CORS, rate limits (30 auth and 600 API requests per 15 minutes per IP), zod on every request, regex escaping for search text (D45), no secrets in Git (`.env` ignored).

## E. Data model

**Why embed student and poster profiles in the user document?** A profile is always read with its user and never shared, so a separate collection would only add joins (D15).

**Which unique indexes protect the rules?** `{job, student}` on applications (one application per student per job, ever); `{job, reviewer}` on reviews (one review per direction); `application` on conversations; a partial unique index on active reports per reporter and target. Rules are checked in services for friendly messages, and the indexes guarantee correctness even if two requests arrive together.

**What is derived data?** `ratingSummary` on the user and `isActive` on a report. They can be recalculated from reviews and status.

**Why is `id` always returned and never `_id`?** Consistent contract for the frontend. BF1 happened because two models forgot `virtuals: true`.

**Why search with a MongoDB text index?** Built in, no extra dependency, enough for this data size (D26).

## F. Business rules and the tricky parts

**What happens when a poster accepts an application?** That application becomes ACCEPTED, every other pending one becomes REJECTED, and the job becomes IN_PROGRESS.

**How do you stop two accepts at the same time?** A conditional `findOneAndUpdate` on the job with `status: OPEN`; only one request can win (D31). Standalone MongoDB has no multi-document transactions. Trade-off: a crash between the job update and the application updates could leave half-updated data.

**What if the accepted student withdraws?** The job returns to OPEN. If the deadline passed, the poster must set a new future deadline (B3).

**What if the poster cancels an in-progress job?** The job becomes CANCELLED and the accepted application becomes WITHDRAWN with `withdrawnBy: POSTER_CANCELLED` (B2, D33).

**Who can complete a job, and why does it matter?** Only the poster, only from IN_PROGRESS (B8). Reviews are allowed only after completion, once per direction.

**Can a removed review be replaced?** No; removal still counts as the reviewer's one review (B9). An admin can restore it, and the rating is recalculated both ways (B14).

**When can two people message?** Only while the application is SHORTLISTED or ACCEPTED (B7). After that the thread is read-only. Messages update by polling every 5 seconds, not real time (D38).

**What does an admin "remove job" do?** It sets `removedByAdmin`. Nothing is deleted, so it can be restored; the poster still sees it marked Removed but cannot edit it (B1, B11).

**What does resolving a report do?** Only closes the report. Removing the job or suspending the user is a separate visible step (B12).

**Can a category be deleted?** Only when no job uses it; otherwise deactivate or rename (B15).

**Can an admin suspend an admin?** No, including themselves, so every admin cannot be locked out (B10).

## G. Increment 8: learning resources (the teacher's requirement)

**What does it do?** On a job, an admin adds videos, articles, courses, documents or notes. Anyone who can see the job sees them in "Need to learn this skill first?"; the apply page has a collapsed "Not sure you have the skills?" box.

**Why only the admin?** A poster knows the work but not necessarily good lessons, and open posting would let unchecked links reach students (B16). If the teacher meant something else, only the role check and one admin screen change.

**Why one resource for one job?** It keeps the model simple; a shared library linked to skills is Version 2 (B17).

**What is a NOTE?** Text only, written by the admin, with no link. Every other type needs a link (B20).

**Why are links limited to http and https?** A `javascript:` or `data:` link could run code or hide the destination (D46). Links open in a new tab with `rel="noopener noreferrer"` (D47).

**Where is the type rule enforced?** Three places on purpose: the form (instant feedback), the request validator (the real check), and the model's `pre('validate')` hook (so nothing can bypass it). On update it is checked on the merged result, so changing a note to a video without a link is rejected.

**How do you stop moving a resource to another job?** The job comes from the URL, `job` and `addedBy` in the body are ignored, and `PATCH` rejects `job`.

**What if resources fail to load?** The component renders nothing, so the job and apply pages still work (D48).

**Why is there a limit of 20?** So a job page stays a quick start (B21); the 21st gives 409.

**What happens to resources when a job is removed or deleted?** Removing, restoring, closing or cancelling keeps them. Deleting a job (only possible while open with no applications) deletes its resources (B19).

## H. Bugs and what you learned

**Tell me about a real bug.** BF1: creating a job failed in the browser because `id` was missing from job and category responses. The tests passed because they used `_id` from the database, not the API shape. Real browser testing found it. I fixed the models and added tests that assert `id` is present and `_id` is absent.

**Another one?** BF2: a deadline of today was rejected for a UTC+6 user because a date-only value was parsed as UTC midnight. Now the deadline is the end of the picked day in local time.

## I. Limitations and future work (say them before you are asked)

Polling instead of real-time chat; localStorage token; no photo upload, email change or password reset; no suspension reason or appeal; accept is not a transaction; resources belong to one job. Version 2: payments and escrow, Socket.IO, verification badges, AI recommendations, notifications, a shared resource library and student progress.

## J. Quick facts to remember

9 collections, 57 route handlers, 290 tests, 3 roles (Student, Poster, Admin), 5 job statuses (OPEN, CLOSED, IN_PROGRESS, COMPLETED, CANCELLED), 6 application statuses (PENDING, SHORTLISTED, ACCEPTED, REJECTED, WITHDRAWN, COMPLETED), 4 report statuses (PENDING, REVIEWING, RESOLVED, DISMISSED), 20 resources per job maximum, 8 increments, SOW #001 from 16 Sep to 15 Dec 2026.

## K. Demo order for the viva (about 5 minutes)

1. Browse jobs as a visitor (search, filter), open a job, show "Need to learn this skill first?".
2. Log in as a student, Apply; show the learning box on the apply page.
3. Log in as the poster: Applicants, Shortlist, Message, Accept, Mark as completed, Review.
4. Log in as admin: dashboard, Users (suspend), Jobs > Learning resources (add one), Reports.
5. Show `npm test` passing (290) if the examiner asks about quality.
