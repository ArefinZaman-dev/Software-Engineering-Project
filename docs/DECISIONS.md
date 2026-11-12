# Design decisions

Each decision states the choice, the reason, and the trade-off, in language suitable for a viva.

## Architecture and stack
| # | Decision | Reason / trade-off |
|---|---|---|
| D1 | Monolith: one Express API + one React app | Simple to build, run, and explain. Microservices would add complexity a semester project does not need. |
| D2 | JavaScript with CommonJS on the server, ES modules on the client | Matches what an intermediate learner knows. The client uses ES modules because Vite requires them. |
| D3 | Express 4 (not 5) | Most tutorials and courses use 4, and `req.query` remains writable, which the validation middleware relies on. |
| D4 | Node's built-in test runner + supertest | Fewer dependencies than Jest. Tests are plain `describe`/`it`. Run with `node --test`. |
| D5 | Tailwind CSS 4 via the Vite plugin | No separate PostCSS setup. Design tokens live in one `@theme` block in `index.css`. |
| D6 | Client talks to the API through the Vite dev proxy | The browser sees one origin in development, so CORS problems cannot block development. CORS is still configured for production. |

## Authentication and security
| # | Decision | Reason / trade-off |
|---|---|---|
| D7 | JWT sent in the `Authorization: Bearer` header, stored in `localStorage` | Easy to understand and to test. Trade-off: JavaScript on the page can read it, so an XSS bug would expose it. React escapes output by default. Version 2 can move to httpOnly cookies. |
| D8 | Token contains only the user id | Role and status are read from the database on every request, so suspending a user takes effect immediately, as the business rules require. |
| D9 | `bcryptjs` with 12 rounds (4 in tests) | Pure JavaScript, installs without a compiler on any OS. 4 rounds keep tests fast. |
| D10 | Login gives one message for wrong email and wrong password, and always runs a hash comparison | Prevents attackers from discovering which emails are registered. |
| D11 | zod schemas validate every request; update schemas are `.strict()` | Unknown fields such as `role` or `status` produce a 400 error instead of being ignored (mass-assignment protection). Registration schemas drop unknown fields. |
| D12 | Password rule: 8-72 characters, at least one letter and one number | 72 is bcrypt's byte limit. Simple enough to explain, stronger than length alone. |
| D13 | Rate limits: 30 auth requests and 600 API requests per 15 minutes per IP | Slows password guessing. Disabled in tests. Behind a reverse proxy in production, `trust proxy` must be configured. |
| D14 | Tests refuse to run unless the test database name contains "test" and differs from the dev database | Tests delete all data, so this prevents wiping real data by accident. |

## Data model
| # | Decision | Reason / trade-off |
|---|---|---|
| D15 | One `User` collection; student and poster profiles are embedded subdocuments | A profile is always read with its user and never shared, so a separate collection would only add joins. Trade-off: role-specific fields live in one document, which is fine because the role never changes. |
| D16 | `role` is `immutable` in the schema | Roles cannot change after creation, matching the business rules. |
| D17 | `ratingSummary` stored on the user, updated by the review module | Fast to read on every job and profile view. It is derived data, so it can be recalculated from reviews. |
| D18 | No `avatarUrl` field in V1 | Uploads need file storage. The UI shows initials. Planned for Version 2. |
| D19 | Email cannot be changed in V1 | A safe change needs email verification, which is Version 2. |
| D20 | The API always returns `id` (a string), never `_id` or `__v` | Consistent contract for the frontend. |
| D21 | Suspended users' profiles return 404 to other users | Matches the rule that suspended accounts are hidden from the platform. |
| D22 | Registration accepts `university` (students) and `organizationType`/`organizationName` (posters) as optional extras | Reduces the number of clicks later without blocking sign-up. |

## Business rules (from the project brief, implemented as decided)
The full rules for jobs, applications, reviews, messaging, reporting, suspension, and categories are implemented exactly as specified in Section 33 of the build brief, increment by increment. Where the brief left a detail open, the choice made is recorded here.

| # | Open detail | Choice |
|---|---|---|
| B1 | Admin "hide/remove a job" has no matching job status | Use a separate `removedByAdmin` flag on the job (Increment 6) instead of adding a sixth status. |
| B2 | Application becomes `WITHDRAWN` when a poster cancels an in-progress job | Store a `withdrawnBy`/reason field so history shows it was a cancellation, not the student's choice (Increment 4). |
| B3 | Job returns to `OPEN` after the accepted student withdraws, but the deadline may have passed | The poster must set a new future deadline when reopening; otherwise the job stays closed to new applications (Increment 4). |
| B4 | Draft jobs | Not built. Creating a job publishes it, to avoid unnecessary complexity. |
| B5 | Reviews removed by an admin | Excluded from rating summaries (Increment 6). |
| B6 | Atomic accept without transactions (standalone MongoDB does not support them) | Use a conditional update on the job (`status: OPEN`) first, then update applications; the conditional update guarantees only one accept can win (Increment 4). |

