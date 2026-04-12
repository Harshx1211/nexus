/**
 * @file dashboard/mentees/detail/MenteeDetailClient.tsx
 * @description Client-side logic for the Mentee detail page.
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Mail, Calendar, CheckSquare, StickyNote,
    Trash2, Clock, AlertCircle, ChevronRight,
    TrendingUp, Video, Send, Users, Phone, Briefcase, User
} from "lucide-react";
import { downloadCSV } from "@/lib/csv-export";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";
import { getInitials, groupItemsByDate, formatDate } from "@/lib/date-utils";

function fmtDate(d: string | null | undefined) {
    if (!d) return "N/A";
    const formatted = formatDate(d);
    return formatted || "Invalid Date";
}
function fmtTime(d: string | null | undefined) {
    if (!d) return "N/A";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

type Section = "profile" | "sessions" | "tasks" | "notes";

export default function MenteeDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    const { toast, confirm } = useToast();

    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [mentee, setMentee] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [sessions, setSessions] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [tasks, setTasks] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [notes, setNotes] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<Section>("profile");

    const [noteInput, setNoteInput] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Auth guard
    useEffect(() => {
        if (!authLoading && profile?.role !== "mentor") {
            router.replace("/dashboard");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, profile]);

    useEffect(() => {
        if (!user?.id || !id || authLoading) return;
        fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, id, authLoading]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [profileRes, menteeRes, sessionsRes, tasksRes, notesRes] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("id, full_name, email, student_id, bio, semester, section")
                    .eq("id", id)
                    .maybeSingle(),
                supabase
                    .from("mentees")
                    .select("father_name, mother_name, father_mobile, mother_mobile, father_occupation, mother_occupation, career_goals")
                    .eq("id", id)
                    .maybeSingle(),
                supabase
                    .from("sessions")
                    .select("id, title, scheduled_at, duration_minutes, session_type, meeting_link")
                    .eq("mentor_id", user!.id)
                    .eq("mentee_id", id)
                    .order("scheduled_at", { ascending: false })
                    .limit(20),
                supabase
                    .from("assignments")
                    .select("id, title, description, status, due_date, task_type, form_data")
                    .eq("mentee_id", id)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("mentor_notes")
                    .select("id, content, created_at")
                    .eq("mentor_id", user!.id)
                    .eq("mentee_id", id)
                    .order("created_at", { ascending: false })
            ]);

            if (profileRes.data) {
                setMentee({
                    ...profileRes.data,
                    ...(menteeRes.data || {})
                });
            }
            
            setSessions(sessionsRes.data || []);
            setTasks(tasksRes.data || []);
            setNotes(notesRes.data || []);
        } catch (e) {
            logger.error("MenteeDetailClient", "Fetch error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!noteInput.trim()) return;
        setIsSavingNote(true);
        try {
            const { data, error } = await supabase.from("mentor_notes").insert({
                mentor_id: user!.id,
                mentee_id: id,
                content: noteInput.trim(),
            }).select().single();
            if (error) throw error;
            setNotes(prev => [data, ...prev]);
            setNoteInput("");
            toast("Note saved.", "success");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            toast(e.message || "Failed to save note.", "error");
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        const ok = await confirm({ title: "Delete Note", message: "Delete this private note permanently?", confirmText: "Delete", variant: "danger" });
        if (!ok) return;
        try {
            await supabase.from("mentor_notes").delete().eq("id", noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            toast(e.message || "Failed to delete note.", "error");
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleExportTasks = () => {
        if (!tasks.length) {
            toast("No tasks to export.", "info");
            return;
        }

        // Flatten tasks and their form_data for CSV
        const flattened = tasks.map(t => {
            const base = {
                title: t.title,
                status: t.status,
                due_date: t.due_date ? fmtDate(t.due_date) : "No Due Date",
                task_type: t.task_type || "general",
                description: t.description || ""
            };

            // If it's a result or placement task, attempt to serialize the form_data
            if (t.form_data) {
                if (t.task_type === "result") {
                    const fd = t.form_data;
                    return {
                        ...base,
                        cgpa: fd.cgpa || "",
                        sgpa: fd.sgpa || "",
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        subjects: (fd.subjects || []).map((s: any) => `${s.name}(${s.code || 'N/A'}): ${s.marks || s.grade || 'N/A'}`).join('; ')
                    };
                }
                if (t.task_type === "placement") {
                    const fd = t.form_data;
                    return {
                        ...base,
                        company: fd.company || "",
                        role: fd.role || "",
                        package: fd.package || "",
                        location: fd.location || ""
                    };
                }
                // Fallback for other form data
                return { ...base, response: JSON.stringify(t.form_data) };
            }

            return base;
        });

        downloadCSV(flattened, `${mentee?.full_name || 'Mentee'}_Tasks_${new Date().toISOString().split('T')[0]}.csv`);
        toast("Exported task records.", "success");
    };

    const handleBack = () => router.push("/dashboard/mentees");

    const taskCompleted = tasks.filter(t => ["submitted", "reviewed"].includes(t.status)).length;
    const taskProgress = tasks.length > 0 ? Math.round((taskCompleted / tasks.length) * 100) : 0;
    const now = new Date();
    const upcomingSessions = sessions.filter(s => new Date(s.scheduled_at) >= now).length;

    if (!authLoading && profile?.role !== "mentor") return null;

    return (
        <div className="animate-in fade-in duration-500 pb-20 max-w-[1400px] lg:max-w-4xl mx-auto">

            {/* Back */}
            <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors group mb-6"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Mentees
            </button>

            <div className="w-full space-y-6">

            {/* Profile Hero */}
            {loading ? (
                <div className="h-60 w-full glass rounded-2xl shimmer-skeleton" />
            ) : mentee ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-5 sm:p-6 rounded-2xl border border-white/40 dark:border-slate-800/50"
                >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                            {getInitials(mentee.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{mentee.full_name}</h1>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                {mentee.student_id && (
                                    <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{mentee.student_id}</span>
                                )}
                                <a href={`mailto:${mentee.email}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors font-medium">
                                    <Mail className="w-3 h-3" /> {mentee.email}
                                </a>
                            </div>
                            {mentee.bio && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{mentee.bio}</p>}
                        </div>

                        {/* Mini stats */}
                        <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 sm:mt-0 shrink-0">
                            <div className="min-w-[60px] text-center">
                                <p className="text-xl font-bold text-primary">{taskProgress}%</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tasks</p>
                            </div>
                            <div className="min-w-[60px] text-center">
                                <p className="text-xl font-bold text-emerald-500">{upcomingSessions}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Upcoming</p>
                            </div>
                            <div className="min-w-[60px] text-center">
                                <p className="text-xl font-bold text-indigo-500">{notes.length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                            <span>Overall Task Progress</span>
                            <span className="text-primary">{taskProgress}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${taskProgress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
                            />
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="flex items-center gap-3 p-6 glass rounded-2xl border border-red-200 dark:border-red-800/40">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm font-bold text-red-600">Mentee profile not found.</p>
                </div>
            )}

            {/* Section Tabs */}
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
                {(["profile", "sessions", "tasks", "notes"] as Section[]).map(s => (
                    <button
                        key={s}
                        onClick={() => setActiveSection(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeSection === s
                            ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                    >
                        {s === "profile" && <User className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
                        {s === "sessions" && <Calendar className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
                        {s === "tasks" && <CheckSquare className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
                        {s === "notes" && <StickyNote className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
                        {s}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeSection === "profile" && (
                    <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        {/* Parent Information Card */}
                        <div className="glass p-5 rounded-2xl border border-white/40 dark:border-slate-800/50 space-y-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Parent Information</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ParentInfoCard 
                                    label="Father's Details" 
                                    name={mentee?.father_name} 
                                    mobile={mentee?.father_mobile} 
                                    occupation={mentee?.father_occupation} 
                                />
                                <ParentInfoCard 
                                    label="Mother's Details" 
                                    name={mentee?.mother_name} 
                                    mobile={mentee?.mother_mobile} 
                                    occupation={mentee?.mother_occupation} 
                                />
                            </div>
                        </div>

                        {/* Academic & Career Goals */}
                        <div className="glass p-5 rounded-2xl border border-white/40 dark:border-slate-800/50 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Academic & Career Goals</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Career Goals</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {mentee?.career_goals || "No career goals specified yet."}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Semester</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{mentee?.semester || "N/A"}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Section</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{mentee?.section || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
                {activeSection === "sessions" && (
                    <motion.div key="sessions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                        {loading ? (
                            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 shimmer-skeleton rounded-2xl" />)}</div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <Calendar className="w-9 h-9 mx-auto mb-2 text-slate-200 dark:text-slate-700" />
                                <p className="text-sm font-semibold">No sessions recorded yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(groupItemsByDate(sessions, s => s.scheduled_at)).map(([date, items]) => (
                                    <div key={date} className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 bg-white/50 dark:bg-slate-900/50 px-3 py-1 rounded-full border border-slate-200/50 dark:border-white/5 shadow-sm">{date}</span>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                        </div>
                                        <div className="space-y-3">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {items.map((s: any, i: number) => (
                                                <motion.div
                                                    key={s.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="glass p-4 rounded-2xl border border-white/40 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform`}>
                                                            <Video className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{s.title || "Session"}</p>
                                                            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{s.session_type} &middot; {fmtTime(s.scheduled_at)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 pr-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.duration_minutes}m</span>
                                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬ Tasks Tab Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                {activeSection === "tasks" && (
                    <motion.div key="tasks" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                        {loading ? (
                            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 shimmer-skeleton rounded-2xl" />)}</div>
                        ) : tasks.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <CheckSquare className="w-9 h-9 mx-auto mb-2 text-slate-200 dark:text-slate-700" />
                                <p className="text-sm font-semibold">No tasks assigned yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(groupItemsByDate(tasks, t => t.due_date || t.created_at)).map(([date, items]) => (
                                    <div key={date} className="space-y-4">
                                        <div className="flex items-center gap-3 pl-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{date}</span>
                                            <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800/50" />
                                        </div>
                                        <div className="space-y-3">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {items.map((t: any, i: number) => {
                                                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "reviewed";
                                                const statusColors: Record<string, string> = {
                                                    pending: "bg-slate-100 dark:bg-slate-800 text-slate-400",
                                                    "in-progress": "bg-blue-500/10 text-blue-500",
                                                    submitted: "bg-emerald-500/10 text-emerald-600",
                                                    reviewed: "bg-indigo-500/10 text-indigo-600",
                                                };
                                                return (
                                                    <motion.div
                                                        key={t.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className={`glass p-4 rounded-2xl border transition-all ${isOverdue ? "border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/10" : "border-white/40 dark:border-slate-800/50"}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {t.task_type && t.task_type !== "general" && (
                                                                        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500">{t.task_type}</span>
                                                                    )}
                                                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{t.title}</p>
                                                                </div>
                                                                {t.due_date && (
                                                                    <p className={`text-[11px] font-medium flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                                                                        <Clock className="w-3 h-3" />
                                                                        Due: {fmtDate(t.due_date)} {fmtTime(t.due_date)}
                                                                        {isOverdue && " Ãƒâ€šâ€¢ OVERDUE"}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${statusColors[t.status] || "bg-slate-100 text-slate-400"}`}>
                                                                {t.status}
                                                            </span>
                                                        </div>

                                                        {/* Show form data if submitted result/placement */}
                                                        {t.form_data && ["submitted", "reviewed"].includes(t.status) && (
                                                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Submitted Response</p>
                                                                {t.task_type === "result" && <ResultSummary data={t.form_data} />}
                                                                {t.task_type === "placement" && <PlacementSummary data={t.form_data} />}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                    );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Notes Tab */}
                {activeSection === "notes" && (
                    <motion.div key="notes" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl">
                            <StickyNote className="w-4 h-4 text-amber-500 shrink-0" />
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Private notes are only visible to you.</p>
                        </div>
                        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-4 shadow-sm">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Add Private Note</label>
                            <textarea
                                rows={3}
                                value={noteInput}
                                onChange={e => setNoteInput(e.target.value)}
                                placeholder={`Private observation about ${mentee?.full_name || "this mentee"}...`}
                                className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm resize-none shadow-inner"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveNote}
                                    disabled={isSavingNote || !noteInput.trim()}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-blue-600 shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSavingNote ? "Saving..." : "Save Note"}
                                </button>
                            </div>
                        </div>
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-sm overflow-y-auto no-scrollbar">
                            {loading ? (
                                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 shimmer-skeleton rounded-2xl" />)}</div>
                            ) : notes.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <StickyNote className="w-8 h-8 mx-auto mb-2 text-slate-200 dark:text-slate-700" />
                                    <p className="text-xs font-semibold">No notes yet. Add your first observation.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(groupItemsByDate(notes, n => n.created_at)).map(([date, items]) => (
                                        <div key={date} className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">{date}</span>
                                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                            </div>
                                            <div className="space-y-3">
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {items.map((note: any, i: number) => (
                                                    <motion.div
                                                        key={note.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-white/5 shadow-sm group"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed flex-1">{note.content}</p>
                                                            <button
                                                                onClick={() => handleDeleteNote(note.id)}
                                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center mt-2 text-[9px] font-bold text-slate-400">
                                                            <Clock className="w-2.5 h-2.5 text-primary mr-1" />
                                                            {fmtTime(note.created_at)}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            </div>

        </div>
    );
}

// Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬ Form Summary Sub-components Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬Ã¢â‚¬ÂÃ¢â€šÂ¬

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResultSummary({ data }: { data: any }) {
    return (
        <div className="space-y-3">
            {data.subjects && data.subjects.length > 0 && (
                <div className="space-y-1.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {data.subjects.map((sub: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm text-xs shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{sub.name || "Unnamed"} {sub.code && <span className="text-[10px] text-slate-400 font-medium">({sub.code})</span>}</span>
                                {sub.passOrFail && (
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sub.passOrFail === 'pass' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                                        {sub.passOrFail}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-4 text-[11px] text-slate-500">
                                {sub.marks && <span><strong className="text-slate-700 dark:text-slate-300">Marks:</strong> {sub.marks}</span>}
                                {sub.grade && <span><strong className="text-slate-700 dark:text-slate-300">Grade:</strong> {sub.grade}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {(data.cgpa || data.sgpa) && (
                <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 text-xs mt-3 shadow-sm">
                    <div className="flex gap-4">
                        {data.cgpa && <span><strong className="text-indigo-600 dark:text-indigo-400 font-bold">CGPA:</strong> {data.cgpa}</span>}
                        {data.sgpa && <span><strong className="text-indigo-600 dark:text-indigo-400 font-bold">SGPA:</strong> {data.sgpa}</span>}
                    </div>
                    {data.marksheet_url && (
                        <a href={data.marksheet_url} target="_blank" rel="noreferrer" className="sm:ml-auto text-primary underline font-bold">View Marksheet</a>
                    )}
                </div>
            )}
            
            {data.remarks && <p className="text-xs text-slate-500 italic mt-2">&quot;{data.remarks}&quot;</p>}
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlacementSummary({ data }: { data: any }) {
    const statusColors: Record<string, string> = {
        placed: "bg-emerald-500/10 text-emerald-600",
        "not-placed": "bg-red-500/10 text-red-500",
        "higher-studies": "bg-indigo-500/10 text-indigo-600",
        other: "bg-slate-100 text-slate-500",
    };
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg ${statusColors[data.status] || "bg-slate-100 text-slate-400"}`}>{data.status?.replace("-", " ")}</span>
            </div>
            {data.company && <div className="text-xs"><span className="text-slate-400">Company: </span><span className="font-bold text-slate-900 dark:text-white">{data.company}</span></div>}
            {data.role && <div className="text-xs"><span className="text-slate-400">Role: </span><span className="font-bold text-slate-900 dark:text-white">{data.role}</span></div>}
            {data.package && <div className="text-xs"><span className="text-slate-400">Package: </span><span className="font-bold text-emerald-600">{data.package} LPA</span></div>}
            {data.higher_studies && <div className="text-xs"><span className="text-slate-400">Higher Studies: </span><span className="font-bold text-slate-900 dark:text-white">{data.higher_studies}</span></div>}
            {data.remarks && <p className="text-xs text-slate-500 italic">&quot;{data.remarks}&quot;</p>}
        </div>
    );
}

function ParentInfoCard({ label, name, mobile, occupation }: { label: string, name?: string, mobile?: string, occupation?: string }) {
    const hasData = name || mobile || occupation;
    return (
        <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
            <div className={`space-y-2 ${!hasData ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary opacity-60" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{name || "Awaiting Update"}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-500 opacity-60" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 font-mono tracking-tight">{mobile ? `+91 ${mobile}` : "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    <span className="text-xs font-medium text-slate-500">{occupation || "Not provided"}</span>
                </div>
            </div>
        </div>
    );
}



