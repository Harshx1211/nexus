# Software Requirements Specification (SRS)
## Project: NEXUS - Mentor-Mentee Platform
### AI-Driven Job Matching & Educational Exchange Ecosystem

---

**Document Control**

**Document Information**
| Title | Software Requirements Specification for NEXUS Platform |
| :--- | :--- |
| Date | May 2025 |
| Status | Final Draft |
| Version | 3.0.0-PREMIUM |
| Prepared for | Mentor and Students of University |
| Reference | SRS_NEXUS_V3.0_May_2025 |

**Team Members and Roles**
| Role | Name | ID |
| :--- | :--- | :--- |
| Product Owner | Pari Chaudhari | 24BCP111 |
| Scrum Master | Arya Shah | 24BCP100 |
| Developer | Harsh Patel | 24BCP102 |
| Developer | Het Gabani | 24BCP131 |

**Disclaimer:**
This document serves as the comprehensive "Source of Truth" for the architecture, functionality, and constraints of the NEXUS platform. It encapsulates all technical decisions needed for robust delivery, scalability, and long-term maintenance.

---

## Table of Contents
1. **Introduction**
   1.1. Purpose
   1.2. Document Conventions
   1.3. Intended Audience
   1.4. Project Scope
   1.5. References
2. **Overall Description**
   2.1. Product Perspective
   2.2. Product Functions
   2.3. User Classes, Characteristics, and Needs
   2.4. Operating Environment
   2.5. Design and Implementation Constraints
   2.6. User Documentation
   2.7. Assumptions and Dependencies
3. **System Features and Functional Requirements**
   3.1. User Management and Authentication
   3.2. Role-Based Dashboards & Interfaces
   3.3. Mentee Management & Progress Tracking
   3.4. Real-Time Communication Hub
   3.5. Automated Session Scheduling
   3.6. Task & Assignment Distribution
   3.7. Textual Use Case Descriptions
4. **External Interface Requirements**

   4.1. User Interfaces
   4.2. Hardware Interfaces
   4.3. Software Interfaces
   4.4. Communications Interfaces
5. **Non-Functional Requirements**
   5.1. Performance Requirements
   5.2. Security Requirements
   5.3. Reliability and Availability
   5.4. Usability and Accessibility
   5.5. Maintainability and Portability
   5.6. Legal and Compliance Requirements
   5.7. Operational Requirements
   5.8. Analytics and Logging
   5.9. Error Handling Requirements
6. **Other Requirements**

   6.1. Data Migration
   6.2. Internationalization Requirements
   6.3. Training Requirements
   6.4. Future Scope
   6.5. Risk Analysis
7. **Appendices**

   7.1. Appendix A: Analysis Models (Architectural Diagrams)
       A.5. Logical Component Diagram
       A.6. Activity Diagram (Session Booking)
       A.7. State Diagram (Assignment Lifecycle)
   7.2. Appendix B: Database Schema & Relational Mapping
   7.3. Appendix C: Glossary
   7.4. Appendix D: SDLC Documentation (Waterfall Phases)

---

## 1. Introduction

### 1.1. Purpose
The purpose of NEXUS is to facilitate smooth interaction between mentors and mentees through an organized platform. The system helps in managing mentor–mentee relationships, scheduling mentoring sessions, enabling communication, and tracking progress. It also assists administrators in monitoring mentoring activities and maintaining proper records.

This Software Requirements Specification (SRS) document provides a comprehensive and exhaustive description of the platform, ensuring all stakeholders—including software architects, developers, and project administrators—have a precise understanding of system operations, architecture, and expected deliverables.

### 1.2. Document Conventions
This document follows these conventions to specify the priority of requirements:

| Term | Description |
| :--- | :--- |
| **SHALL** | Refers to a mandatory requirement that must be fulfilled during the core implementation phase. The system will fail acceptance criteria if this is missing. |
| **SHOULD** | Indicates a highly desirable requirement that enhances the system but does not necessarily block initial deployment. |
| **MAY** | Refers to an optional requirement anticipated for future phases or nice-to-have features. |
| **TBD** | To Be Determined; indicates information that is pending further architectural review. |

**Requirement Categorization:**
- **FR-XX**: Functional Requirements
- **NFR-XX**: Non-Functional Requirements
- **IR-XX**: Interface Requirements

### 1.3. Intended Audience
This document is intended for the following stakeholders:

| Stakeholder | Role |
| :--- | :--- |
| **Project Owners / Sponsors** | Review and approve core functionalities and business logic. |
| **Software Architects** | Ensure system design aligns with specified technical constraints (Next.js, Supabase). |
| **Development Team** | Utilize functional and interface requirements for coding and implementation. |
| **QA Engineers** | Formulate test cases and validation scripts based on SHALL requirements. |
| **System Administrators** | Understand maintenance, deployment (Vercel), and operational logs. |

### 1.4. Project Scope
NEXUS aims to enhance professional and academic growth by providing structured mentorship environments. The platform utilizes a high-performance stack: **Next.js (App Router)** for the frontend, **Tailwind CSS v4** for high-fidelity UI design, and **Supabase (PostgreSQL/BaaS)** for a serverless, real-time backend architecture.

