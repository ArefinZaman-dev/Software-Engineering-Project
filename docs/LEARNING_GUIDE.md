# Learning guide

Written so you can explain every part in your viva. One section per module; sections for later modules are added with their increments.
Bugs section: no application bugs have been found yet because the database-backed tests have not been run. Real findings will be added after your first run.

---

## 1. Authentication (who are you?)

**What we built.** Register, login, logout, and "who am I" (`/api/auth/me`). The browser keeps a token and sends it with every request.

**Why this design.**
- Passwords are turned into a *hash* with bcrypt. A hash cannot be reversed, so even if the database leaks, passwords are not exposed. bcrypt is deliberately slow, which makes guessing expensive.
- After a correct login the server signs a **JWT** (JSON Web Token) containing only the user id. The server can later verify the signature to know the token was not forged.
- On every request we still load the user from the database. That is why suspending a user works immediately: the old token is valid, but the account status is not.

**Concepts to understand.**
- Hashing versus encryption. Salt (bcrypt adds one automatically).
- What a JWT contains (header, payload, signature) and that its payload is readable but not forgeable.
- Stateless sessions: logout means the browser throws the token away.
- Trade-off: a token in `localStorage` is easy to use but readable by any script on the page (XSS). Alternative: httpOnly cookies (planned for Version 2).

**Key code.** `services/authService.js` (register, login), `middleware/authenticate.js` (verifies the token and loads the user), `utils/token.js`, `utils/password.js`, `context/AuthContext.jsx` (restores the session on page load).

**Details worth mentioning.**
- Wrong email and wrong password give the same message and take similar time, so attackers cannot learn which emails exist.
- The `email` unique index is the final guard against duplicate accounts, even if two sign-ups arrive together.

---

## 2. Authorization (what are you allowed to do?)

**Authentication versus authorization.** Authentication proves *who* you are. Authorization decides *what* you may do. A logged-in student is authenticated but is not authorized to view admin statistics.

**What we built.**
- `authorizeRoles(...)` - allows only certain roles on a route.
- `requireSelf('id')` - allows only the owner of the resource.
- Route order matters, for example: authenticate → role → id format → ownership → body validation.

**Why on the backend.** Hiding a button or redirecting in React is only a courtesy. Anyone can call the API directly with a tool like Postman. The server is the only place that can really enforce rules.

**Mass assignment protection.** If an API blindly copies request fields into the database, an attacker could send `"role": "ADMIN"`. We prevent this three ways: registration only accepts `STUDENT` or `POSTER`; update schemas are `.strict()` and reject unknown fields; the `role` field is `immutable` in the model.

**Key code.** `middleware/authorize.js`, `routes/studentRoutes.js`, `validators/profileValidators.js`, `tests/authorization.test.js`.

---

## 3. Profiles

**What we built.** Student and Poster profiles, a profile completeness score, a rating summary display, and a read-only public profile.

**Why embedded, not a separate collection.** A profile always belongs to exactly one user and is always read with that user. In MongoDB, embedding such data in the same document is simpler and faster than a second collection with a reference. If profiles later needed to be shared or queried separately, we could split them.

**Concepts to understand.**
- Embedded documents versus references in MongoDB.
- Mongoose *virtuals* (`profileCompletion` is calculated, not stored).
- Public versus private views of the same data: `toPublicProfile()` deliberately leaves out email and account status.
- `select: false` on `passwordHash` so it can never leak by accident.

**Key code.** `models/User.js`, `services/profileService.js`, `utils/profileCompletion.js` (with its unit tests), `pages/student/StudentProfilePage.jsx`.

---

## 4. Frontend patterns used in Increments 1-2

- **Context API** (`AuthContext`) holds the logged-in user so any component can read it through `useAuth()`.
- **Protected routes** redirect visitors to the login page and send people with the wrong role to their own dashboard.
- **`apiClient`** is the single place that adds the token and turns network and server failures into one `ApiError` shape.
- **`useAsync`** gives every data screen a loading state, an error state with a retry button, and the data.
- **Validation twice**: `utils/validators.js` gives instant feedback; the server repeats every check.

---

## 5. Job marketplace (Increment 3)

**What we built.** Categories (seeded, read-only for now), jobs (create, edit, delete, close, cancel), and public discovery (search, filter, sort, pagination, job details).

**Why some pages are public.** The project brief lists "Browse Jobs" and "Job Details" as *public* pages (Section 4) - a visitor does not need an account to look around, only to apply. That is why `GET /api/jobs` and `GET /api/jobs/:id` have no `authenticate` middleware, unlike every profile route from Increment 2. The frontend mirrors this: `BrowseJobsPage` and `JobDetailsPage` live under `PublicLayout`, not behind `ProtectedRoute`.

**Search, filter, sort, paginate - how each works.**
- *Search* uses MongoDB's built-in `$text` index (`jobSchema.index({ title: 'text', description: 'text' })`). It is a simple keyword search, not "smart" ranking - good enough for a semester project.
- *Filters* (category, location, work type, budget range) are just extra conditions added to the same MongoDB query object.
- *Sort* maps a short public name (`budget_high`) to the actual MongoDB sort object, so the API never exposes raw field names the client could misuse.
- *Pagination* uses `.skip()` and `.limit()`, and returns `{ page, limit, total, totalPages }` so the frontend can render page buttons without a second request.

