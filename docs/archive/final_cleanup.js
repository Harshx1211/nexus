const fs = require('fs');
const mdPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_v3_Premium.md';
const htmlPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_Sharable_Report_v3_PREMIUM.html';

let content = fs.readFileSync(mdPath, 'utf8');

// 1. Define all diagrams for Section A
const diagrams = `### A.5 Logical Component Diagram

This diagram illustrates the modular decomposition of the NEXUS platform, highlighting the interaction between frontend UI components, service logic modules, and the data persistence layer.

\`\`\`mermaid
flowchart TD
    subgraph FrontendComponents ["Frontend Components"]
        AuthUI["Auth & IAM UI"]
        DashboardUI["Role-Based Dashboards"]
        ChatUI["Synergy Chat UI"]
        SchedUI["Scheduler UI"]
    end

    subgraph ServiceModules ["Service Logic Modules"]
        AuthService["Auth Middleware"]
        SchedEngine["Session Orchestrator"]
        CommEngine["Real-Time Bridge"]
        TaskEngine["Assignment Lifecycle Manager"]
    end

    subgraph DataPersistence ["Data Persistence Layer"]
        UserStore[("User Profiles Store")]
        SessionStore[("Sessions & Slots")]
        MessageStore[("Message History")]
        FileStore["Asset Repository"]
    end

    AuthUI --> AuthService
    DashboardUI --> SchedEngine
    ChatUI --> CommEngine
    SchedUI --> SchedEngine
    
    AuthService --> UserStore
    SchedEngine --> SessionStore
    CommEngine --> MessageStore
    TaskEngine --> SessionStore
    CommEngine --> FileStore
\`\`\`

---

### A.6 Activity Diagram (Session Booking Flow)

This diagram describes the dynamic behavior of the system during a session booking activity, including user decisions and system validations.

\`\`\`mermaid
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
\`\`\`

---

### A.7 State Diagram (Assignment Lifecycle)

This diagram tracks the various states of an assignment from creation to final review.

\`\`\`mermaid
stateDiagram-v2
    [*] --> Pending : Mentor Deploys
    Pending --> InProgress : Mentee Opens
    InProgress --> Submitted : Mentee Submits payload
    Submitted --> Reviewed : Mentor Grades & Feedback
    Reviewed --> [*]
    
    Pending --> Overdue : Deadline Passed
    InProgress --> Overdue : Deadline Passed
    Overdue --> Submitted : Late Submission
\`\`\`

---

`;

// 2. Clear old instances and insert everything into Section A
// First, remove Section A.5 if it exists accidentally elsewhere
content = content.split('### A.5 Logical Component Diagram')[0] + content.split('---')[content.split('---').length - 1]; 
// Note: This logic might be too aggressive. Let's use a safer approach.

// NEW CLEANUP STRATEGY:
// We know Appendix A ends with A.4 Deployment Architecture. 
// We want to insert A.5, A.6, A.7 right after A.4 and before Appendix B.

const a4_end_marker = 'Realtime <--> DB\n```';
const appendix_b_header = '## Appendix B: Flawless Database ERD';

const parts = content.split(a4_end_marker);
const target_end_parts = parts[1].split(appendix_b_header);

content = parts[0] + a4_end_marker + '\n\n' + diagrams + appendix_b_header + target_end_parts[1];

// 3. Update Table of Contents
content = content.replace(
    /7\.1\. Appendix A: Analysis Models \(Architectural Diagrams\)/,
    '7.1. Appendix A: Analysis Models (Architectural Diagrams)\n       A.5. Logical Component Diagram\n       A.6. Activity Diagram (Session Booking)\n       A.7. State Diagram (Assignment Lifecycle)'
);

// 4. Remove the Appendix E, F, G references from the top-level TOC if they were added as 7.5, 7.6 etc.
content = content.replace(/\s+7\.5\. Appendix E: Logical Component Diagram/g, '');
content = content.replace(/\s+7\.6\. Appendix F: Activity Diagram \(Session Booking Flow\)/g, '');
content = content.replace(/\s+7\.7\. Appendix G: State Diagram \(Assignment Lifecycle\)/g, '');

fs.writeFileSync(mdPath, content);
console.log('Markdown finalized');

// 5. Sync HTML
let htmlContent = fs.readFileSync(htmlPath, 'utf8');
const startTag = '<script id="master-srs-source" type="text/markdown">';
const endTag = '</script>';
const startIndex = htmlContent.indexOf(startTag) + startTag.length;
const endIndex = htmlContent.indexOf(endTag, startIndex);
if (startIndex > startTag.length - 1 && endIndex > -1) {
    const updatedHtml = htmlContent.substring(0, startIndex) + '\n' + content + '\n    ' + htmlContent.substring(endIndex);
    fs.writeFileSync(htmlPath, updatedHtml);
    console.log('HTML re-synced');
}
