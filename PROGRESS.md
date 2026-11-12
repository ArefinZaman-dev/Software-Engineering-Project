# PROGRESS

Last updated: 12 Oct 2026

## Current state: Increments 1-5 complete; the developer reports Increment 5 runs properly (the full `npm test` count was not shown to the author). Increment 6 (admin panel) is written, lint-clean, and syntax-checked but NOT yet run against MongoDB. Next: run `npm test` (expect 246) and checklist items 43-53, then Increment 7 (final verification, report, viva preparation).

## Increment 6 - Admin panel (written, NOT yet run against MongoDB)

**Completed**
- `/api/admin/*` (admin only): richer statistics; users (search, filters, pagination, suspend, reactivate); jobs (remove, restore); reviews (remove, restore, rating recalculated both ways); reports (list, start review, resolve, dismiss with a note); categories (list with job counts, create, rename, deactivate, delete only when unused).
- Rules: admins cannot be suspended (including self); removed jobs vanish from discovery, details, applying, and reporting but nothing is deleted; their poster still sees them marked Removed and cannot edit; closing a report lets the reporter report that target again.
- Client: six admin pages (Dashboard, Users, Jobs, Reviews, Reports, Categories), shared `AdminListShell`, `usePagedList`, `useAction`; admin menu; My jobs marks a removed job.
- Also included: chat threads now check for new messages every 5 seconds (polling), requested after Increment 5 testing.
- 60 new server tests (246 total); docs updated (API, DECISIONS B10-B15 and D42-D45, SRS, TESTING, MANUAL_VERIFICATION checklist 43-53, README, LEARNING_GUIDE).
- One earlier test changed: the stats test in `authorization.test.js` compared the whole stats object, so it now checks the three original keys (the stats gained more keys).