**In Scope:**
- **Identity & Access Management (IAM)**: Implementing robust email verification, role-based access control (RBAC), and session lifecycle management.
- Real-Time Synergy Module: Bidirectional WebSocket-driven communication.
- Automated Scheduler: Session lifecycle management and conflict-free booking.
- Progressive Task Tracker: Automated progress tracking via data-driven metrics.
- Asset Repository: A centralized, categorized educational materials library for secure, scalable delivery of scholarly resources.
- Data Integrity & Security: Row-Level Security (RLS) enforcement on all databases.

**Out of Scope (Phase 1):**
- Development of native iOS/Android applications (responsive web design handled first).
- Integration with external legacy university ERP systems (planned for future API expansions).
- Hardware procurement for hosting (the solution is fully cloud-native/serverless).

### 1.5. References
- Next.js Documentation (https://nextjs.org/docs)
- Supabase Documentation (https://supabase.com/docs)
- Tailwind CSS v4 Schema Documentation
- NEXUS Internal UI/UX Design Prototypes

### 1.6. Definitions, Acronyms, and Abbreviations
- **AES-256**: Advanced Encryption Standard (256-bit key) utilized for data security at rest.
- **BaaS**: Backend as a Service; cloud-integrated backend logic and storage framework (Supabase).
- **CSRF**: Cross-Site Request Forgery; an attack mitigated natively by Next.js edge routers.
- **DFD**: Data Flow Diagram; visual representation of data movement across system boundaries.
- **ERD**: Entity Relationship Diagram; logic model of the underlying PostgreSQL database schema.
- **HOC**: Higher-Order Component; a React architectural pattern used for ProtectedRoutes.
- **IAM**: Identity and Access Management; the framework for governing user authentication and permissions.
- **ISR**: Incremental Static Regeneration; a Next.js feature for high-performance content delivery.
- **JWT**: JSON Web Token; the stateless cryptographic passkey verifying user access rights.
- **OTP**: One-Time Password; a temporary secure code for account verification.
- **RBAC**: Role-Based Access Control; enforcing strict Mentor or Mentee UI access limitations.
- **RLS**: Row-Level Security; strict PostgreSQL database-level privacy walls.
- **TLS 1.3**: Transport Layer Security; the latest protocol for secure network communications.
- **TBD**: To Be Determined.

### 1.7. SDLC Methodology: The Waterfall Model
The NEXUS platform development follows a structured **Waterfall Model**, ensuring a linear and sequential flow of development phases. This approach was selected to provide high predictability and clear documentation at each stage, which is critical for an educational platform where data integrity and role-based permissions are paramount.

**Phases Implemented:**
1. **Requirements Analysis**: This SRS document represents the culmination of this phase, where all functional (FR) and non-functional (NFR) requirements were finalized before architectural design.
2. **System Design**: The architectural blueprints in Appendix A and the ERD in Appendix B define the logical structure of the platform.
3. **Implementation**: Coding of the Next.js frontend and Supabase backend logic.
4. **Integration & Testing**: Rigorous validation of the "Synergy" and "Scheduler" modules to ensure conflict-free operation.
5. **Deployment**: Staged deployment to Vercel's global edge network.
6. **Maintenance**: Post-deployment monitoring and iterative updates via PITR backups.

---

## 2. Overall Description

### 2.1. Product Perspective
NEXUS operates as a standalone web-based system designed as a modular, cloud-native application. The architecture is decoupled: the frontend is deployed globally via Vercel's Edge Network, while the backend scales independently within the managed Supabase AWS infrastructure. It directly interfaces with Cloud Storage (for assignment assets) and Mail Services (for authentication links and notifications).

### 2.2. Product Functions
The core functions of NEXUS include:
1. **Unified Authentication Engine**: Supporting email/password and Magic Links.
2. **Dynamic Hierarchy Engine**: Middleware routing that adapts UI/UX instantly based on Mentor/Mentee roles.
3. **Synergistic Mentee Management**: Cohort tracking and progress monitoring for faculty.
4. **Automated Scheduler**: Coordinating synchronous interactions with conflict resolution.
5. **Real-Time Communication**: Instant messaging capabilities between paired users.

### 2.3. User Classes, Characteristics, and Needs
1. **Mentees (Knowledge Seekers)**
   - **Characteristics**: Students or early-career professionals; high technical proficiency expectations.
   - **Needs**: Immediate access to guidance, simplified task management, responsive mobile experience.
2. **Mentors (Knowledge Providers)**
   - **Characteristics**: Academic faculty or industry experts; varied technical proficiency.
   - **Needs**: Efficient tools to manage large cohorts, automated scheduling to protect time, clean and organized dashboard layouts.
3. **Administrators (Infrastructure Overseers)**
   - **Characteristics**: IT staff.
   - **Needs**: Global oversight of user activity, system health monitoring, resolving account access issues.

### 2.4. Operating Environment
1. **Technical Environment**: Web-based application accessible via secure modern browsers. Hosted via Vercel (Frontend) and Supabase (Backend API/DB).
2. **Hardware Environment**: Cloud-native backend (serverless). 
   - **Client Requirements**: Minimum 4GB RAM and a Dual Core Processor for smoother CSS animations and WebSocket connections.
3. **Software Environment**: 
   - Frontend: React / Next.js 16+
   - Database: PostgreSQL (accessed via PostgREST)
   - Realtime: Supabase WebSocket Channels
4. **Network Environment**: Standard broadband connection; optimized for low-bandwidth environments via asset compression and lazy loading.
5. **User Environment**: Agnostic standard devices (Desktop, Mobile, Tablet) supporting responsive UI structures.

### 2.5. Design and Implementation Constraints
1. **Technical Constraints**: 
   - Must strictly utilize Next.js App Router paradigms for SSR (Server-Side Rendering).
   - Must route all database transactions through Supabase APIs to ensure RLS (Row Level Security) triggers apply.
2. **Regulatory Constraints**: 
   - Educational data privacy compliance (no user can scrape data from unassigned mentor-mentee pairs).
3. **Performance Constraints**: 
   - Initial Time to Interactive (TTI) must be less than 1.5 seconds on standard connections.

### 2.6. User Documentation
The system SHALL provide contextual tooltips during onboarding, an integrated Help Center regarding scheduling rules, and standard Administrator Guides for managing user bans/recoveries within the Supabase dashboard.

### 2.7. Assumptions and Dependencies
- **Assumptions**: Users have reliable internet access; Vercel edge networks remain stable globally.
- **Dependencies**: The system is highly dependent on the uptime of the Supabase platform for Auth, Database queries, and WebSocket streaming. It is also assumed that a **PostgreSQL Database Trigger** is configured to automatically synchronize new `auth.users` records into the `public.profiles` table to maintain relational integrity.

---

## 3. System Features and Functional Requirements

### 3.1. User Management and Authentication

**ID** | **Requirement**
--- | ---
**FR-01** | The system SHALL provide a multi-mode sign-in supporting secure email magic links or standard passwords. The system SHOULD support multi-factor authentication (OTP) in future versions.
**FR-02** | The system SHALL mandate role selection (Mentor or Mentee) during the initial registration process.
**FR-03** | The system SHALL implement a secure "Magic Link" password recovery mechanism sent via the verified email.
**FR-04** | The system SHALL explicitly restrict routing access based on the authenticated user's role (RBAC). 
**FR-05** | The system SHALL utilize JSON Web Tokens (JWT) with sliding expiration windows for persistent session management.
**FR-06** | The system SHALL maintain an audit log sequence within the authentication provider (GoTrue) tracking IP address and device string during login.

### 3.2. Role-Based Dashboards & Interfaces

**ID** | **Requirement**
--- | ---
**FR-07** | The system SHALL automatically route users from `/login` to either the `/mentor/dashboard` or `/mentee/dashboard` based solely on their database role metadata.
**FR-08** | The system SHALL display aggregated metrics on the Mentor dashboard, including: active mentee count, total sessions held, and average task completion rate of current cohorts.
**FR-09** | The system SHALL display actionable insights on the Mentee dashboard, including: next scheduled session, pending tasks, and global progress bars.
**FR-10** | The system SHALL hydrate dynamic dashboard statistics in real-time without requiring full page refreshes (via local cache invalidation algorithms like SWR/React Query).

### 3.3. Mentee Management & Cohort Analytics

**ID** | **Requirement**
--- | ---
**FR-11** | The system SHALL present Mentors with a high-performance, filterable directory mapping their active cohorts, pulling directly from the `mentees` and `profiles` relations.
**FR-12** | The system SHALL evaluate and render a live progress heuristic for each mentee based on the ratio of `completed` to `assigned` tasks within the `tasks` entity.
**FR-13** | The system SHALL allow Mentors to view granular analytics of an individual mentee's trajectory, including their stated `career_goals` and `learning_objectives`.
**FR-14** | The system SHALL permit Mentors to manage their capacity by toggling their `is_accepting_mentees` boolean and monitoring their `current_mentees` against their defined `max_mentees` limit.

### 3.4. Synergistic Communication Engine

**ID** | **Requirement**
--- | ---
**FR-15** | The system SHALL provide a dedicated, secure messaging channel utilizing Supabase Realtime to establish 1-on-1 WebSocket connections between `sender_id` and `receiver_id`.
**FR-16** | The system SHALL support multiple message transmission payloads (`message_type`: text, file, link) complete with optional `attachment_url` tracking.
**FR-17** | The system SHALL maintain read receipts via the `is_read` boolean and associated `read_at` timestamp for synchronous awareness.
**FR-18** | The system SHALL persist all encrypted chat history permanently within the `messages` relational table, utilizing `thread_id` for organized historical auditing.

### 3.5. Intelligent Session Orchestrator

**ID** | **Requirement**
--- | ---
**FR-19** | The system SHALL allow Mentors to configure their `availability_schedule` utilizing a dynamic JSONB configuration block.
**FR-20** | The system SHALL allow Mentees to discover and securely book a `Session`, selecting from `one-on-one`, `group`, or `workshop` formats.
**FR-21** | The system SHALL proactively perform backend conflict resolution against the `scheduled_at` index, preventing oversubscription of a mentor's `duration_minutes` blocks.
**FR-22** | The system SHALL track the complete lifecycle of a Session through strictly typed statuses: `scheduled`, `completed`, `cancelled`, and `no-show`.
**FR-23** | The system SHALL collect post-session feedback, capturing the `mentor_rating` and `mentee_rating` (1-5 scale) alongside private `mentor_notes` and `mentee_notes`.
**FR-24** | The system SHALL generate secure meeting metadata (unique URL or location details) for each scheduled session.

### 3.6. Mission & Assignment Lifecycle

**ID** | **Requirement**
--- | ---
**FR-25** | The system SHALL empower Mentors to deploy academic or professional `Assignments`, detailing `instructions`, `due_date`, and `assigned_at` timestamps.
**FR-26** | The system SHALL permit Mentees to fulfill assignments via a `submission_text` payload or a `submission_url` link.
**FR-27** | The system SHALL rigidly enforce an Assignment's state machine transitions: `pending` → `in-progress` → `submitted` → `reviewed` → `overdue`.
**FR-28** | The system SHALL allow Mentors to evaluate submissions, providing qualitative `feedback`, a categorical `grade`, and a precise quantitative `score` (0-100).
**FR-29** | The system SHALL additionally provide personal `Tasks` for self-management, categorized by `priority` (low, medium, high, urgent) and trackable via nested `tags`.

### 3.7. Textual Use Case Descriptions

This section provides granular step-by-step descriptions for the primary system interaction models, translating the diagrams in Appendix A into actionable logic.

#### UC-01: Book Mentoring Session
- **Actor**: Mentee
- **Pre-Conditions**: Mentee is authenticated; Mentor has set availability slots.
- **Normal Flow**:
  1. Mentee navigates to the 'Sessions' interface.
  2. System fetches and displays the Mentor's configured availability blocks from the `mentors` table.
  3. Mentee selects a specific date and time slot.
  4. System performs a conflict check against existing records in the `sessions` table.
  5. System creates a new session record with status `scheduled`.
  6. A real-time notification is dispatched to the Mentor.
- **Post-Conditions**: Session is locked; both users see the updated calendar.

#### UC-02: Deploy Assignment
- **Actor**: Mentor
- **Pre-Conditions**: Mentor is authenticated and has active mentees assigned.
- **Normal Flow**:
  1. Mentor accesses the 'Assignments' dashboard.
  2. Mentor enters assignment title, instructions, and due date.
  3. System validates input data and inserts a record into the `assignments` table.
  4. System broadcasts a notification to the targeted Mentee(s) via Supabase Realtime.
- **Post-Conditions**: Assignment is visible on the Mentee's dashboard with status `pending`.

#### UC-03: Submit Assignment
- **Actor**: Mentee
- **Pre-Conditions**: Assignment exists in `pending` or `in-progress` state.
- **Normal Flow**:
  1. Mentee selects the assignment and provides a submission URL or text body.
  2. System updates the record status to `submitted` and logs the `submitted_at` timestamp.
  3. System alerts the Mentor of the new submission.
- **Post-Conditions**: Assignment remains locked for the Mentee until the Mentor reviews it.

#### UC-04: Chat Communication
- **Actor**: Mentor/Mentee
- **Pre-Conditions**: Mutual association established in the database.
- **Normal Flow**:
  1. User enters the 'Messages' hub and selects a contact.
  2. User types a message and clicks 'Send'.
  3. System inserts the message into the `messages` table.
  4. The WebSocket bridge pushes the data instantly to the recipient's UI.
  5. Recipient UI marks the message as `read` upon focus, updating the database.
- **Post-Conditions**: Communication history is persisted and synchronized.

---

## 4. External Interface Requirements

### 4.1. User Interfaces
- **Visual Design**: Interfaces SHALL adhere to modern design principles, prioritizing high contrast, subtle micro-animations, and intuitive layouts using Tailwind CSS.
- **Responsiveness**: The UI SHALL dynamically adapt to optimal viewing modes on mobile, tablet, and desktop architectures using CSS Grid and Flexbox techniques.
- **Theming**: The system SHOULD support automatic detection of user OS preferences for seamless switching between Light and Dark visual modes.

### 4.2. Hardware Interfaces
No specific physical integration elements are required. The system expects standard user HMI devices (touchscreens, mice, keyboards).

### 4.3. Software Interfaces
- **Input**: User credentials (email, password)
- **Processing**: Supabase Auth validation, role metadata extraction via JWT claims or profile lookup.
- **Database Engine**: PostgreSQL, accessed securely via PostgREST to automatically map RESTful calls to relational tables.
- **Web Framework**: React Server Components processed via Vercel’s Node/Edge runtime environments.

### 4.4. Communications Interfaces
- **Protocol**: All data transmission SHALL operate over HTTPS/TLS 1.3 strictly.
- **Real-Time Data**: Instant communications SHALL rely on secure `wss://` (WebSocket Secure) connections established via Supabase Realtime clusters.

---

## 5. Non-Functional Requirements

### 5.1. Performance Requirements
- **NFR-01 (Response Time)**: 95% of standard API read requests SHALL return processing payloads in under 300ms from the edge network.
- **NFR-02 (Asset Optimization)**: Imagery and structural graphic assets SHALL leverage standard optimized loading to reduce bandwidth loads.
- **NFR-03 (Scalability)**: The backend connection pooler (PgBouncer integration) SHALL automatically handle concurrency spikes scaling dynamically up to 10,000 active concurrent connections.

### 5.2. Security Requirements
- **NFR-04 (Access Isolation)**: The system SHALL strictly enforce Row-Level Security (RLS) on PostgreSQL. Users must only be capable of reading, writing, or deleting records explicitly associated with their authenticated UUID.
- **NFR-05 (Encryption)**: Data at rest (PostgreSQL) is encrypted natively by Supabase infrastructure.
- **NFR-06 (Protection Mechanisms)**: Web interfaces SHALL protect against cross-site request forgery (CSRF) and cross-site scripting (XSS) natively via React DOM sanitization.

### 5.3. Safety Requirements
- **NFR-07 (Data Privacy)**: No student data is shared publicly; all interactions are private by default.
- **NFR-08 (Verification)**: Mandatory email verification is enforced to prevent bot accounts.

### 5.4. Reliability and Availability
- **NFR-09 (Availability)**: The system SHALL target a 99.9% uptime SLA utilizing Vercel's distributed global CDNs.
- **NFR-10 (Reliability)**: Fault-tolerant frontend with robust React Error Boundaries and fallback state management to prevent individual component crashes.

### 5.5. Usability and Accessibility
- **NFR-11 (Understandability)**: The user interface SHALL possess clean logical flows that require minimal to zero formal training for a standard college-level mentee.
- **NFR-12 (Accessibility)**: The system SHOULD target W3C WCAG 2.1 Level AA compliance, specifically regarding color contrast and semantic HTML tag usage.

### 5.6. Maintainability and Portability
- **NFR-13 (Maintainability)**: Modular architecture with shared components and clean code principles. Code SHALL be meticulously composed using TypeScript interfaces mimicking database entity definitions.
- **NFR-14 (Portability)**: As a web ecosystem, the platform SHALL function neutrally regardless of the client-side Operating System (macOS, Windows, iOS, Android).

### 5.7. Legal and Compliance Requirements
- **NFR-15 (Data Privacy)**: The system SHALL provide users with secure profile deletion capacities, sanitizing personal data logs in compliance with modern privacy standards.

### 5.8. Operational Requirements
- **NFR-16 (Analytics/Logging)**: The system SHALL continuously log critical mutations (Task Creation, Role assignments) internally for administrative verification of logical pathways or user disputes.
- **NFR-17 (Backup)**: The backend infrastructure (Supabase AWS instance) SHALL perform automated daily snapshots of the database with Point-in-Time Recovery (PITR) enabled.

### 5.9. Error Handling Requirements

**ID** | **Requirement**
--- | ---
**EHR-01** | The system SHALL display a clear, user-friendly error message if login credentials fail or a Magic Link has expired.
**EHR-02** | The system SHALL prevent and notify users if they attempt to book a session slot that has been simultaneously reserved by another user (Race Condition Handling).
**EHR-03** | The system SHALL display a global 'Offline' indicator or retry notification if the persistent WebSocket connection to Supabase Realtime is lost.
**EHR-04** | The system SHALL validate file upload sizes and types at the edge, rejecting any files exceeding 10MB or containing unsupported extensions before they hit storage.
**EHR-05** | The system SHALL prevent Mentor-Mentee association if the Mentor's `current_mentees` count has already reached the `max_mentees` threshold.

---

## 6. Other Requirements

### 6.1. Data Migration
Deployment initialization involves automated SQL seeding scripts. Transitioning from any legacy tracking applications (e.g., Excel sheets previously utilized by Mentors) will require manual or targeted future API bulk-uploading functionalities.

### 6.2. Internationalization Requirements
While initially conceptualized in English, the frontend architecture (`/app` App Router) SHOULD be constructed to rapidly support routing structures for internationalization (`/en`, `/es`, `/ar`) dictionaries if targeted to broader geographic regions.

### 6.3. Training Requirements
Due to adherence to NFR-09 (Usability), the onboarding threshold limits intensive training. High-end functions (e.g., bulk assignment creations) may be supported by brief integrated tooltip tours.

### 6.4. Future Scope
While the current SRS details the requirements for Phase 1 of the NEXUS platform, future phases MAY include:
- Native iOS and Android application development using React Native or Flutter.
- Integration with external legacy university ERP systems via secure backend APIs.
- AI-driven mentee-mentor matching algorithms utilizing natural language processing on user `career_goals`.
- Implementation of algorithmic Multi-Factor Authentication (OTP via SMS or Authenticator integrations).

### 6.5. Risk Analysis

This section analyzes potential threats to the NEXUS platform and outlines the technical mitigation strategies integrated into the architecture.

| Risk Event | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Server Downtime** | Low | High | Utilization of Vercel's multi-region edge network for the frontend and Supabase's high-availability clusters for the backend. |
| **Data Corruption** | Very Low | Critical | Automated daily snapshots and Point-in-Time Recovery (PITR) provided by Supabase's managed PostgreSQL. |
| **Database Connection Failure** | Medium | Medium | Implementation of client-side error boundaries and exponential backoff retry logic in the `supabase-js` client. |
| **Data Privacy Breach** | Low | Critical | Strict enforcement of Row-Level Security (RLS) at the database level, ensuring users can only access their authorized UUID records. |
| **Unauthorized Access** | Low | High | Mandatory email verification, secure JWT sliding sessions, and CSRF protection native to Next.js. |

---

## Appendix A: Architectural Blueprints & Models

### A.1 Use Case Diagrams

**Mentor Use Case Diagram**
```mermaid
flowchart LR
    classDef actor fill:#f9f,stroke:#333,stroke-width:2px;
    classDef system fill:#fff,stroke:#333,stroke-width:2px;
    classDef usecase fill:#e1f5fe,stroke:#01579b,stroke-width:1px;

    Mentor([Mentor]):::actor
    subgraph NEXUS Platform [NEXUS Platform]
        direction TB
        UC1(Login / Configure Profile):::usecase
        UC2(Manage Session Availability):::usecase
        UC3(Message Mentees):::usecase
        UC4(Assign Tasks & Homework):::usecase
        UC5(Review Mentee Progress):::usecase
        UC6(Host Sessions):::usecase
        UC7(Manage Requests):::usecase
    end
    Mentor --> UC1
    Mentor --> UC2
    Mentor --> UC3
    Mentor --> UC4
    Mentor --> UC5
    Mentor --> UC6
    Mentor --> UC7
```

**Mentee Use Case Diagram**
```mermaid
flowchart LR
    classDef actor fill:#f9f,stroke:#333,stroke-width:2px;
    classDef system fill:#fff,stroke:#333,stroke-width:2px;
    classDef usecase fill:#e1f5fe,stroke:#01579b,stroke-width:1px;

    Mentee([Mentee]):::actor
    subgraph NEXUS Platform [NEXUS Platform]
        direction TB
        UC1(Login / Setup Profile):::usecase
        UC2(Discover Mentors):::usecase
        UC3(Book Session Slot):::usecase
        UC4(Submit Tasks/Assignments):::usecase
        UC5(Message Mentor):::usecase
        UC6(Track Goals):::usecase
    end
    Mentee --> UC1
    Mentee --> UC2
    Mentee --> UC3
    Mentee --> UC4
    Mentee --> UC5
    Mentee --> UC6
```

**Admin Use Case Diagram**
```mermaid
flowchart LR
    classDef actor fill:#f9f,stroke:#333,stroke-width:2px;
    classDef system fill:#fff,stroke:#333,stroke-width:2px;
    classDef usecase fill:#e1f5fe,stroke:#01579b,stroke-width:1px;

    Admin([Administrator]):::actor
    System([NEXUS System Backend]):::system
    subgraph Core Platform [Core Platform]
        direction TB
        UC1(System Configuration & Overrides):::usecase
        UC2(Audit & Log Monitoring):::usecase
        UC3(Automated Email/OTP Dispatch):::usecase
    end
    Admin --> UC1
    Admin --> UC2
    System --> UC3
```

### A.2 Session Booking Sequence
```mermaid
sequenceDiagram
    autonumber
    participant Mentee
    participant App as App Router (Next.js)
    participant Auth as Auth Middleware
    participant PG as PostgREST (Supabase)
    participant DB as [sessions] Table

    Mentee->>App: Request Session Slot
    App->>Auth: Validate JWT Session
    Auth-->>App: Identity Verified (UUID)
    App->>PG: POST /rest/v1/sessions
    Note over PG,DB: RLS Check (Insert Policy)
    PG->>DB: Record Insertion
    DB-->>PG: 201 Created
    PG-->>App: JSON {id, status, ...}
    App-->>Mentee: Sync UI via SWR Cache
```

### A.3 Data Flow Diagrams (DFD)

**DFD Level 0: Context Diagram**
```mermaid
flowchart TD
    Mentee([Mentee]) -- Interacts with --> Core[NEXUS System]
    Mentor([Mentor]) -- Interacts with --> Core
    Admin([Administrator]) -- Manages --> Core
    Core -- Authenticates & Stores --> DB[(Supabase BaaS / DB)]
```

**DFD Level 1: Functional Decomposition**
```mermaid
flowchart TD
    classDef logic fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px;

    Core[NEXUS System]:::logic --> IAM[Authentication & IAM]:::process
    Core --> Dash[Role-Based Dashboards]:::process
    Core --> Cohort[Synergistic Mentee Management]:::process
    Core --> Comm[Real-Time Communication Hub]:::process
    Core --> Sched[Automated Session Scheduler]:::process
```

**DFD Level 2: Session Booking Process**
```mermaid
flowchart LR
    Mentee([Mentee]) -- Requests Slot --> API[Scheduler Engine]
    API -- Checks Conflicts --> DB[(Database)]
    DB -- Returns Avail --> API
    API -- Confirms Slot --> Mentor([Mentor])
```

### A.4 Deployment Architecture

**System Architecture (Deployment View)**
```mermaid
flowchart TD
    classDef node fill:#eceff1,stroke:#455a64,stroke-width:2px;
    classDef cloud fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;

    Users([End Users: Mentors/Mentees])
    subgraph Vercel [Vercel Global Edge Network]
        NextApp[Next.js App Router Node Server]:::node
        NextStatic[Static Assets & Edge Cache]:::node
    end
    subgraph Supabase [Supabase Managed Infrastructure]
        PostgREST[PostgREST API Layer]:::cloud
        Auth[GoTrue Auth Service]:::cloud
        Realtime[WebSocket Realtime wss://]:::cloud
        DB[(PostgreSQL Database)]:::cloud
    end
    Users -- HTTPS --> Vercel
    Vercel -- HTTPS --> PostgREST
    Vercel -- HTTPS --> Auth
    Users -- wss:// --> Realtime
    PostgREST <--> DB
    Auth <--> DB
    Realtime <--> DB
```

### A.5 Logical Component Diagram

This diagram illustrates the modular decomposition of the NEXUS platform, highlighting the interaction between frontend UI components, service logic modules, and the data persistence layer.

```mermaid
flowchart TD
    classDef comp fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px;
    classDef store fill:#fff3e0,stroke:#e65100,stroke-width:1px;

    subgraph FrontendComponents [Frontend Components]
        AuthUI["Auth & IAM UI"]:::comp
        DashboardUI["Role-Based Dashboards"]:::comp
        ChatUI["Synergy Chat UI"]:::comp
        SchedUI["Scheduler UI"]:::comp
    end
    subgraph ServiceModules [Service Logic Modules]
        AuthService["Auth Middleware"]:::comp
        SchedEngine["Session Orchestrator"]:::comp
        CommEngine["Real-Time Bridge"]:::comp
        TaskEngine["Assignment Lifecycle Manager"]:::comp
    end
    subgraph DataPersistence [Data Persistence Layer]
        UserStore[("User Profiles Store")]:::store
        SessionStore[("Sessions & Slots")]:::store
        MessageStore[("Message History")]:::store
        FileStore["Asset Repository"]:::store
    end
    AuthUI --> AuthService
    DashboardUI --> SchedEngine
    ChatUI --> CommEngine
    SchedUI --> SchedEngine
    AuthService --> UserStore
    SchedEngine --> SessionStore
    CommEngine --> MessageStore
    TaskEngine --> SessionStore
```

---

### A.6 Activity Diagram (Session Booking Flow)

This diagram describes the dynamic behavior of the system during a session booking activity, including user decisions and system validations.

```mermaid
flowchart TD
    Start([Mentee starts Booking]) --> ViewMentors[View Mentor Availabilities]
    ViewMentors --> SelectSlot[Select Desired Slot]
    SelectSlot --> ValidateSlot{Slot Available?}
    
    ValidateSlot -- No --> NotifyConflict[Notify Conflict]
    NotifyConflict --> ViewMentors
    
    ValidateSlot -- Yes --> CreateSession[Create Session Record]
    CreateSession --> UpdateStatus[Set Status to 'scheduled']
    UpdateStatus --> NotifyMentor[Notify Mentor via Real-time]
    NotifyMentor --> End([Booking Complete])
```

---

### A.7 State Diagram (Assignment Lifecycle)

This diagram tracks the various states of an assignment from creation to final review.

```mermaid
stateDiagram-v2
    [*] --> Pending : Mentor Deploys
    Pending --> InProgress : Mentee Opens
    InProgress --> Submitted : Mentee Submits payload
    Submitted --> Reviewed : Mentor Grades & Feedback
    Reviewed --> [*]
    
    Pending --> Overdue : Deadline Passed
    InProgress --> Overdue : Deadline Passed
    Overdue --> Submitted : Late Submission
```

---

## Appendix B: Flawless Database ERD

This Entity Relationship Diagram (ERD) defines the logical schema of the NEXUS platform, strictly enforced via Supabase PostgreSQL.

```mermaid
erDiagram
    classDef table fill:#f9f,stroke:#333,stroke-width:2px;

    PROFILES {
        uuid id PK
        string email
        string full_name
        string role "mentor | mentee | admin"
        string student_id
        string employee_id
        boolean is_active
    }
    MENTORS {
        uuid id PK
        integer max_mentees
        integer current_mentees
        jsonb availability_schedule
        decimal average_rating
    }
    MENTEES {
        uuid id PK
        uuid assigned_mentor_id "FK to MENTORS"
        string program
        integer year_of_study
    }
    SESSIONS {
        uuid id PK
        uuid mentor_id "FK to MENTORS"
        uuid mentee_id "FK to MENTEES"
        string title
        datetime scheduled_at
        integer duration_minutes
        string status "scheduled | completed | cancelled"
    }
    ASSIGNMENTS {
        uuid id PK
        uuid mentor_id "FK to MENTORS"
        uuid mentee_id "FK to MENTEES"
        string title
        string status "pending | submitted | reviewed"
        datetime due_date
    }
    TASKS {
        uuid id PK
        uuid user_id "FK to PROFILES"
        string title
        string priority "low | high | urgent"
        string status "todo | done"
    }
    MENTOR_REQUESTS {
        uuid id PK
        uuid mentor_id "FK to PROFILES"
        uuid mentee_id "FK to PROFILES"
        string status "pending | accepted | rejected"
    }
    MESSAGES {
        uuid id PK
        uuid sender_id "FK to PROFILES"
        uuid receiver_id "FK to PROFILES"
        string content
        boolean is_read
    }

    PROFILES ||--o| MENTORS : "specializes"
    PROFILES ||--o| MENTEES : "specializes"
    MENTORS ||--o{ MENTEES : "oversees"
    MENTORS ||--o{ SESSIONS : "conducts"
    MENTEES ||--o{ SESSIONS : "attends"
    MENTORS ||--o{ ASSIGNMENTS : "assigns"
    MENTEES ||--o{ ASSIGNMENTS : "completes"
    PROFILES ||--o{ TASKS : "manages"
    PROFILES ||--o{ MENTOR_REQUESTS : "initiates/receives"
    PROFILES ||--o{ MESSAGES : "communicates"
```

---

## Appendix C: High-Level Class Architecture

Constructed directly from the codebase architecture, this diagram defines the Object-Oriented Programming (OOP) framework mirroring the database relationships.

```mermaid
classDiagram
    class Profile {
        +UUID id
        +string email
        +string role
    }
    class Mentor {
        +int max_mentees
        +int current_mentees
        +jsonb availability
    }
    class Mentee {
        +string program
        +int year_of_study
    }
    class Session {
        +datetime scheduled_at
        +string status
    }
    class Assignment {
        +string title
        +string status
    }
    class Task {
        +string priority
        +string status
    }
    class MentorRequest {
        +string status
        +datetime created_at
    }

    Profile <|-- Mentor
    Profile <|-- Mentee
    Mentor "1" -- "*" Mentee : Cohort
    Mentor "1" -- "*" Session : Orchestrates
    Mentee "1" -- "*" Session : Joins
    Mentor "1" -- "*" Assignment : Deploys
    Mentee "1" -- "*" Assignment : Submits
    Profile "1" -- "*" Task : Manages
    Profile "1" -- "*" MentorRequest : Handles
```

---

## Appendix C: Glossary

| Term | Definition |
| :--- | :--- |
| **BaaS** | Backend as a Service. The software model where backend logic is managed by a third party (Supabase). |
| **GoTrue** | The open-source Supabase authentication server utilized for managing JWTs and Magic Links. |
| **HOC** | Higher-Order Component. A React pattern used in `ProtectedRoute.tsx` to wrap pages with security logic. |
| **ISR** | Incremental Static Regeneration. A Next.js feature that allows updating static content without a full rebuild. |
| **JWT** | JSON Web Token. A compact, URL-safe means of representing claims to be transferred between two parties. |
| **PostgREST** | A standalone web server that turns a PostgreSQL database directly into a RESTful API. |
| **RLS** | Row-Level Security. A PostgreSQL security feature that restricts which rows a user can see based on their identity. |
| **SWR** | Stale-While-Revalidate. A React hook library for data fetching, ensuring fast UI updates with cached data. |
| **Waterfall Model** | A linear and sequential approach to software development where each phase must be completed before the next begins. |

---

## Appendix D: SDLC Documentation (Waterfall Phases)

The development of NEXUS strictly adheres to the Waterfall lifecycle to ensure architectural stability and data security.

### D.1 Requirements Analysis Phase
**Objective**: Define the full scope of the Mentor-Mentee relationship and technical constraints.
- **Inputs**: Stakeholder interviews, academic mentorship guidelines.
- **Outputs**: Finalized SRS v3.0, Persona definitions, Feature prioritized list.

### D.2 System Design Phase
**Objective**: Blueprint the frontend components and backend relational schema.
- **Architecture**: Next.js App Router for server-side optimization.
- **Database**: Supabase PostgreSQL with RLS enabled for all tables.
- **UI/UX**: Tailwind CSS v4 logic for responsive design.

### D.3 Implementation Phase
**Objective**: Full-stack development of the features defined in Section 3.
- **Frontend**: UI development with React Server Components.
- **Backend**: SQL schema execution and PostgREST API configuration.
- **Real-time**: WebSocket integration for Synergy Messaging.

### D.4 Integration & Testing Phase
**Objective**: Verify the seamless interaction of all modules.
- **Unit Testing**: Validating profile creation and role assignment.
- **Integration Testing**: Testing Scheduler conflict resolution.
- **User Acceptance Testing (UAT)**: Faculty review of the Dashboard metrics.

### D.5 Deployment & Maintenance Phase
**Objective**: Global delivery and long-term health monitoring.
- **Hosting**: Vercel Edge Network.
- **Backups**: Daily PITR snapshots via Supabase.
- **Monitoring**: Error tracking and user feedback loops.

---

## Appendix E: Submission & Presentation Checklist

To ensure a flawless submission and presentation of the NEXUS platform, the development team should verify the following:

- [ ] **Credential Integrity**: Verify that `.env.local` contains valid Supabase URL and Anon Key.
- [ ] **RLS Verification**: Confirm that Row-Level Security is enabled on all core tables (Profiles, Mentors, Mentees).
- [ ] **Auth Trigger**: Ensure the `handle_new_user()` trigger exists in Supabase to sync auth signups to the profiles table.
- [ ] **Real-time Sanitization**: Test that messages appear instantly across two different browser sessions.
- [ ] **Deployment State**: Verify that the latest main branch is successfully built on Vercel without trailing slash issues.
- [ ] **Diagram Parity**: Confirm that the diagrams in this SRS match the latest `src/types/database.ts` definitions.

---
*End of NEXUS Mentor-Mentee Platform SRS Document.*