## Suggested Git commits
1. `chore: initialize project structure, gitignore, and environment template`
2. `feat(server): add config, error handling, validation, and security middleware`
3. `feat(auth): registration, login, JWT authentication, and password hashing`
4. `feat(authz): role-based authorization and ownership checks`
5. `feat(profiles): student and poster profiles with completeness`
6. `feat(client): app shell, routing, auth context, and UI components`
7. `feat(client): login, register, profile pages, and dashboards`
8. `feat(admin): admin dashboard statistics`
9. `test: authentication, authorization, and profile tests`
10. `docs: SRS, architecture, database, API, and testing documents`

Later increments will add: job marketplace, application workflow, reviews, messaging, reporting, admin panel, final documentation.

## Increment 3 additions
| # | Decision | Reason / trade-off |
|---|---|---|
| D23 | Job creation always publishes immediately (no `DRAFT` status) | The brief allows this simplification when a draft flow "does not add unnecessary complexity". Fewer states to test and explain. |
| D24 | Attempting to edit/close/cancel/delete a job that is not the caller's own returns `404`, not `403` | Consistent with `getPublicJob` also returning 404 for a hidden job; it avoids confirming to a stranger that a given job id belongs to some other poster. Profile ownership (Increment 2) uses 403 instead, because there the id in the URL is always a real user id the caller could look up via the public profile route anyway - the two cases are not quite symmetric, but 404 was chosen for jobs to keep behavior consistent with `getPublicJob`. |
| D25 | Deleting a job only checks `status === OPEN` for now, not "and has no applications" | The `Application` model does not exist until Increment 4. The check will be added then; tracked as a TODO in `jobService.js` and in the Known Limitations section of the README. |
| D26 | MongoDB `$text` index on `title` + `description` for search | Built into MongoDB, no extra dependency, good enough for a semester project's data volume. A dedicated search engine (Elasticsearch, Atlas Search) would be overkill. |
| D27 | Job listing always excludes jobs from suspended posters and admin-removed jobs, computed server-side | Matches the business rule that a suspended poster's open jobs are hidden from discovery; enforcing it in the query (not just the UI) means it cannot be bypassed by calling the API directly. |
| D28 | `Job.poster` population includes `status` internally, then `Job`'s own `toJSON` transform deletes it before the response is sent | Needed the field server-side to decide visibility, but a poster's suspension status is not public information, matching the same rule already applied to `User.toPublicProfile()`. |
| D29 | Deadline must be in the future only at creation time (validator), not enforced by the Mongoose schema itself | A job's deadline naturally moves into the past as time goes on; the schema should not reject saving/reading an aging job. "Cannot apply after the deadline" is enforced separately, in Increment 4, when applications are built. |

## Increment 4 additions
| # | Decision | Reason / trade-off |
|---|---|---|
| D30 | Application actions on someone else's application return `404`, not `403` | Same reasoning as D24 for jobs: it does not confirm that an id belongs to another poster or student. |
| D31 | Accept uses a conditional `findOneAndUpdate` on the job (`status: OPEN`) instead of a transaction | Standalone MongoDB has no multi-document transactions. The conditional update makes the job's move to `IN_PROGRESS` atomic, so two accepts cannot both succeed. Trade-off: if the server crashed between the job update and the application updates, data could be left half-updated; acceptable for a semester project and documented. |
| D32 | The unique `(job, student)` index also blocks re-applying after a withdrawal | Matches the rule "one application per student per job, ever", and the service shows one message for both cases. |
| D33 | Cancelling an in-progress job withdraws the accepted application with `withdrawnBy: POSTER_CANCELLED`; the job becomes `CANCELLED`, not `OPEN` | Implements B2. Only a student's own withdrawal reopens a job. |
| D34 | Marking a job `COMPLETED` (and its application `COMPLETED`) is built in Increment 5 with reviews | The two are tightly linked because a review requires a completed job. |

## Increment 5 additions
The build brief's Section 33 was not available when Increment 5 was written, so B7-B9 are choices made from the SRS and database design. **Check them against Section 33** and tell me if any differ.

