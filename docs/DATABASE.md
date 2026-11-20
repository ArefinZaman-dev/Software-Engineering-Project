# Database design

MongoDB with Mongoose. All collections are designed now so later increments do not force rewrites.
**Status:** all collections are implemented (Increments 1-6, 8). Increment 6 added no new collections or fields. Increment 8 added one new collection, `learningresources`.

```mermaid
erDiagram
  USER ||--o{ JOB : posts
  CATEGORY ||--o{ JOB : classifies
  USER ||--o{ APPLICATION : submits
  JOB ||--o{ APPLICATION : receives
  JOB ||--o{ REVIEW : "has (max 2)"
  USER ||--o{ REVIEW : "writes / receives"
  APPLICATION ||--o| CONVERSATION : "opens"
  CONVERSATION ||--o{ MESSAGE : contains
  USER ||--o{ REPORT : files
  JOB ||--o{ LEARNING_RESOURCE : "has (max 20)"
  USER ||--o{ LEARNING_RESOURCE : "admin adds"
```

## users (implemented)
| Field | Type | Notes |
|---|---|---|
| `name` | String, 2-80 | Person's name (poster's contact name too) |
| `email` | String, unique, lowercase | Unique index |
| `passwordHash` | String, `select:false` | Never returned by queries or JSON |
| `role` | `STUDENT` / `POSTER` / `ADMIN` | `immutable` |
| `status` | `ACTIVE` / `SUSPENDED` | Checked on every authenticated request |
| `location`, `bio` | String | `bio` is the student bio or poster description |
| `studentProfile` | `{ university, department, skills[], availability, experience }` | Only on students |
| `posterProfile` | `{ organizationType, organizationName, website }` | Only on posters |
| `ratingSummary` | `{ average, count }` | Derived; written only by the review module |
| `lastLoginAt`, `createdAt`, `updatedAt` | Date | |

Virtual `profileCompletion` (percentage + missing items) is included in the owner's JSON only.
**Why embedded profiles:** see DECISIONS D15.

## categories (implemented, Increment 3)
`name` (unique), `slug` (unique), `isActive`. A category with jobs is deactivated, never deleted (deactivation is an admin action, built in Increment 6).

## jobs (implemented, Increment 3)
`poster` (ref User, immutable), `title`, `description`, `category` (ref), `skills[]`, `budget`, `duration`, `location`, `workType` (`REMOTE`/`ON_SITE`/`HYBRID`), `deadline`, `status` (`OPEN`/`CLOSED`/`IN_PROGRESS`/`COMPLETED`/`CANCELLED`), `acceptedApplication` (ref, set in Increment 4), `removedByAdmin` (Boolean, used from Increment 6).
Indexes: `{ status, createdAt }`, `{ category }`, `{ poster, createdAt }`, text index on `title` and `description`.
All five job statuses are in use: `IN_PROGRESS` is set when an application is accepted (Increment 4) and `COMPLETED` when the poster completes the job (Increment 5).

## applications (implemented, Increment 4)
`job`, `student` (both immutable), `coverMessage` (10-1000), `proposedAmount` (optional), `status` (`PENDING`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, `COMPLETED`), `withdrawnBy` (`STUDENT` or `POSTER_CANCELLED`, only when withdrawn). `COMPLETED` is set in Increment 5.
**Unique index `{ job, student }`** - one application per student per job, ever.

## reviews (implemented, Increment 5)
`job`, `application`, `reviewer`, `reviewee`, `rating` (1-5 integer), `comment`, `removedByAdmin`.
**Unique index `{ job, reviewer }`** - one review per direction. Index `{ reviewee, createdAt }` for profile listings. `reviewer`/`reviewee` are set by the server from the job, never from the request.

## conversations and messages (implemented, Increment 5)
`conversations`: `job`, `application` (unique), `poster`, `student`, `lastMessageAt`.
`messages`: `conversation`, `sender`, `body` (1-2000), `readAt` (null until the other person opens the thread). Index `{ conversation, createdAt }`.

## reports (implemented, Increment 5)
`reporter`, `targetType` (`JOB`/`USER`), `targetJob` or `targetUser`, `reason` (fixed list), `description`, `status` (`PENDING`/`REVIEWING`/`RESOLVED`/`DISMISSED`), `resolvedBy`, `resolutionNote`, `resolvedAt`.
A partial unique index (`isActive: true`) prevents two active reports by the same reporter against the same target. `isActive` is derived from `status` in a `pre('save')` hook, so Increment 6 must change report status with `document.save()`, not `updateOne`.

## learningresources (implemented, Increment 8)
`job` (ref Job, immutable), `title` (3-120), `type` (`VIDEO`/`ARTICLE`/`COURSE`/`DOCUMENT`/`NOTE`/`OTHER`), `url` (http(s) link, max 500, empty for a note), `description` (max 1000, required for a note), `skill` (optional label, max 40), `addedBy` (ref User, immutable, never sent to clients), `createdAt`, `updatedAt`.
Index `{ job, createdAt }` for the per-job list. A `pre('validate')` hook enforces the type rule (link unless note, text for a note) even if something writes to the model without going through the API. Resources are deleted with their job.

## Duplicates are stopped twice
Business rules are checked in services (friendly error messages), and unique indexes in MongoDB guarantee correctness even if two requests arrive at the same moment.
