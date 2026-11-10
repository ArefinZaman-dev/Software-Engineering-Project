# Work Breakdown Structure (WBS) — Hybrid (Phase-based + Deliverable-based)

**Project:** CampusGig V1 — Student Job & Micro-Task Marketplace
**Team:** CodeConnect · BUBT · CSE 328 Software Engineering Lab · SOW #001

**Structure:** Level 1 (**Task**) = standard SDLC phase. Level 2 (**Subtask**) = the major deliverable produced in that phase. Level 3 (**Work Package**) = the group of work that produces that deliverable. Level 4 (**Activity**) = concrete action within a work package. Major items only — not every file or function.

---

## 1.0 Project: CampusGig V1

### Task 1 — Planning Phase
- **Subtask 1.1 — Deliverable: Project Plan (SOW, Schedule, WBS)**
  - Work Package 1.1.1 — Project Scheduling
    - Activity: Define increments, milestones, and team roles

### Task 2 — Requirement Analysis Phase
- **Subtask 2.1 — Deliverable: Feasibility Study Report**
  - Work Package 2.1.1 — Technical Feasibility
    - Activity: Assess whether the chosen stack (React, Node/Express, MongoDB) can meet the requirements
    - Activity: Assess team skill readiness against the required technology
  - Work Package 2.1.2 — Operational Feasibility
    - Activity: Assess whether the system fits how students and posters actually work
    - Activity: Assess ease of adoption and day-to-day use for each user role
  - Work Package 2.1.3 — Economic Feasibility
    - Activity: Assess development cost versus available time and resources (student project, no paid infrastructure)
    - Activity: Assess ongoing cost of hosting/running the system after delivery
- **Subtask 2.2 — Deliverable: Requirement Elicitation & Analysis Report**
  - Work Package 2.2.1 — Requirement Elicitation
    - Activity: Identify user roles (Student, Poster, Admin), objectives, and scope
    - Activity: Gather requirements from the project brief and stakeholder discussion
  - Work Package 2.2.2 — Requirement Analysis
    - Activity: Define functional and non-functional requirements
    - Activity: Define business rules (job, application, review workflows)
- **Subtask 2.3 — Deliverable: Requirement Validation Report**
  - Work Package 2.3.1 — Requirement Review & Validation
    - Activity: Check requirements for completeness, consistency, and feasibility
    - Activity: Resolve ambiguous or conflicting requirements with stakeholders
- **Subtask 2.4 — Deliverable: Requirement Management Plan**
  - Work Package 2.4.1 — Requirement Traceability & Change Control
    - Activity: Maintain a requirement traceability record (SRS ↔ implementation)
    - Activity: Track and document requirement changes throughout development

### Task 3 — System Design Phase
- **Subtask 3.1 — Deliverable: Database Design (ER Diagram, Schema)**
  - Work Package 3.1.1 — Data Modeling
    - Activity: Design User, Job, Application, Review collections
    - Activity: Define relationships and indexes
- **Subtask 3.2 — Deliverable: API Design (API Contract)**
  - Work Package 3.2.1 — Interface Design
    - Activity: Define REST endpoints and response format
- **Subtask 3.3 — Deliverable: System Architecture Document**
  - Work Package 3.3.1 — Architecture Modeling
    - Activity: Define backend layered architecture
    - Activity: Define frontend component structure

### Task 4 — Implementation Phase
- **Subtask 4.1 — Deliverable: Authentication & Authorization Module**
  - Work Package 4.1.1 — Backend Implementation
    - Activity: Implement JWT auth, password hashing, RBAC middleware
  - Work Package 4.1.2 — Frontend Implementation
    - Activity: Build login, register, and profile pages
- **Subtask 4.2 — Deliverable: Job Marketplace Module**
  - Work Package 4.2.1 — Backend Implementation
    - Activity: Implement job CRUD and discovery APIs
  - Work Package 4.2.2 — Frontend Implementation
    - Activity: Build browse-jobs, job-details, and post-job pages
- **Subtask 4.3 — Deliverable: Application & Candidate Selection Module**
  - Work Package 4.3.1 — Backend Implementation
    - Activity: Implement apply, shortlist, accept/reject logic
- **Subtask 4.4 — Deliverable: Review, Messaging & Reporting Module**
  - Work Package 4.4.1 — Backend Implementation
    - Activity: Implement reviews, basic messaging, and reports
- **Subtask 4.5 — Deliverable: Admin Panel Module**
  - Work Package 4.5.1 — Backend & Frontend Implementation
    - Activity: Implement user/job moderation and category/report management

### Task 5 — Testing Phase
- **Subtask 5.1 — Deliverable: Automated Test Suite**
  - Work Package 5.1.1 — Unit & API Testing
    - Activity: Write and run tests for each module
- **Subtask 5.2 — Deliverable: Manual QA Report**
  - Work Package 5.2.1 — End-to-End Verification
    - Activity: Execute the manual checklist and log results

### Task 6 — Deployment Phase
- **Subtask 6.1 — Deliverable: Deployment Package**
  - Work Package 6.1.1 — Build & Packaging
    - Activity: Prepare `.env.example`, seed data, and clean project ZIP
- **Subtask 6.2 — Deliverable: Installation Guide**
  - Work Package 6.2.1 — Setup Documentation
    - Activity: Write README installation and running instructions

### Task 7 — Maintenance Phase
- **Subtask 7.1 — Deliverable: Bug Fix / Change Log**
  - Work Package 7.1.1 — Issue Resolution
    - Activity: Track and fix defects found after each test run
- **Subtask 7.2 — Deliverable: Final Report & Viva Preparation**
  - Work Package 7.2.1 — Project Closure Documentation
    - Activity: Write the final report, viva prep, and learning guide