**Verification actually done (author's sandbox)**
| Check | Result |
|---|---|
| ESLint, client and server | Clean |
| `node --check` on all server files and tests | Passed |
| App loads; all 18 admin routes registered | Confirmed |
| 60 new database tests, browser flow, `vite build` | **NOT run** (no MongoDB or Vite binaries in the sandbox) |

**Assumptions to confirm** (Section 33 was not available): B10-B15 in DECISIONS.md.

**Not in this increment (by plan):** suspension reasons or expiry, appeals, an audit log of admin actions (ideas for Version 2).

## Increment 5 - Completion, reviews, messaging, reports (developer reports it runs properly)

**Completed**
- `POST /api/jobs/:id/complete` (poster, IN_PROGRESS only; job and accepted application become COMPLETED).
- Reviews: `Review` model, one per direction per job, only after completion, reviewee chosen by the server, rating summary recalculated (`recalculateRatingSummary`, ready for Increment 6 removals). Endpoints: `GET/POST /api/jobs/:id/reviews`, `GET /api/reviews/user/:id`.
- Messaging (not real-time): `Conversation` + `Message` models; open via `POST /api/applications/:id/conversation` (only while SHORTLISTED/ACCEPTED), `GET /api/conversations`, `GET/POST /api/conversations/:id/messages`; unread counts; read-only after the application ends.
- Reports: `Report` model with partial unique index; `POST /api/reports` (job or user).
- Client: Review page, Messages inbox and conversation page, Report form on job details and public profiles, reviews list on profiles, Mark as completed buttons, Message buttons on My applications and Applicants, Messages nav link.
- Seed now also clears applications, reviews, conversations, messages, and reports (the previous seed left applications behind).
- 69 new server tests (186 total); docs updated (API, DATABASE, DECISIONS B7-B9 and D35-D41, SRS, TESTING, MANUAL_VERIFICATION checklist 31-42, README, LEARNING_GUIDE).

**Verification actually done (author's sandbox)**
| Check | Result |
|---|---|
| ESLint, client and server | Clean (fixed two earlier real errors, BF3) |
| `node --check` on all server files and tests | Passed |
| App loads; all new routes registered | Confirmed |
| Model validation and JSON shape without a database (rating, body, reason, `id` present, `_id` absent) | Passed |
| Report `isActive` save hook (real `save()` path, collection stubbed) | Passed |
| 7 DB-free tests | 7 passed |
| 69 new database tests, seed, browser flow, `vite build` | **NOT run** (no MongoDB or Vite binaries in the sandbox) |

**Assumptions to confirm** (Section 33 was not in the ZIP): B7 messaging only for shortlisted/accepted applications; B8 only the poster completes a job; B9 removed reviews cannot be replaced. See DECISIONS.md.

**Not in this increment (by plan):** admin review of reports, removing reviews/jobs, suspending users, category management (Increment 6).


## Increment 1 - Planning, requirements, foundation

**Completed**
- Project structure, Git ignore rules, `.env.example`, ESLint config for client and server.
- Server foundation: config with environment validation, database connection, central error handler, standard response shape, validation middleware, rate limiting, helmet, CORS.
- Client foundation: Vite + React + Tailwind 4 setup, router, design tokens, reusable UI components.
- Docs: SRS foundation, architecture, full database design (all planned collections), API contract, decisions, testing plan.

## Increment 2 - Authentication, authorization, profiles, dashboards

**Completed**
- Register (Student/Poster), login, logout, `/me`, JWT auth, bcrypt hashing, suspended-account check on every request.
- Role-based authorization and ownership checks enforced on the backend.
- Student and Poster profiles (embedded in the User document), profile completeness, public profile view without private fields.
- Student, Poster, and Admin dashboards (admin shows real user counts).
- Seed script with an admin, 3 students, and 3 posters.
- Client: login, register, profile pages, dashboards, protected routes, loading/empty/error states, frontend validation.

**Files created:** 34 server source files, 5 server test files, 41 client source files, 9 documents in docs/ plus README and PROGRESS. Nothing from an earlier project was reused.

## Verification: what was actually run

Verified end-to-end on the developer's own machine (Windows, MongoDB installed locally) on 28-29 Sep 2026.

| Check | Result |
|---|---|
| `cd server && npm install` | Passed, 216 packages, 0 vulnerabilities |
| `npm test` (server) | **51 passed, 0 failed** (auth 23, authorization 10, profiles 11, profileCompletion 7) |
| `npm run seed` | Passed, created admin + 3 students + 3 posters |
| `npm run dev` (server) | API started on http://localhost:5000 |
| `cd client && npm install` | Passed, 282 packages |
| `npm run dev` (client) | Vite started on http://localhost:5173 |
| Browser: register, login/logout, session persistence | Confirmed working by the developer |
| Browser: student dashboard for an incomplete profile (Farhana) | Confirmed: 50% complete, missing items listed correctly (location, bio, experience) - screenshot matched expectations exactly |
| Browser: admin dashboard | Confirmed: total users 7, students 3, posters 3 - screenshot matched expectations exactly |
| Client production build (`vite build`) | Not yet run (dev server only so far) |
| ESLint (client and server) | Not yet run |
| Full manual checklist in MANUAL_VERIFICATION.md (all 12 items) | Partially done; the rest can be checked anytime |

## Problems found and fixed

**Bug found via the developer's real browser testing (Increment 3), fixed before the next ZIP:**

- **Symptom:** Creating a job failed with "Please check the highlighted fields" even with valid input; opening a job from a card/list also failed, and the "My jobs" list looked fine only because it only showed already-seeded data.
- **Root cause:** `models/Job.js` and `models/Category.js` were missing `toJSON: { virtuals: true }` (unlike `models/User.js`, which had it correctly). Without it, Mongoose's automatic `id` field was never included in the JSON sent to the frontend - every job and category API response was missing `id`. This broke the category dropdown (every option had an unusable id) and every job detail link (`/jobs/undefined`).
- **Fix:** added `virtuals: true` to both models' `toJSON` options.
- **Regression guard added:** `jobs.test.js` and `categories.test.js` now explicitly assert that `id` is present (and `_id` is not) on job, category, and job-with-populated-category responses, so this exact bug cannot silently return.
- **Also fixed while in this area:** the job deadline date picker could read "today" as already in the past once converted to UTC (Bangladesh is UTC+6), because the date-only value was parsed as UTC midnight. Deadlines are now interpreted as the end of the locally-picked day, and the date input also has a `min` of today so a past date cannot be picked at all. The edit-job date display was also fixed to use local date parts instead of UTC (it could previously show the wrong day by one).

## Resolved assumptions
- Package versions in both `package.json` files installed cleanly with no version conflicts.
- Tailwind 4 (`@theme`, `has-[:checked]:`) rendered correctly in the browser (confirmed via screenshots).

## Increment 3 - Job marketplace

**Completed**
- `Category` and `Job` models, `DEFAULT_CATEGORIES` constant, seed now creates 10 categories and 6 demo jobs (5 open, 1 closed) across the 3 demo posters.
- Job service: create, public discovery (search / filter by category, location, work type, budget / sort / paginate), public job details, poster's own job list (`/mine`), edit (open jobs only), delete (open jobs only), close, cancel - all enforced on the backend, matching Section 33's job status rules.
- `GET /api/jobs`, `GET /api/jobs/:id`, `GET /api/categories` are public (no login required), matching Section 4 of the brief ("Public pages: ... Browse Jobs, Job Details").
- Client: public Browse Jobs page (search box, category/work-type/location filters, sort, pagination, loading/empty/error states), public Job Details page (shows manage actions - edit/close/cancel/delete - only to the owning poster), poster's My Jobs page, Create/Edit Job pages sharing one `JobForm` component, updated navigation.
- 32 new server tests (30 for jobs, 2 for categories).

**Files created/changed:** 2 new models, 1 new validator, 2 new services, 2 new controllers, 2 new routes, seed.js extended, 2 new test files, 1 test helper extended; 2 new client services, 8 new client components/pages, App.jsx and both layouts updated. Docs updated: README, DECISIONS, DATABASE, API, TESTING, SRS, LEARNING_GUIDE.

**Deliberately deferred (documented, not hidden):** job deletion does not yet check for existing applications, because the `Application` model does not exist until Increment 4. `IN_PROGRESS` and `COMPLETED` job statuses are not reachable yet for the same reason.

## Verification: what was actually run for Increment 3

| Check | Result |
|---|---|
| `node --check` on every new/changed server file | Passed |
| TypeScript-parser syntax check on every new/changed client file | Passed |
| Database-backed tests (32 new + 51 existing = 83 total) | **Verified by the developer: 83 passed, 0 failed** (after the virtuals:true + deadline-timezone fixes) |
| Seed script with categories and jobs | **Verified: 10 categories, 6 jobs seeded correctly** |
| Browser check of Browse Jobs / Job Details / My Jobs / Create / Edit | **Verified by the developer: job creation, category selection, and job-details navigation all confirmed working** |

## Increment 4 - Applications and candidate selection (written, NOT yet run)

**Completed**
- `Application` model with unique `(job, student)` index; constants for application status and withdrawn reason.
- Service rules: apply (open job, deadline, once ever), applicant list (owner only, suspended students' open applications hidden), my applications, shortlist, reject, atomic accept (rejects the rest, job to IN_PROGRESS), withdraw (accepted student reopens the job).
- `jobService`: delete now refuses jobs with applications; cancelling an in-progress job withdraws the accepted application (POSTER_CANCELLED).
- Routes: `/api/jobs/:id/applications` (POST, GET) and `/api/applications/*`.
- Client: Apply page, My applications (with withdraw), poster Applicants page (shortlist/accept/reject), Apply and View applicants links, nav link, routes.
- 34 new server tests (117 total).

**Verification:** syntax checks passed for all server and client files; the 7 dependency-free tests re-ran and passed. The 34 new tests, seed, and browser flow have NOT been run. Checklist items 23-30 in docs/MANUAL_VERIFICATION.md.

**Not in this increment (by plan):** marking a job completed, reviews, messaging, reports (Increment 5).

## Previously planned: Increment 4 - Applications and candidate selection
Application model, apply (student, once per job, only to OPEN jobs before the deadline), poster's applicant list per job, shortlist/accept/reject, the atomic "accept rejects the rest and starts the job" rule, withdraw, and the accepted-student-withdraws-reopens-the-job rule. Then tests and a regression run of the full suite.