**Ownership and the 404-vs-403 choice.** Editing, closing, cancelling, and deleting all call `getOwnedJob(poster, id)`, which queries `Job.findOne({ _id: id, poster: poster._id })`. If the job exists but belongs to someone else, this query still returns nothing, and the code cannot tell "wrong owner" apart from "does not exist" - so it replies `404` either way. This is a deliberate, explainable trade-off (see DECISIONS D24): it is simpler code, and it does not confirm to an attacker that a specific job id belongs to some other poster.

**Status rules, enforced on the backend, not just hidden in the UI.** A job can only be edited, closed, or deleted while it is `OPEN` (business rules, Section 33). The service checks `job.status !== JOB_STATUS.OPEN` and throws a `409 Conflict` if so - `409` because the request is valid, but conflicts with the resource's current state.

**A deliberately unfinished piece.** Deleting a job is only guarded by "must be OPEN" right now. The full rule also says "and has no applications", but the `Application` model does not exist until Increment 4. This is written as a `// TODO` comment directly in `jobService.js`, plus an entry in DECISIONS.md and the README's Known Limitations, so it is never silently forgotten (Section 28 of the brief: "no UI-only fake functionality", and by extension, no silently-incomplete backend rules either).

**Key code.** `models/Job.js`, `models/Category.js`, `services/jobService.js`, `validators/jobValidators.js`, `components/JobForm.jsx` (shared by create and edit), `pages/BrowseJobsPage.jsx`.

---

## 6. Applications (Increment 4)

**What we built.** Apply, applicant list, shortlist, accept, reject, withdraw, and the rules that connect applications to the job's status.

**The state machine.** An application only moves along allowed paths: `PENDING` to `SHORTLISTED`, `ACCEPTED`, `REJECTED`, or `WITHDRAWN`; `SHORTLISTED` to `ACCEPTED`, `REJECTED`, or `WITHDRAWN`; `ACCEPTED` to `WITHDRAWN` (or `COMPLETED` in Increment 5). `REJECTED` and `WITHDRAWN` are final. Each service function checks the current status first and returns `409 Conflict` for a move that is not allowed, so the rules live on the server and cannot be bypassed from the browser.

**Why accept is the hardest part.** Accepting must do three things together: mark one application `ACCEPTED`, move the job to `IN_PROGRESS`, and reject all other open applications. If two accept requests arrive at the same moment, both could succeed. A database transaction would solve this, but standalone MongoDB does not support transactions. Instead, the job update is conditional: `findOneAndUpdate({ _id, status: 'OPEN' }, ...)`. Only one request can find the job still `OPEN`; the other gets `null` and receives a `409`. The trade-off is explained in DECISIONS D31.

**Duplicates are stopped twice.** The service checks for an existing application and returns a friendly message. A unique index on `(job, student)` guarantees it even if two identical requests race.

**Withdraw and reopen.** If the accepted student withdraws, the application becomes `WITHDRAWN` and the job returns to `OPEN`. Other applicants stay `REJECTED`. If instead the poster cancels the job, the accepted application becomes `WITHDRAWN` with `withdrawnBy: POSTER_CANCELLED`, so history shows who ended the work.

**Key code.** `models/Application.js`, `services/applicationService.js`, `routes/applicationRoutes.js`, `pages/poster/JobApplicantsPage.jsx`, `tests/applications.test.js`.

---

## 7. Completion, reviews, messaging, and reports (Increment 5)

**What we built.** The poster marks an in-progress job completed; both people review each other once; shortlisted or accepted applicants can message; anyone can report a job or a user.

**Completing a job.** `completeJob` reuses the accept idea (D31): a conditional `findOneAndUpdate({ status: 'IN_PROGRESS' })` so a simultaneous cancel and complete cannot both win. The accepted application becomes `COMPLETED` in the same service call, which is what unlocks reviews.

**Who is a participant?** A job has exactly two: its poster, and the student of `job.acceptedApplication`. `getParticipation` works this out; anyone else gets `404` (same reasoning as D24/D30). The reviewee is *never* read from the request: the server picks the other participant, and zod drops any `reviewee` the caller sends.

**Derived data.** `ratingSummary` on the user is recomputed with an aggregation (`$avg`, `$sum`) over the reviews after each new review. Because it is derived, an admin removing a review in Increment 6 just calls `recalculateRatingSummary` again.

**One review per direction.** Checked in the service for a friendly message, and by the unique index `(job, reviewer)` for races, the same double protection as applications.

**Messaging rules.** A conversation belongs to one application. Either person can open it (idempotent), but only while the application is `SHORTLISTED` or `ACCEPTED` (B7). Later it becomes read-only. Opening a thread marks the other person's messages as read (`updateMany` on `readAt`). The inbox gets last message and unread count from one aggregation (D41).

**Reports and the partial index.** A reporter may have only one *active* report per target. MongoDB's partial unique index can filter on `isActive: true`, and a `pre('save')` hook keeps `isActive` equal to "status is PENDING or REVIEWING". Once an admin resolves it, the same person can report again.

**Lesson from BF1.** Every new model has `toJSON: { virtuals: true }` and tests assert `id` is present and `_id` absent. Populated users are loaded with `select: 'name role'`, so email never reaches the response.

**Key code.** `models/Review.js`, `Conversation.js`, `Message.js`, `Report.js`; `services/reviewService.js`, `conversationService.js`, `reportService.js`; `pages/ReviewJobPage.jsx`, `MessagesPage.jsx`, `ConversationPage.jsx`, `components/ReportForm.jsx`; tests `completion`, `reviews`, `conversations`, `reports`.
