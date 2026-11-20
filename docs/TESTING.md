# Testing

## Strategy
- **Unit tests** for pure logic that needs no database.
- **API tests** (supertest against the Express app) for status codes, validation, authentication, and authorization, using a separate test database.
- **Manual end-to-end checklist** for the browser flows (see MANUAL_VERIFICATION.md).

Run from `server/`: `npm test` (Node's built-in runner, files run one at a time because they share one database).

## Safety
Tests delete all data in `MONGODB_URI_TEST`. The config refuses to run unless that database name contains "test" and differs from `MONGODB_URI`.

## Test inventory (290 tests: 246 before Increment 8, plus 44 new)

| File | Tests | Covers |
|---|---|---|
| `profileCompletion.test.js` | 7 | Completeness percentage and missing items for students, posters, admins |
| `auth.test.js` | 23 | Register (student, poster, duplicate, invalid email, weak password, ADMIN blocked, mass assignment, malformed JSON, hash stored), login (success, wrong password, unknown email, suspended, missing fields), protected routes (no/invalid/expired token, suspended and deleted users, logout), health and 404 |
| `authorization.test.js` | 10 | Admin routes for anonymous/student/poster/admin; students and posters cannot edit others' profiles; cross-role endpoint use; role/email/status changes rejected |
| `profiles.test.js` | 11 | Student and poster updates, skill de-duplication, invalid input, public profile hides private fields, 404 for wrong role / unknown / suspended, 400 bad id |
| `categories.test.js` | 2 | Public listing, active-only, sorted by name |
| `jobs.test.js` | 30 | Create (role check, validation, category checks, duplicate skills), public discovery (open-only, hides suspended posters and their `status` field, search/filter/sort/pagination, invalid query), public job details (404 cases), `/mine`, edit (ownership, status guard), delete (status guard), close/cancel (status guard, ownership) |

| `applications.test.js` | 34 | Apply (success, optional amount, role checks, validation, closed job, past deadline, duplicate, no re-apply after withdraw, 404), applicants list (owner only, suspended-student hiding), `/mine`, shortlist, reject, accept (accepts one, rejects the rest, starts job; second accept blocked), withdraw (including accepted student reopening the job), cancel of an in-progress job, delete blocked once applications exist |

| `completion.test.js` | 11 | Poster completes an in-progress job (job + application become COMPLETED), auth/role/ownership checks, open/cancelled/already-completed rejected, completed job cannot be cancelled or withdrawn, not in public discovery |
| `reviews.test.js` | 24 | Review in both directions, `id` present and no email leak (BF1 guard), rating summary and rounding, one review per direction, only after completion, non-participants 404, rating/comment validation, reviewee in body ignored, per-job and per-user listings, removed reviews excluded and not replaceable, summary recalculation |
| `conversations.test.js` | 23 | Open (poster/student, idempotent, status rules, strangers, suspended), send (validation, read-only statuses, strangers), read marking, list (unread counts, last message, ordering, hides suspended) |
| `reports.test.js` | 11 | File job/user reports, duplicate active report blocked, re-report after resolve, own job/self, hidden targets 404, validation incl. OTHER needs description, status in body ignored |

| `adminStats.test.js` | 3 | Empty platform, every count (removed jobs/reviews and closed reports excluded), admin only |
| `adminUsers.test.js` | 15 | List, search (incl. special characters), filters, pagination, suspend (token and login blocked at once, poster's jobs hidden), reactivate, admins and self protected, role checks |
| `adminJobs.test.js` | 9 | List with filters, remove/restore (hidden from discovery and details), applications untouched, apply and report blocked, poster sees but cannot edit |
| `adminReviews.test.js` | 7 | List and filters, remove/restore recalculates the rating, hidden from profile, 409s, role checks |
| `adminReports.test.js` | 12 | Job and user report details, status filter, review/resolve/dismiss, closed reports locked, duplicate blocked while open and allowed after closing, deleted target, input ignored, role checks |
| `adminCategories.test.js` | 14 | List with job counts, create (slug, duplicates, bad names), rename, deactivate (public list, new jobs, existing jobs), delete rules, role checks |

| `learningResourceRules.test.js` | 15 | **Needs no database.** Link rule (http/https only, rejects `javascript:`), create rules (link unless note, text for a note, trimming, length limits, unknown type, `job`/`addedBy` dropped), update rules (partial, empty, `job` rejected), model validation and JSON shape (`id` present, `_id` and `addedBy` hidden) |
| `learningResources.test.js` | 29 | Public list (no login, order, only this job, 404 for removed job / suspended poster / unknown, 400 bad id), admin add (success, job from URL, note, validation, 20-per-job limit, removed job, 404, 403/401), admin list, update (partial, cannot move job, merged type rule, 404, 403), delete (404 second time, 403/401), job deletion removes resources, remove/restore keeps them, admin job list `resourceCount`, stats `learningResources` |

Increment 7 is final documentation and verification (no new tests). Increment 8 adds the learning-resources requirement requested after it.

## Real results so far

| Run | Result |
|---|---|
| Increments 1-2 (51 tests): run by the developer on their own machine, real MongoDB | **51 passed, 0 failed** |
| Increment 3 (83 tests total after bug fix BF1) | **Run by the developer: 83 passed, 0 failed** |
| Increment 4 (34 new tests, 117 total) | **Run by the developer: 117 passed, 0 failed** |
| Increment 5 (69 tests) | Run by the developer: all passed (186 total at that point) |
| Increment 6 (60 new tests, 246 total) | **Run by the developer: 246 passed, 0 failed** |
| ESLint, client and server (author's sandbox, after Increment 5) | **Clean** (two real errors from earlier increments were found and fixed, see BF3) |
| Increment 8 (44 new tests, 290 total): ESLint client and server, `node --check` on every server file, routes registered | **Clean / passed** in the author's sandbox |
| Increment 8: the 15 tests that need no database (`learningResourceRules.test.js`) | **15 passed, 0 failed** in the author's sandbox |
| Increment 8: the 29 database tests (`learningResources.test.js`) | **Run by the developer (16 Nov 2026): 290 passed, 0 failed in total** |
| Increment 8: seed, browser checklist 65-73, `vite build` | Not recorded as done; tick them in the final pass (items 54-73) |
| Client `vite build` | Not recorded for the final code (the author's sandbox cannot run Vite's Windows binaries). All client files parse and pass ESLint; run `npm run build` in `client` as checklist item 55 |
