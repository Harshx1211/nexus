const fs = require('fs');
const mdPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_v3_Premium.md';
const htmlPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_Sharable_Report_v3_PREMIUM.html';

let content = fs.readFileSync(mdPath, 'utf8');

// 1. UPDATE USE CASE DIAGRAMS (A.1)
const mentorUseCase = `flowchart LR
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
    Mentor --> UC7`;

const menteeUseCase = `flowchart LR
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
    Mentee --> UC6`;

// 2. UPDATE SESSION BOOKING SEQUENCE (A.2)
const sessionSequence = `sequenceDiagram
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
    App-->>Mentee: Sync UI via SWR Cache`;

// 3. UPDATE ERD (Appendix B)
const polishedERD = `erDiagram
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
    PROFILES ||--o{ MESSAGES : "communicates"`;

// 4. UPDATE CLASS DIAGRAM (Appendix C)
const polishedClass = `classDiagram
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
    Profile "1" -- "*" MentorRequest : Handles`;

// 5. UPDATE ADMIN USE CASE (A.1)
const adminUseCase = `flowchart LR
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
    System --> UC3`;

// 6. UPDATE DFD LEVEL 1 (A.3)
const dfdLevel1 = `flowchart TD
    classDef logic fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px;

    Core[NEXUS System]:::logic --> IAM[Authentication & IAM]:::process
    Core --> Dash[Role-Based Dashboards]:::process
    Core --> Cohort[Synergistic Mentee Management]:::process
    Core --> Comm[Real-Time Communication Hub]:::process
    Core --> Sched[Automated Session Scheduler]:::process`;

// 7. UPDATE DEPLOYMENT VIEW (A.4)
const deploymentView = `flowchart TD
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
    Realtime <--> DB`;

// 8. UPDATE LOGICAL COMPONENTS (A.5)
const componentView = `flowchart TD
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
    TaskEngine --> SessionStore`;

// REPLACEMENT HELPERS
function replaceBlock(source, title, newContent) {
    const startMarker = title;
    const endMarker = '\`\`\`';
    const startIndex = source.indexOf(startMarker);
    if (startIndex === -1) return source;
    
    const blockStart = source.indexOf('\`\`\`mermaid', startIndex);
    const blockEnd = source.indexOf(endMarker, blockStart + 10);
    
    return source.substring(0, blockStart + 10) + '\n' + newContent + '\n' + source.substring(blockEnd);
}

content = replaceBlock(content, '**Mentor Use Case Diagram**', mentorUseCase);
content = replaceBlock(content, '**Mentee Use Case Diagram**', menteeUseCase);
content = replaceBlock(content, '**Admin Use Case Diagram**', adminUseCase);
content = replaceBlock(content, '### A.2 Session Booking Sequence', sessionSequence);
content = replaceBlock(content, '**DFD Level 1: Functional Decomposition**', dfdLevel1);
content = replaceBlock(content, '**System Architecture (Deployment View)**', deploymentView);
content = replaceBlock(content, '### A.5 Logical Component Diagram', componentView);
content = replaceBlock(content, '## Appendix B: Flawless Database ERD', polishedERD);
content = replaceBlock(content, '## Appendix C: High-Level Class Architecture', polishedClass);

fs.writeFileSync(mdPath, content);
console.log('Markdown Polishing Complete');

// Sync HTML
let htmlContent = fs.readFileSync(htmlPath, 'utf8');
const startTag = '<script id="master-srs-source" type="text/markdown">';
const endTag = '</script>';
const startIndex = htmlContent.indexOf(startTag) + startTag.length;
const endIndex = htmlContent.indexOf(endTag, startIndex);

if (startIndex > startTag.length - 1 && endIndex > -1) {
    const updatedHtml = htmlContent.substring(0, startIndex) + '\n' + content + '\n    ' + htmlContent.substring(endIndex);
    fs.writeFileSync(htmlPath, updatedHtml);
    console.log('HTML Synchronization Complete');
}
