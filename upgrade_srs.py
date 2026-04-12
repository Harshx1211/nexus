import re
import os

input_file = r"f:\Final Mentor Mentee\nexus\docs\NEXUS_SRS_v3_Premium.md"
output_file = r"f:\Final Mentor Mentee\nexus\docs\NEXUS_SRS_v4.5_PLATINUM.md"

with open(input_file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Header Information
text = text.replace('Version | 3.0.0-PREMIUM', 'Version | 4.5.0-PLATINUM')
text = text.replace('SRS_NEXUS_V3.0_May_2025', 'SRS_NEXUS_V4.5_May_2025')
text = text.replace('This document serves as the comprehensive "Source of Truth"', 'Version 4.5 incorporates major system updates including Analytics, Announcements, and Medical Leave architectures. This document serves as the comprehensive "Source of Truth"')

# 2. Update Table of Contents
toc_replacement = """3.6. Task & Assignment Distribution
   3.7. Textual Use Case Descriptions
   3.8. Medical Leaves Management
   3.9. Global Announcements System
   3.10. Analytics Module
   3.11. Mentor Onboarding Workflow"""

text = text.replace('3.6. Task & Assignment Distribution\n   3.7. Textual Use Case Descriptions', toc_replacement)

# Update ToC for Appendix A
appendix_replacement = """A.5. Logical Component Diagram
       A.6. Activity Diagram (Session Booking)
       A.7. State Diagram (Assignment Lifecycle)
       A.8. State Diagram (Leave Lifecycle)"""
text = text.replace('''A.5. Logical Component Diagram
       A.6. Activity Diagram (Session Booking)
       A.7. State Diagram (Assignment Lifecycle)''', appendix_replacement)


# 3. Inject New Features section
new_features_text = """### 3.8. Medical Leaves Management

**ID** | **Requirement**
--- | ---
**FR-30** | The system SHALL allow Mentors and Mentees to submit Medical Leave requests determining absence periods (`start_date` and `end_date`) and a `reason`.
**FR-31** | The system SHALL automatically prevent session bookings affecting a user's approved leave timeframe and display visual signals on the dashboard.

### 3.9. Global Announcements System

**ID** | **Requirement**
--- | ---
**FR-32** | The system SHALL provide a broadcast engine (`/dashboard/announcements`) for Admins and Mentors to push real-time ecosystem updates via the `announcements` schema.
**FR-33** | The system SHALL allow announcements to be targeted globally or specifically restricted to assigned cohorts.

### 3.10. Analytics Module

**ID** | **Requirement**
--- | ---
**FR-34** | The system SHALL deliver an `/dashboard/analytics` view offering comprehensive visual graphs outlining historical data.
**FR-35** | The system SHALL compute dynamic trends for session attendance density and task completion ratios aggregated over customizable sliding windows.

### 3.11. Mentor Onboarding Workflow

**ID** | **Requirement**
--- | ---
**FR-36** | The system SHALL provide a structured unauthenticated route (`/mentor-join`) for potential mentors to submit their profiles and credentials.
**FR-37** | The system SHALL store these requests within the `mentor_requests` relation, locking their state to `pending` until approved by Administrative clearance."""

text = text.replace('### 3.7. Textual Use Case Descriptions', new_features_text + '\n\n### 3.7. Textual Use Case Descriptions')

# 4. Inject UC-05 into Use Cases
uc5_text = """
#### UC-05: Submit Medical Leave
- **Actor**: Mentor / Mentee
- **Pre-Conditions**: User is authenticated and navigating the dashboard.
- **Normal Flow**:
  1. User navigates to the 'Leaves' interface.
  2. Submits a leave payload containing `start_date`, `end_date`, and `reason`.
  3. System verifies dates don't conflict negatively and records to `leaves` table.
  4. System updates UI to flag an active absence, blocking automated schedulers during this timeframe.
- **Post-Conditions**: Schedule availability is altered and notifications are sent.
"""

text = text.replace('#### UC-04: Chat Communication', uc5_text + '\n#### UC-04: Chat Communication')

# 5. Inject Appendix A.8 Leave Diagram
leave_diagram = """
### A.8 State Diagram (Leave Lifecycle)

This diagram tracks the lifecycle of a Medical Leave absence request.

```mermaid
stateDiagram-v2
    [*] --> Pending : User Submits Leave request
    Pending --> Approved : System/Admin Validates
    Pending --> Rejected : Denied
    Approved --> Active : Current Date matches Start Date
    Active --> Completed : End Date passed
    Completed --> [*]
```
"""
text = text.replace('## Appendix B: Database Schema & Relational Mapping', leave_diagram + '\n\n## Appendix B: Database Schema & Relational Mapping')

# 6. Upgrade the ERD in Appendix B
new_erd = """```mermaid
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
        string priority
        string status
    }
    MENTOR_REQUESTS {
        uuid id PK
        uuid user_id "FK to PROFILES"
        string status "pending | approved | rejected"
        string details "JSONB"
    }
    MESSAGES {
        uuid id PK
        uuid sender_id "FK to PROFILES"
        uuid receiver_id "FK to PROFILES"
        string content
        boolean is_read
    }
    LEAVES {
        uuid id PK
        uuid user_id "FK to PROFILES"
        date start_date
        date end_date
        string reason
        string status "pending | approved"
    }
    ANNOUNCEMENTS {
        uuid id PK
        uuid created_by "FK to PROFILES"
        string title
        string content
        string target_audience "global | cohort"
    }

    PROFILES ||--o| MENTORS : "specializes"
    PROFILES ||--o| MENTEES : "specializes"
    MENTORS ||--o{ MENTEES : "oversees"
    MENTORS ||--o{ SESSIONS : "conducts"
    MENTEES ||--o{ SESSIONS : "attends"
    MENTORS ||--o{ ASSIGNMENTS : "assigns"
    MENTEES ||--o{ ASSIGNMENTS : "completes"
    PROFILES ||--o{ TASKS : "manages"
    PROFILES ||--o{ MENTOR_REQUESTS : "applies"
    PROFILES ||--o{ MESSAGES : "communicates"
    PROFILES ||--o{ LEAVES : "requests"
    PROFILES ||--o{ ANNOUNCEMENTS : "broadcasts"
```"""

# Find existing ERD and replace it
# The existing ERD is between "erDiagram" and the backticks closing it.
erd_match = re.search(r'```mermaid\s+erDiagram.*?```', text, re.DOTALL)
if erd_match:
    text = text.replace(erd_match.group(0), new_erd)
else:
    print("Could not find ERD to replace.")

# Write to v4.5 Platinum
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Successfully generated unapologetically exact Unabridged Upgrade at {output_file}")
