const fs = require('fs');
const path = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_v3_Premium.md';
let content = fs.readFileSync(path, 'utf8');

// Update TOC - handle both \n and \r\n
content = content.replace(
  /   7\.4\. Appendix D: SDLC Documentation \(Waterfall Phases\)/,
  '   7.4. Appendix D: SDLC Documentation (Waterfall Phases)\n   7.5. Appendix E: Logical Component Diagram'
);

// Add Diagram before Appendix D
const diagram = `### A.5 Logical Component Diagram

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

`;

// Handle possible variations of the Appendix D header prefix
if (content.includes('---\n\n## Appendix D')) {
    content = content.replace('---\n\n## Appendix D', diagram + '## Appendix D');
} else if (content.includes('---\r\n\r\n## Appendix D')) {
    content = content.replace('---\r\n\r\n## Appendix D', diagram + '## Appendix D');
}

fs.writeFileSync(path, content);
console.log('Update successful');
