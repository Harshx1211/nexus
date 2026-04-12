const fs = require('fs');
const mdPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_v3_Premium.md';
const htmlPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_Sharable_Report_v3_PREMIUM.html';

let content = fs.readFileSync(mdPath, 'utf8');

// 1. Remove the 'undefined' and anything after '## Appendix B: Flawless Database ERD'
content = content.split('## Appendix B: Flawless Database ERD')[0];

const restoredAppendices = `## Appendix B: Flawless Database ERD

This Entity Relationship Diagram (ERD) defines the logical schema of the NEXUS platform, strictly enforced via Supabase PostgreSQL.

\`\`\`mermaid
erDiagram
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
        string status "scheduled | completed | cancelled | no-show"
    }
    ASSIGNMENTS {
        uuid id PK
        uuid mentor_id "FK to MENTORS"
        uuid mentee_id "FK to MENTEES"
        string title
        string status "pending | in-progress | submitted | reviewed | overdue"
        datetime due_date
        integer score
    }
    MESSAGES {
        uuid id PK
        uuid sender_id "FK to PROFILES"
        uuid receiver_id "FK to PROFILES"
        string content
        boolean is_read
        datetime created_at
    }
    NOTIFICATIONS {
        uuid id PK
        uuid recipient_id "FK to PROFILES"
        string type "request | session | message"
        string title
        boolean is_read
    }

    PROFILES ||--o| MENTORS : "specializes as"
    PROFILES ||--o| MENTEES : "specializes as"
    MENTORS ||--o{ MENTEES : "mentors"
    MENTORS ||--o{ SESSIONS : "hosts"
    MENTEES ||--o{ SESSIONS : "attends"
    MENTORS ||--o{ ASSIGNMENTS : "assigns"
    MENTEES ||--o{ ASSIGNMENTS : "receives"
    PROFILES ||--o{ MESSAGES : "sends/receives"
    PROFILES ||--o{ NOTIFICATIONS : "receives"
\`\`\`

---

## Appendix C: High-Level Class Architecture

Constructed directly from the codebase architecture, this diagram defines the Object-Oriented Programming (OOP) framework mirroring the database relationships.

\`\`\`mermaid
classDiagram
    class Profile {
        +UUID id
        +string email
        +string role
        +boolean is_active
    }
    class Mentor {
        +UUID id
        +int max_mentees
        +int current_mentees
        +jsonb availability_schedule
        +decimal average_rating
    }
    class Mentee {
        +UUID id
        +UUID assigned_mentor_id
        +string program
    }
    class Session {
        +UUID id
        +datetime scheduled_at
        +string status
    }
    class Assignment {
        +UUID id
        +string title
        +string status
        +datetime due_date
    }
    Profile <|-- Mentor : Specializes
    Profile <|-- Mentee : Specializes
    Mentor "1" -- "*" Mentee : Oversees
    Mentor "1" -- "*" Session : Hosts
    Mentee "1" -- "*" Session : Attends
    Mentor "1" -- "*" Assignment : Assigns
    Mentee "1" -- "*" Assignment : Receives
\`\`\`

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
*End of NEXUS Mentor-Mentee Platform SRS Document.*
`;

const finalContent = content + restoredAppendices;

fs.writeFileSync(mdPath, finalContent);
console.log('Markdown restored successfully');

// Sync HTML
let htmlContent = fs.readFileSync(htmlPath, 'utf8');
const startTag = '<script id="master-srs-source" type="text/markdown">';
const endTag = '</script>';
const startIndex = htmlContent.indexOf(startTag) + startTag.length;
const endIndex = htmlContent.indexOf(endTag, startIndex);

if (startIndex > startTag.length - 1 && endIndex > -1) {
    const updatedHtml = htmlContent.substring(0, startIndex) + '\n' + finalContent + '\n    ' + htmlContent.substring(endIndex);
    fs.writeFileSync(htmlPath, updatedHtml);
    console.log('HTML synchronization complete');
}
