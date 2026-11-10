# API reference

Base URL (development): `http://localhost:5000/api`. The React dev server proxies `/api` to it.

## Conventions

Success:
```json
{ "success": true, "message": "Optional text", "data": { } }
```
Failure (never contains stack traces):
```json
{ "success": false, "status": 400, "message": "Please check the highlighted fields.",
  "errors": [ { "field": "email", "message": "Enter a valid email address." } ] }
```
Some errors add `"code"` (for example `ACCOUNT_SUSPENDED`). Protected routes need `Authorization: Bearer <token>`.

| Status | Meaning |
|---|---|
| 200 / 201 | Success / created |
| 400 | Validation error, malformed JSON, or invalid id |
| 401 | Missing, invalid, or expired token; wrong login |
| 403 | Logged in but not allowed (wrong role, someone else's resource, suspended) |
| 404 | Resource or route not found |
| 409 | Duplicate (for example email already registered) |
| 413 / 429 / 500 | Body too large / too many requests / server error (generic message) |

## Implemented endpoints (Increments 1-5)

### `GET /api/health`
Public. `200 { success, data: { status: "ok" } }`.

### `POST /api/auth/register`
Public. Body: `role` (`STUDENT`|`POSTER`), `name`, `email`, `password`; optional `university` (students), `organizationType`, `organizationName` (posters). Password: 8-72 chars with a letter and a number. `ADMIN` is rejected. Unknown fields are ignored.
`201 { data: { user, token } }` · `400` validation · `409` email exists.

### `POST /api/auth/login`
Public. Body: `email`, `password`. `200 { data: { user, token } }` · `401` "Invalid email or password." (same for unknown email) · `403` `ACCOUNT_SUSPENDED`.

### `GET /api/auth/me`
Auth required. `200 { data: { user } }` - the user includes `profileCompletion: { percentage, missing[] }`.

### `POST /api/auth/logout`
Auth required. `200`. Tokens are stateless; the client deletes its token.

### `GET /api/students/:id` and `GET /api/posters/:id`
Auth required (any role). Returns `{ data: { profile } }` with name, role, location, bio, role profile, rating summary. **Never** email or status. `400` bad id · `404` not found, wrong role, or suspended user.

### `PUT /api/students/:id`
Student only, own profile only. Body (all optional, at least one, unknown fields rejected): `name`, `location`, `bio`, `university`, `department`, `skills[]` (max 20, duplicates removed), `availability` (`FLEXIBLE`|`WEEKDAYS`|`WEEKENDS`|`EVENINGS`|`NOT_AVAILABLE`), `experience`.
`200 { data: { user } }` · `400` · `401` · `403` (not a student, or not your id).

### `PUT /api/posters/:id`
Poster only, own profile only. Body: `name`, `location`, `bio`, `organizationType` (`INDIVIDUAL`|`BUSINESS`|`ORGANIZATION`), `organizationName`, `website` (must start with http:// or https://). Same responses as above.

### `GET /api/admin/stats`
Admin only. `200 { data: { stats: { totalUsers, students, posters } } }` · `401` · `403`.

### `GET /api/categories`
Public. `200 { data: { categories: [{ id, name, slug }] } }`, active categories only, sorted by name.

### `GET /api/jobs`
Public. Query params (all optional): `search`, `category` (id), `location`, `workType`, `minBudget`, `maxBudget`, `sort` (`newest`|`budget_high`|`budget_low`|`deadline_soon`, default `newest`), `page` (default 1), `limit` (default 12, max 50). Only returns `OPEN` jobs from active (non-suspended), non-removed posters.
`200 { data: { jobs: [...], pagination: { page, limit, total, totalPages } } }` · `400` for an invalid query value.

### `GET /api/jobs/mine`
Poster only. Returns all of the caller's own jobs, in every status. `200 { data: { jobs } }` · `401` · `403`.

### `GET /api/jobs/:id`
Public. Full job details, including the poster's public info. `200 { data: { job } }` · `400` bad id · `404` not found, removed by an admin, or the poster is suspended.

### `POST /api/jobs`
Poster only. Body: `title` (5-120 chars), `description` (20-5000 chars), `category` (id, must be an active category), `skills[]` (optional, max 15, duplicates removed), `budget` (number, 1-10,000,000), `duration` (1-60 chars), `location` (1-100 chars), `workType` (`REMOTE`|`ON_SITE`|`HYBRID`), `deadline` (ISO date string, must be in the future). Job starts as `OPEN`.
`201 { data: { job } }` · `400` validation · `401` · `403`.

### `PUT /api/jobs/:id`
Poster only, own job only, only while `status = OPEN`. Body: any subset of the create fields (at least one; unknown fields rejected).
`200 { data: { job } }` · `400` · `401` · `403` not a poster · `404` not your job or does not exist · `409` job is not open.

### `DELETE /api/jobs/:id`
Poster only, own job only, only while `status = OPEN`. `200` · `401` · `403` · `404` · `409` job is not open. *(Increment 4 will additionally require the job to have no applications.)*

### `POST /api/jobs/:id/close`
Poster only, own job only. `OPEN → CLOSED`. `200 { data: { job } }` · `404` · `409` if not currently open.

### `POST /api/jobs/:id/cancel`
Poster only, own job only. `OPEN → CANCELLED` or `IN_PROGRESS → CANCELLED`. `200 { data: { job } }` · `404` · `409` if not in a cancellable status.

### `POST /api/jobs/:id/applications`
Student only. Body: `coverMessage` (10-1000 chars), optional `proposedAmount` (positive number). Creates a `PENDING` application. `201 { data: { application } }` · `400` validation · `401` · `403` not a student · `404` job not found/hidden · `409` job not open, deadline passed, or already applied (a withdrawn application can never be re-submitted).

### `GET /api/jobs/:id/applications`
Poster only, own job only. Lists applicants (with student public info). `PENDING`/`SHORTLISTED` applications from suspended students are hidden. `200 { data: { applications } }` · `403` · `404` not your job.

### `GET /api/applications/mine`
Student only. The caller's own applications, each with its job. `200` · `403`.

### `POST /api/applications/:id/shortlist`
Poster only (owner of the job). `PENDING → SHORTLISTED`. `200` · `404` not found / not yours · `409` wrong current status.

### `POST /api/applications/:id/reject`
Poster only. `PENDING|SHORTLISTED → REJECTED`. `200` · `404` · `409`.

### `POST /api/applications/:id/accept`
Poster only. Application becomes `ACCEPTED`, the job becomes `IN_PROGRESS`, and every other `PENDING`/`SHORTLISTED` application for that job becomes `REJECTED`. Guarded by a conditional update so only one accept can win. `200` · `404` · `409` status is wrong or the job is no longer open.

### `POST /api/applications/:id/withdraw`
Student only, own application only. From `PENDING`/`SHORTLISTED`/`ACCEPTED` to `WITHDRAWN` (`withdrawnBy: STUDENT`). If it was `ACCEPTED`, the job returns to `OPEN`. `200` · `404` · `409`.

Also changed in Increment 4: `DELETE /api/jobs/:id` now returns `409` if the job has any application, and `POST /api/jobs/:id/cancel` on an `IN_PROGRESS` job marks the accepted application `WITHDRAWN` with `withdrawnBy: POSTER_CANCELLED`.

### `POST /api/jobs/:id/complete`
Poster only, own job only. `IN_PROGRESS → COMPLETED`; the accepted application becomes `COMPLETED`. Guarded by a conditional update. `200 { data: { job } }` · `403` · `404` not your job · `409` job is not in progress.

### `GET /api/jobs/:id/reviews`
Student or poster who took part in the job (the poster, or the accepted student); anyone else gets `404`. `200 { data: { job: {id,title,status}, counterpart: {id,name,role} | null, given, received, canReview } }`. Before the job is completed: `counterpart`, `given`, `received` are `null` and `canReview` is `false`.

### `POST /api/jobs/:id/reviews`
Same participants. Body: `rating` (integer 1-5), optional `comment` (max 1000). The reviewee is worked out by the server, never read from the body. Only after the job is `COMPLETED`; one review per person per job. Updates the reviewee's `ratingSummary`.
`201 { data: { review } }` · `400` · `403` · `404` not a participant · `409` job not completed, or already reviewed.

### `GET /api/reviews/user/:id`
Any logged-in user. Reviews a user has received (newest first, max 50, admin-removed ones left out), each with `reviewer {id,name,role}` and `job {id,title}`. `404` for unknown, suspended, or admin users · `400` bad id.

### `POST /api/applications/:id/conversation`
Student or poster on that application (the job's poster or the applicant); others get `404`. Opens the conversation, or returns the existing one. A new conversation needs the application to be `SHORTLISTED` or `ACCEPTED`.
`201` created · `200` already existed · `404` · `409` application not shortlisted/accepted. Response: `{ data: { conversation: { id, job, application, counterpart: {id,name,role}, lastMessageAt, canSend } } }`.

### `GET /api/conversations`
Student or poster. The caller's conversations, most recent activity first, each with `unreadCount` and `lastMessage { body, sentByMe, createdAt } | null`. Conversations with a suspended user are hidden.

### `GET /api/conversations/:id/messages`
Participants only (`404` otherwise, also when the other person is suspended). Returns `{ conversation, messages }` (last 200, oldest first) and marks the other person's messages as read.

### `POST /api/conversations/:id/messages`
Participants only. Body: `body` (1-2000 chars, trimmed). `201 { data: { message } }` · `400` · `404` · `409` the application is no longer shortlisted/accepted (thread is read-only).

### `POST /api/reports`
Student or poster. Body: `targetType` (`JOB`|`USER`), `targetId`, `reason` (`SPAM`, `SCAM_OR_FRAUD`, `INAPPROPRIATE_CONTENT`, `HARASSMENT`, `FAKE_PROFILE`, `OTHER`), optional `description` (max 1000; at least 10 chars when the reason is `OTHER`). Status starts as `PENDING`; `status` and resolution fields in the body are ignored.
`201 { data: { report } }` · `400` validation, own job, or yourself · `403` admin · `404` target missing, removed, suspended, or an admin · `409` you already have an active report on this target.

## Planned endpoint groups
`/api/users`, category admin routes, report management, and the rest of `/api/admin` (Increment 6). Messages live under `/api/conversations/:id/messages`; there is no separate `/api/messages`. This file is updated as each group is built.
