// Database Types for NEXUS Platform
// Auto-generated from Supabase schema

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: 'mentor' | 'mentee' | 'admin';

    // Academic Information (for students)
    student_id?: string;
    semester?: string;
    section?: string;

    // Professional Information (for mentors)
    department?: string;
    designation?: string;
    employee_id?: string;
    expertise?: string[];

    // Contact & Profile
    phone?: string;
    bio?: string;
    avatar_url?: string;

    // Status
    is_active: boolean;
    is_verified: boolean;

    // Timestamps
    created_at: string;
    updated_at: string;
    last_login_at?: string;
}

export interface Mentor {
    id: string;

    // Availability
    max_mentees: number;
    current_mentees: number;
    is_accepting_mentees: boolean;

    // Preferences
    preferred_topics?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    availability_schedule?: Record<string, any>;

    // Stats
    total_sessions_conducted: number;
    average_rating: number;
    total_reviews: number;

    created_at: string;
    updated_at: string;
}

export interface Mentee {
    id: string;

    // Academic Details
    program?: string;
    year_of_study?: number;
    cgpa?: number;

    // Interests & Goals
    interests?: string[];
    career_goals?: string;
    learning_objectives?: string;

    // Mentor Assignment
    assigned_mentor_id?: string;
    assignment_date?: string;

    // Stats
    total_sessions_attended: number;

    created_at: string;
    updated_at: string;
}

export interface Session {
    id: string;
    mentor_id: string;
    mentee_id: string;

    // Session Details
    title: string;
    description?: string;
    session_type?: 'one-on-one' | 'group' | 'workshop';

    // Scheduling
    scheduled_at: string;
    duration_minutes: number;
    location?: string;
    meeting_link?: string;

    // Status
    status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';

    // Notes & Feedback
    mentor_notes?: string;
    mentee_notes?: string;
    agenda?: string;

    // Ratings (1-5)
    mentor_rating?: number;
    mentee_rating?: number;

    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;

    // Message Content
    content: string;
    message_type: 'text' | 'file' | 'link';

    // Attachments
    attachment_url?: string;
    attachment_name?: string;

    // Status
    is_read: boolean;
    read_at?: string;

    // Thread
    thread_id?: string;

    created_at: string;
}

export interface Assignment {
    id: string;
    mentor_id: string;
    mentee_id: string;

    // Assignment Details
    title: string;
    description: string;
    instructions?: string;

    // Deadlines
    assigned_at: string;
    due_date: string;
    submitted_at?: string;
    reviewed_at?: string;

    // Status
    status: 'pending' | 'in-progress' | 'submitted' | 'reviewed' | 'overdue';

    // Submission
    submission_text?: string;
    submission_url?: string;

    // Feedback
    feedback?: string;
    grade?: string;
    score?: number;

    created_at: string;
    updated_at: string;
}

export interface Task {
    id: string;
    user_id: string;

    // Task Details
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';

    // Status & Dates
    status: 'todo' | 'in-progress' | 'completed' | 'cancelled';
    due_date?: string;
    completed_at?: string;

    // Categorization
    category?: string;
    tags?: string[];

    created_at: string;
    updated_at: string;
}

// Helper types
export type UserRole = Profile['role'];
export type SessionStatus = Session['status'];
export type AssignmentStatus = Assignment['status'];
export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];
