# CampusGig

**Connecting Students with Trusted Flexible Work.**

CampusGig is a two-sided marketplace where university students find short-term jobs and micro-tasks, and individuals, businesses, and organizations find reliable student help. It is a Software Engineering Lab project (CSE 328, BUBT) by team **CodeConnect**, built with the Incremental Model over 16 Sep 2026 – 15 Dec 2026 (SOW #001).

> **Project status: Increments 1–6 of 7 are built. Increments 1–5 are verified on the developer's own machine. Increment 6 (admin panel; 246 tests in total) is written, lint-clean and syntax-checked, but its tests have not been run against MongoDB yet.** See [PROGRESS.md](PROGRESS.md) for exact status.

## Problem statement

Students want flexible income that fits around classes, but finding safe, short-term work is hard. Posters who need small tasks done have no trusted place to find students. CampusGig adds structure and trust: roles, profiles, an application workflow, two-way reviews, reporting, and admin moderation.

## Features

| Area | Status |
|---|---|
| Registration (Student / Poster), login, logout, session persistence | Built (Increment 2) |
| Password hashing, JWT auth, backend role-based authorization | Built (Increment 2) |
| Student and Poster profiles, profile completeness, rating summary display | Built (Increment 2) |
| Role-specific dashboards, admin dashboard with user counts | Built (Increment 2) |
| Jobs: create, edit, delete, close, cancel, browse, search, filter, sort, pagination | Built (Increment 3) |
| Applications, shortlist / accept / reject, withdraw, status rules | Built and verified (Increment 4) |
| Mark job completed, two-way reviews with rating summary, basic messaging, filing reports | Built and verified (Increment 5) |
| Admin panel: statistics, suspend/reactivate users, remove/restore jobs and reviews, resolve reports, manage categories | Built (Increment 6, tests written, not yet run) |
| Full verification, final report, viva prep | Increment 7 |

## User roles

- **Student:** builds a profile, applies to jobs, receives and gives reviews.
- **Poster:** an individual, business, or organization that posts jobs and hires one student per job.
- **Admin:** moderates users, jobs, categories, and reports. Admin accounts exist only through the seed script.

## Tech stack

React 18 + Vite + React Router + Tailwind CSS 4 (client) · Node.js + Express 4 (server) · MongoDB + Mongoose 8 · REST API · JWT + bcryptjs · zod validation · helmet, cors, express-rate-limit · Node's built-in test runner + supertest.

## Architecture overview

A single-repository monolith: a React single-page app talks to an Express REST API, which talks to MongoDB. Routes only map URLs to controllers; controllers call services; services hold business logic and use Mongoose models. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Installation

Requirements: **Node.js 20.10 or newer**, npm, and a MongoDB database (local MongoDB or a free MongoDB Atlas cluster).

```bash
# 1. Server
cd server
npm install

# 2. Client
cd ../client
npm install
```

## Environment variables

Copy `.env.example` (project root) to **`server/.env`** and fill it in:

```bash
# macOS / Linux
cp .env.example server/.env
# Windows (Command Prompt)
copy .env.example server\.env
```

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGODB_URI` | Development database connection string |
| `MONGODB_URI_TEST` | Separate database used by tests. **Tests delete all its data.** Its name must contain "test". |
| `JWT_SECRET` | Long random secret used to sign login tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `CLIENT_ORIGIN` | Address of the React app, for CORS (default `http://localhost:5173`) |

Generate a secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

`.env` files are ignored by Git. Never commit real secrets.

## Database setup and seeding

The database and collections are created automatically. To load demo data:

```bash
cd server
npm run seed
```

The seed script **deletes existing users** and creates the demo accounts below. It refuses to run when `NODE_ENV=production`.

## Running the project

```bash
# Terminal 1 - API on http://localhost:5000
cd server
npm run dev

# Terminal 2 - React app on http://localhost:5173
cd client
npm run dev
```

In development the client forwards `/api` requests to the server (see `client/vite.config.js`), so no extra client configuration is needed.

## Demo credentials (development / demo data only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@campusgig.demo` | `Admin@12345` |
| Student | `nusrat.jahan@campusgig.demo` | `Demo@12345` |
| Student | `tanvir.ahmed@campusgig.demo` | `Demo@12345` |
| Student (incomplete profile) | `farhana.akter@campusgig.demo` | `Demo@12345` |
| Poster (individual) | `rafiq.hasan@campusgig.demo` | `Demo@12345` |
| Poster (business) | `sadia.rahman@campusgig.demo` | `Demo@12345` |
| Poster (organization) | `imran.hossain@campusgig.demo` | `Demo@12345` |

These are fake accounts with public passwords. Never use them or these passwords in a real deployment.

## API overview

Base path `/api`. Responses are `{ success, message?, data }` on success and `{ success:false, status, message, errors? }` on failure. Implemented so far: `/auth`, `/students/:id`, `/posters/:id`, `/admin/stats`, `/categories`, `/jobs` (including applications, `complete`, and `reviews`), `/applications`, `/reviews/user/:id`, `/conversations`, `/reports`, `/admin` (stats, users, jobs, reviews, reports, categories), `/health`. Full details: [docs/API.md](docs/API.md).

## Testing

```bash
cd server
npm test        # runs all tests (needs MONGODB_URI_TEST)
npm run lint
```

See [docs/TESTING.md](docs/TESTING.md) and [docs/MANUAL_VERIFICATION.md](docs/MANUAL_VERIFICATION.md).

## Project structure

```
CampusGig-V1/
├── client/   React app (components, pages, layouts, hooks, context, services, utils, routes)
├── server/   Express API (config, constants, controllers, middleware, models, routes, services, utils, validators, seed, tests)
├── docs/     SRS, architecture, database, API, testing, decisions, learning guide, ...
├── PROGRESS.md
└── .env.example
```

## Future scope

Online payments and escrow, real-time chat, identity verification and trust badges, AI job recommendations and candidate matching, notifications, analytics, and production deployment. The data model and API are designed so these can be added without rewrites.

## Known limitations (current state)

- Messaging updates by checking every 5 seconds (not instant push); true real-time chat is Version 2. There is no appeal flow for suspended users, and suspension has no reason or expiry field; both are Version 2 ideas.
- No profile photo upload (needs file storage; planned for Version 2). Initials are shown instead.
- Email cannot be changed and there is no password reset or email verification yet.
- The Increment 5 database tests have been written but not yet run (see PROGRESS.md).

## Project information

Team CodeConnect · Bangladesh University of Business and Technology (BUBT) · CSE 328 Software Engineering Lab · Statement of Work SOW #001.
