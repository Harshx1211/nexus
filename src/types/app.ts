/**
 * @file types/app.ts
 * @description Shared application-level TypeScript interfaces and type aliases.
 *
 * These types represent the data shapes used throughout the NEXUS UI layer —
 * they are distinct from the raw database schema types in `types/database.ts`
 * and describe the formatted/enriched objects that components consume.
 */

// ─── User / Auth ──────────────────────────────────────────────────────────────

/** Roles a user can have in the system. */
export type UserRole = "mentor" | "mentee" | "admin";

// ─── Dashboard ────────────────────────────────────────────────────────────────

/** Mentor-side dashboard statistics. */
export interface MentorStats {
    activeMentees: number;
    totalSessions: number;
    hoursGuided: number;
    completionRate: number;
}

/** Mentee-side progress snapshot shown on the dashboard. */
export interface MenteeProgress {
    mentorName: string;
    nextSession: string;
    taskProgress: number;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

/** Session status values stored in the database. */
export type SessionStatus = "scheduled" | "completed" | "cancelled" | "no-show";

/** Formatted session object used by the SessionsPage UI. */
export interface FormattedSession {
    id: string;
    title: string;
    otherName: string;
    time: string;
    dateStr: string;
    dayNum: string;
    monthStr: string;
    duration: string;
    duration_minutes: number;
    status: SessionStatus;
    type: string;
    meeting_link?: string;
}

/** Form state for creating a new session. */
export interface NewSessionForm {
    title: string;
    mentee_id: string;
    scheduled_at: string;
    duration_minutes: number;
    session_type: string;
    meeting_link: string;
}

/** A mentee option shown in the "Schedule Session" dropdown. */
export interface MenteeOption {
    id: string;
    name: string;
    student_id: string;
}

// ─── Tasks / Assignments ──────────────────────────────────────────────────────

/** Task status values used in the UI. */
export type TaskUIStatus = "Pending" | "In Progress" | "Submitted" | "Completed" | "Changes Requested";

/** Task priority values used in the UI. */
export type TaskPriority = "High" | "Medium" | "Low";

/** Deadline status derived from due date comparison. */
export type DeadlineStatus = "overdue" | "upcoming" | "normal";

/** Formatted task object consumed by the TasksPage UI. */
export interface FormattedTask {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    status: TaskUIStatus;
    priority: TaskPriority;
    deadlineStatus: DeadlineStatus;
    otherName: string;
    menteeId?: string;
}

/** Form state for creating a new task. */
export interface NewTaskForm {
    title: string;
    description: string;
    due_date: string;
    priority: string;
    mentee_id: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

/** A contact item shown in the messages sidebar. */
export interface ChatContact {
    id: string;
    name: string;
    avatar: string;
    role: UserRole;
    student_id?: string;
    isPinnedMentor?: boolean;
}

/** A single message in the chat thread. */
export interface ChatMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
}

// ─── Mentees Directory ────────────────────────────────────────────────────────

/** Enriched mentee card shown in the Mentees directory. */
export interface EnrichedMentee {
    id: string;
    name: string;
    email: string;
    student_id?: string;
    semester?: string;
    program?: string;
    year?: number;
    avatar: string;
    progress: number;
    lastActive: string;
    topics: string[];
}

// ─── Generic Utilities ────────────────────────────────────────────────────────

/** A database row shape returned from Supabase with dynamic columns. */
export type DbRow = Record<string, unknown>;

/** Supabase realtime channel placeholder type. */
export type RealtimeChannel = ReturnType<typeof import("@supabase/supabase-js").createClient extends (...args: unknown[]) => infer R ? R : never>["channel"] extends (...args: unknown[]) => infer C ? C : never;