| # | Open detail | Choice |
|---|---|---|
| B7 | When may two people message each other? | A conversation can be opened only while the application is `SHORTLISTED` or `ACCEPTED`, by either person on it. After that (completed, rejected, withdrawn, job cancelled) the thread stays readable but is read-only. Reason: stops students messaging posters who have not shown interest, and keeps messages tied to real work. |
| B8 | Who completes a job? | Only the poster, only from `IN_PROGRESS`. The accepted application becomes `COMPLETED` in the same step. |
| B9 | Can a removed review be replaced? | No. An admin-removed review still counts as the reviewer's one review, so removal cannot be used to review twice. |
| D35 | Messages live at `/api/conversations/:id/messages` | A message only exists inside a conversation, so nesting avoids a separate `/api/messages` group. |
| D36 | Reviewer, reviewee, and report status are never taken from the request | zod drops unknown fields; the server derives the reviewee from the job. Prevents reviewing the wrong person or self-resolving a report. |
| D37 | Rating summary is recalculated from the reviews collection after every new review | Derived data (D17); rounding to one decimal. Trade-off: two reviews landing at the same instant could briefly leave a stale summary; recalculating again fixes it. |
| D38 | Messaging is near-real-time by polling, not true real-time | Per SRS scope. An open thread checks for new messages every 5 seconds (only while the tab is visible and the thread is writable), and also has a Refresh button. Failed checks are ignored silently. Socket.IO (instant push) is a Version 2 item. |
| D39 | A suspended user's conversations, reviews, and profile are hidden from others | Same rule as D21. |
| D40 | One active report per reporter and target, enforced by a partial unique index | Resolved or dismissed reports free the slot (needs `isActive`, kept in step by a save hook). |
| D41 | The conversation list uses one aggregation for last message and unread counts | Avoids two queries per conversation. |

## Increment 6 additions
As with Increment 5, Section 33 was not available, so these are choices made from the SRS and database design. **Check them against Section 33.**

| # | Open detail | Choice |
|---|---|---|
| B10 | Can an admin suspend another admin, or themselves? | No. Admin accounts are never suspended or reactivated through the API (`400`). Prevents locking every admin out. |
| B11 | What does "remove a job" do to its applications and conversations? | Nothing. The job is hidden (B1) and nothing is deleted, so it can be restored. Its poster still sees it in My jobs, marked removed, but cannot edit it. |
| B12 | Does resolving a report act on the reported job or person? | No. Resolving or dismissing only closes the report. The admin removes the job or suspends the user as a separate, visible step (the Reports page offers both buttons next to the report). |
| B13 | Report status flow | `PENDING → REVIEWING → RESOLVED` or `DISMISSED`; a pending report may be closed directly. Closed reports cannot be reopened. Closing frees the reporter to report that target again (D40). |
| B14 | Can admins restore a removed review? | Yes, and the rating summary is recalculated both ways. The author still cannot replace it (B9). |
| B15 | Category with jobs | Can be deactivated or renamed, never deleted (`409`). Names must contain an English letter or digit so the slug is never empty. |
| D42 | `/api/admin/stats` returns more keys | The original `totalUsers`, `students`, `posters` keep their names. The one existing test that compared the whole object now checks those three keys, and `adminStats.test.js` checks the full set. |
| D43 | Admin list pages share one pattern | Plain objects built in the service with only the fields an admin needs (the User model's JSON adds derived fields like `profileCompletion`); one `AdminListShell` component and two hooks (`usePagedList`, `useAction`) on the client. |
| D44 | Report status changes use `document.save()` | So the `pre('save')` hook keeps `isActive` correct (see Report model). |
| D45 | Search text is escaped before use in a regex | `utils/escapeRegex.js`, so typing `c++` or `(` searches literally and cannot break or slow the query. |

## Bug fix log
| # | Bug | Root cause | Fix |
|---|---|---|---|
| BF1 | Job creation and job-details navigation failed after real browser testing | `Job` and `Category` models were missing `toJSON: { virtuals: true }`, so the `id` field was silently absent from every API response for those two models (unlike `User`, which had it) | Added `virtuals: true` to both models; added regression tests asserting `id` is present on job/category responses |
| BF2 | A deadline of "today" could be rejected as already in the past | The date-only value from `<input type="date">` was parsed as UTC midnight, which is already hours in the past for a Bangladesh-timezone (UTC+6) user later in the day | Deadlines are now interpreted as 23:59:59 of the picked day in the browser's local time; the date input also has `min` set to today |
| BF3 | `npm run lint` failed on the test helper and the client | Duplicate `category` key in `tests/helpers/testApp.js` `createJob`; an unescaped apostrophe in `MyApplicationsPage.jsx` | Removed the redundant key; used `&apos;`. Found by actually running ESLint in the sandbox (client and server now lint clean) |
