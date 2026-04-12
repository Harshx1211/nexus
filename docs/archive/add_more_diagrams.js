const fs = require('fs');
const mdPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_v3_Premium.md';
const htmlPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_Sharable_Report_v3_PREMIUM.html';

let mdContent = fs.readFileSync(mdPath, 'utf8');

// 1. Update Table of Contents
mdContent = mdContent.replace(
  /   7\.5\. Appendix E: Logical Component Diagram/,
  '   7.5. Appendix E: Logical Component Diagram\n   7.6. Appendix F: Activity Diagram (Session Booking Flow)\n   7.7. Appendix G: State Diagram (Assignment Lifecycle)'
);

// 2. Prepare Diagram Content
const activityDiagram = `### A.6 Activity Diagram (Session Booking Flow)

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

`;

const stateDiagram = `### A.7 State Diagram (Assignment Lifecycle)

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

// 3. Insert Diagrams before Appendix B
const insertionPoint = '---';
const appendixBHeader = '## Appendix B: Flawless Database ERD';

if (mdContent.includes(appendixBHeader)) {
    const parts = mdContent.split(appendixBHeader);
    // Insert before the divider that precedes Appendix B
    mdContent = parts[0] + activityDiagram + stateDiagram + appendixBHeader + parts[1];
}

fs.writeFileSync(mdPath, mdContent);
console.log('Markdown diagrams added successfully');

// 4. Sync HTML
let htmlContent = fs.readFileSync(htmlPath, 'utf8');
const startTag = '<script id="master-srs-source" type="text/markdown">';
const endTag = '</script>';
const startIndex = htmlContent.indexOf(startTag) + startTag.length;
const endIndex = htmlContent.indexOf(endTag, startIndex);

if (startIndex > startTag.length - 1 && endIndex > -1) {
    const updatedHtml = htmlContent.substring(0, startIndex) + '\n' + mdContent + '\n    ' + htmlContent.substring(endIndex);
    fs.writeFileSync(htmlPath, updatedHtml);
    console.log('HTML synchronization complete');
}
