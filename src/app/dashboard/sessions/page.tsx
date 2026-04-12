"use client";

/**
 * @file dashboard/sessions/page.tsx
 * @description Session scheduling and management page.
 *
 * Mentors can schedule new sessions, view upcoming meetings, and cancel sessions.
 * Mentees can view upcoming sessions, join via meeting link, and see past history.
 * Session data is stored in the Supabase `sessions` table.
 */

import { Calendar, Clock, Video, Plus, CheckCircle2, AlertCircle, ChevronRight, X, User, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, groupItemsByDate } from "@/lib/date-utils";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";
import { downloadCSV } from "@/lib/csv-export";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function SessionsPage() {
    const { user, profile, loading: authLoading, globalData, updateGlobalData } = useAuth();
    const { toast, confirm } = useToast();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [sessions, setSessions] = useState<any[]>(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalData.sessions?.length > 0 ? (globalData.sessions as any[]) : []
    );
    const [loading, setLoading] = useState(() =>
        !(globalData.sessions?.length > 0)
    );
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Failsafe: max 10 seconds - matches AuthContext timeout
    useEffect(() => {
        if (!loading) return;
        const timeout = setTimeout(() => {
            logger.warn("SessionsPage", "Failsafe: Loading took too long, forcing resolution.");
            setLoading(false);
        }, 10000);
        return () => clearTimeout(timeout);
    }, [loading]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [myMentees, setMyMentees] = useState<any[]>([]);
    const [menteesLoading, setMenteesLoading] = useState(false);
    const defaultSession = {
        title: "",
        mentee_id: "",
        scheduled_at: "",
        duration_minutes: 60,
        session_type: "one-on-one",
        meeting_link: ""
    };
    const [newSession, setNewSession] = useState(defaultSession);
    const [isScheduling, setIsScheduling] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [isRecapOpen, setIsRecapOpen] = useState(false);
    const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

    const toggleBatch = (batchId: string) => {
        setExpandedBatches(prev => ({
            ...prev,
            [batchId]: !prev[batchId]
        }));
    };

    // Reset form and close modal cleanly
    const closeModal = () => {
        setIsModalOpen(false);
        setNewSession(defaultSession);
    };

    const handleExportSessions = () => {
        if (sessions.length === 0) {
            toast("No records to export", "info");
            return;
        }

        const exportData = sessions.map(s => ({
            "Session Title": s.title,
            "Date": formatDate(s.scheduled_at),
            "Time": new Date(s.scheduled_at).toLocaleTimeString(),
            "Duration (Min)": s.duration_minutes,
            "Type": s.session_type,
            "Attendee ID": s.mentee_id || s.mentor_id,
            "Status": new Date(s.scheduled_at) < new Date() ? "Completed" : "Upcoming"
        }));

        // BUG-33 FIX: Avoid slashes in filenames which break OS filesystems. Use ISO format date or hyphenated.
        const safeDate = new Date().toISOString().split('T')[0];
        downloadCSV(exportData, `Sessions_Log_${safeDate}.csv`);
        toast("Exported successfully!", "success");
    };

    useEffect(() => {
        // EAGER FETCH: Start as soon as we have a user ID.
        // We don't wait for 'authLoading' or 'profile' to be fully resolved.
        if (!user?.id) return;
        
        // Ã°Å¸Å¸Â¢ REAL-TIME SUBSCRIPTION
        const channel = supabase
            .channel('sessions-realtime')
            .on(
                'postgres_changes',
                // BUG-26 FIX: Scope realtime events so it only wakes up when the current user's schedule changes
                { event: '*', schema: 'public', table: 'sessions', filter: profile?.role === 'mentor' ? `mentor_id=eq.${user.id}` : `mentee_id=eq.${user.id}` },
                () => {
                    logger.debug("SessionsPage", "Sessions table changed, refreshing...");
                    setRefreshTrigger(prev => prev + 1);
                }
            )
            .subscribe();

        const fetchSessions = async () => {
            try {
                const hasCachedData = sessions.length > 0;
                if (!hasCachedData) setLoading(true);

                // OPTIMIZED RELATIONAL QUERY: Uses joins instead of manual multi-step lookups.
                // For mentees, we also fetch sessions where mentee_id IS NULL AND mentor_id is their assigned mentor.
                // Fetch batch_id as well
                let query = supabase
                    .from('sessions')
                    .select('*, mentor:profiles!mentor_id(id, full_name), mentee:profiles!mentee_id(id, full_name)');

                if (profile?.role === 'mentee') {
                    // Fetch assigned mentor if not in globalData
                    let mentorId = globalData.myMentor?.id;
                    if (!mentorId) {
                        const { data: menteeRow } = await supabase
                            .from('mentees')
                            .select('assigned_mentor_id')
                            .eq('id', user.id)
                            .single();
                        mentorId = menteeRow?.assigned_mentor_id;
                    }

                    if (mentorId) {
                        // Mentee sees: sessions assigned to them OR old group sessions (where mentee_id is null)
                        query = query.or(`mentee_id.eq.${user.id},and(mentee_id.is.null,mentor_id.eq.${mentorId})`);
                    } else {
                        query = query.eq('mentee_id', user.id);
                    }
                } else {
                    // Mentor sees all sessions they created
                    query = query.eq('mentor_id', user.id);
                }

                const { data: sessionsData, error } = await query.order('scheduled_at', { ascending: true });

                if (error) throw error;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formatted = (sessionsData || []).map((s: any) => {
                    const isGroupSession = !s.mentee_id || s.session_type === 'group';
                    const isMentorSide = s.mentor_id === user.id;
                    const otherProfile = isMentorSide ? s.mentee : s.mentor;
                    const dateObj = new Date(s.scheduled_at);

                    return {
                        id: s.id,
                        isBatch: !!s.batch_id,
                        batchId: s.batch_id || s.id, // Fallback to id if no batch
                        mentor_id: s.mentor_id,
                        mentee_id: s.mentee_id,
                        rawStatus: s.status,
                        meeting_link: s.meeting_link,
                        scheduled_at: s.scheduled_at,
                        title: s.title || 'Mentoring Session',
                        otherName: otherProfile?.full_name || (isGroupSession ? 'All Mentees' : 'User'),
                        time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        dateStr: formatDate(s.scheduled_at),
                        dayNum: dateObj.getDate().toString(),
                        monthStr: dateObj.toLocaleDateString([], { month: 'short' }),
                        duration: `${s.duration_minutes} min`,
                        duration_minutes: s.duration_minutes || 0,
                        status: s.status,
                        type: isGroupSession ? 'Group' : (s.session_type === 'one-on-one' ? '1-on-1' : s.session_type === 'group' ? 'Group' : 'Workshop')
                    };
                });


                if (JSON.stringify(formatted) !== JSON.stringify(sessions)) {
                    setSessions(formatted);
                    updateGlobalData('sessions', formatted);
                }

                // Populate mentee dropdown for Mentor role
                if (profile?.role === 'mentor') {
                    if (globalData.myMentees?.length > 0) {
                        setMyMentees(globalData.myMentees);
                    } else {
                        // BUG-14 FIX: Using the mentee IDs, join with profiles to get the correct auth profile IDs
                        // assignments and sessions use `mentee_id` referencing `profiles(id)`, not `mentees(id)`
                        const { data: mRows } = await supabase
                            .from('mentees')
                            .select('id')
                            .eq('assigned_mentor_id', user.id);

                        if (mRows && mRows.length > 0) {
                            // Extract the list of mentees table primary keys. We need to find their profile IDs.
                            // The `mentees` table has a 1-to-1 foreign key back to `profiles`.
                            // So mRows.id is the mentee table PK. We need to query mentees with their profile join
                            // actually, in this schema, mentee table 'id' IS the profile 'id' since it's a 1-1 extension table.
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const ids = mRows.map((m: any) => m.id);
                            const { data: menteeProfiles } = await supabase
                                .from('profiles')
                                .select('id, full_name, student_id')
                                .in('id', ids);

                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const formattedMentees = (menteeProfiles || []).map((p: any) => ({
                                id: p.id,
                                name: p.full_name || 'Mentee',
                                student_id: p.student_id || ''
                            }));
                            setMyMentees(formattedMentees);
                        }
                        setMenteesLoading(false);
                    }
                }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                logger.error("SessionsPage", "Fetch failed", {
                    message: err?.message || err,
                    code: err?.code
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();

        return () => {
            supabase.removeChannel(channel);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger, user?.id, profile?.role, globalData, updateGlobalData]);

    // Dynamic status determination: If a scheduled session is in the past (including duration), treat as completed in UI
    const now = new Date();
    const upcomingSessions = sessions.filter(s => {
        if (s.status === 'cancelled') return false;
        if (s.status !== 'scheduled') return false;
        const duration = s.duration_minutes || 60;
        const endTime = new Date(new Date(s.scheduled_at).getTime() + duration * 60000);
        return endTime > now;
    });

    const completedSessions = sessions.filter(s => {
        if (s.rawStatus === 'completed') return true;
        if (s.rawStatus === 'scheduled') {
            const duration = s.duration_minutes || 60;
            const endTime = new Date(new Date(s.scheduled_at).getTime() + duration * 60000);
            return endTime <= now;
        }
        return false;
    });

    const totalMinutes = sessions.reduce((acc, session) => acc + (session.duration_minutes || 0), 0);
    const totalHoursScheduled = Math.round(totalMinutes / 60);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupedUpcomingSessions = Object.values(upcomingSessions.reduce((acc: any, session: any) => {
        if (!acc[session.batchId]) {
            acc[session.batchId] = { ...session, isGrouped: session.isBatch, batchItems: [] };
        }
        if (session.isBatch) {
            acc[session.batchId].batchItems.push(session);
        }
        return acc;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {})).map((group: any) => {
        if(group.isGrouped) {
             group.totalCount = group.batchItems.length;
             // Here status logic is same since 'scheduled' depends on date, but you could aggregate completion if tracking actual completion.
        }
        return group;
    });

    const handleCancelSession = async (sessionId: string, isBatch: boolean = false) => {
        const ok = await confirm({
            title: "Cancel Session",
            message: "Are you sure you want to cancel this session? This will remove it from the schedule.",
            confirmText: "Cancel Session",
            variant: "danger"
        });
        if (!ok) return;

        try {
            let error;
            if (isBatch) {
                const res = await supabase.from('sessions').update({ status: 'cancelled' }).eq('batch_id', sessionId);
                error = res.error;
            } else {
                const res = await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', sessionId);
                error = res.error;
            }
            if (error) throw error;
            toast("Session cancelled.", "info");
            setRefreshTrigger(prev => prev + 1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            logger.error("SessionsPage", "Error cancelling session", error);

            toast("Failed to cancel session.", "error");
        }
    };

    const handleScheduleSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || profile?.role !== 'mentor') return;
        if (!newSession.title.trim()) {
            toast("Please enter a session title.", "warning");
            return;
        }
        if (!newSession.mentee_id) {
            toast("Please select a mentee.", "warning");
            return;
        }
        if (!newSession.scheduled_at) {
            toast("Please pick a date and time.", "warning");
            return;
        }
        if (new Date(newSession.scheduled_at) < new Date()) {
            toast("Cannot schedule a session in the past.", "warning");
            return;
        }
        if (newSession.duration_minutes <= 0 || isNaN(newSession.duration_minutes)) {
            toast("Please select a valid session duration.", "warning");
            return;
        }

        setIsScheduling(true);
        try {
            const meetingLink = (newSession.meeting_link || '').trim();
            // Auto-prefix https:// if user typed a URL without protocol
            const normalizedLink = meetingLink && !meetingLink.startsWith('http')
                ? `https://${meetingLink}`
                : meetingLink;

            const isGroupSession = newSession.mentee_id === "all" || newSession.session_type === "group";
            const batchId = isGroupSession ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)) : null;
            
            if (isGroupSession) {
                // Fetch all mentees for this mentor
                const { data: menteeRows } = await supabase
                    .from('mentees')
                    .select('id')
                    .eq('assigned_mentor_id', user.id);
                
                if (menteeRows && menteeRows.length > 0) {
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     const insertData = menteeRows.map((m: any) => ({
                        mentor_id: user.id,
                        mentee_id: m.id,
                        title: newSession.title.trim() || 'Mentoring Session',
                        scheduled_at: new Date(newSession.scheduled_at).toISOString(),
                        duration_minutes: newSession.duration_minutes,
                        session_type: 'group',
                        batch_id: batchId,
                        meeting_link: normalizedLink || null,
                        status: 'scheduled'
                     }));
                      const { error } = await supabase.from('sessions').insert(insertData);
                      if (error) throw error;
                      // notify
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const notifications = menteeRows.map((m: any) => ({
                         recipient_id: m.id,
                         type: 'session',
                         title: 'New Group Session',
                         content: `New group session scheduled: ${newSession.title || 'Mentoring Session'}`,
                         link: '/dashboard/sessions',
                         is_read: false
                     }));
                     await supabase.from('notifications').insert(notifications);
                } else {
                    toast("No mentees available to schedule this group session.", "warning");
                    setIsScheduling(false);
                    return;
                }
            } else {
                const { error } = await supabase
                    .from('sessions')
                    .insert({
                        mentor_id: user.id,
                        mentee_id: newSession.mentee_id,
                        title: newSession.title.trim() || 'Mentoring Session',
                        scheduled_at: new Date(newSession.scheduled_at).toISOString(),
                        duration_minutes: newSession.duration_minutes,
                        session_type: newSession.session_type,
                        meeting_link: normalizedLink || null,
                        status: 'scheduled'
                    });
                if (error) throw error;

                // notify
                await supabase.from('notifications').insert({
                    recipient_id: newSession.mentee_id,
                    type: 'session',
                    title: 'New Session Scheduled',
                    content: `Your mentor has scheduled a session: ${newSession.title || 'Mentoring Session'}`,
                    link: '/dashboard/sessions',
                    is_read: false
                });
            }

            closeModal();
            toast("Session scheduled successfully!", "success");
            setRefreshTrigger(prev => prev + 1);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            logger.error("SessionsPage", "Error scheduling session", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            toast(error.message || "Failed to schedule session", "error");
        } finally {
            setIsScheduling(false);
        }
    };

    // ZERO-LATENCY UI: Only block the whole page if we have NO identity info.
    const isBlocking = authLoading && !profile?.role && !user?.user_metadata?.role;

    if (isBlocking) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12">
                {/* Page title skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-3">
                        <div className="h-9 w-56 rounded-2xl bg-slate-200 dark:bg-slate-700 shimmer-skeleton" />
                        <div className="h-4 w-72 rounded-xl bg-slate-100 dark:bg-slate-800 shimmer-skeleton" />
                    </div>
                    <div className="h-12 w-40 rounded-2xl bg-slate-100 dark:bg-slate-800 shimmer-skeleton hidden sm:block" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Session cards */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="h-5 w-44 rounded-lg bg-slate-200 dark:bg-slate-700 shimmer-skeleton" />
                        {[1, 2, 3].map(i => (
                            <div key={i} className="nexus-card p-5 sm:p-6 flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 shrink-0 shimmer-skeleton" />
                                <div className="flex-1 space-y-2.5">
                                    <div className="h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-700 shimmer-skeleton" />
                                    <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800 shimmer-skeleton" />
                                    <div className="h-3 w-1/4 rounded bg-slate-100 dark:bg-slate-800 shimmer-skeleton" />
                                </div>
                                <div className="h-9 w-20 rounded-xl bg-slate-100 dark:bg-slate-800 shimmer-skeleton shrink-0" />
                            </div>
                        ))}
                    </div>
                    {/* Sidebar cards */}
                    <div className="space-y-4">
                        <div className="h-5 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 shimmer-skeleton" />
                        <div className="nexus-card p-5 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0 shimmer-skeleton" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700 shimmer-skeleton" />
                                        <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800 shimmer-skeleton" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="nexus-card h-32 shimmer-skeleton" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2"
                >
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Session Management
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium max-w-lg">
                        {profile?.role === 'mentor'
                            ? 'Schedule and manage 1-on-1 mentoring sessions.'
                            : 'View and join your upcoming sessions.'}
                    </p>
                </motion.div>
                {profile?.role === 'mentor' && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
                        <button
                            onClick={handleExportSessions}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200/60 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm text-sm active:scale-95"
                        >
                            <Video className="w-4 h-4 text-primary" />
                            <span>Export Logs</span>
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 text-sm">
                            <Plus className="w-4 h-4" /> Schedule Session
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main List */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <div className="w-1 h-5 bg-gradient-to-b from-primary to-blue-600 rounded-full" />
                        Upcoming Schedule
                    </h2>

                    <div className="space-y-4">
                        {upcomingSessions.length === 0 ? (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 sm:p-12 text-center glass rounded-2xl border border-white/40 dark:border-slate-800/50 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative">
                                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center shadow-max border border-white dark:border-slate-700/50 transition-transform duration-500">
                                        <Video className="w-8 h-8 sm:w-10 sm:h-10 text-primary drop-shadow-sm" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700 animate-bounce">
                                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                    </div>
                                </div>
                                    <div className="mt-6 space-y-3 relative">
                                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">No upcoming sessions</h3>
                                        <p className="max-w-xs mx-auto text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                            {profile?.role === 'mentor'
                                                ? "Your schedule is currently clear. Start by setting up a meeting with your mentees."
                                                : "Your mentor hasn't scheduled a session yet. Stay tuned or reach out to them directly."}
                                        </p>
                                    </div>
                                {profile?.role === 'mentee' && (
                                    <div className="pt-6 relative">
                                        <a href="/dashboard/messages" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all text-sm active:scale-95">
                                            Message Your Mentor <ChevronRight className="w-4 h-4" />
                                        </a>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(groupItemsByDate(groupedUpcomingSessions, s => s.scheduled_at)).map(([date, items]) => (
                                    <div key={date} className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 bg-white/50 dark:bg-slate-900/50 px-3 py-1 rounded-full backdrop-blur-md border border-slate-200/50 dark:border-white/5 shadow-sm">{date}</span>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {items.map((session: any, i: number) => {
                                                if (session.isGrouped && profile?.role === 'mentor') {
                                                    const isExpanded = expandedBatches[session.batchId];
                                                    return (
                                                        <div key={session.batchId} className="group overflow-hidden nexus-card nexus-card-hover transition-all duration-300">
                                                            <div className="p-5 sm:p-6 cursor-pointer" onClick={() => toggleBatch(session.batchId)}>
                                                              <div className="flex flex-col md:flex-row gap-5">
                                                                <div className="md:w-40 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-4 md:pb-0 md:pr-5 flex flex-col justify-center">
                                                                  <div className="flex items-center gap-2 mb-2">
                                                                       <Calendar className="w-4 h-4 text-primary" />
                                                                       <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                                           {formatDate(session.scheduled_at).split(',')[0]}
                                                                       </span>
                                                                  </div>
                                                                  <div className="flex items-center gap-2">
                                                                       <Clock className="w-4 h-4 text-slate-400" />
                                                                       <span className="text-sm font-medium text-slate-500">
                                                                           {session.time} ({session.duration})
                                                                       </span>
                                                                  </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                                                                        <div>
                                                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                                                                <Users className="w-5 h-5" />
                                                                                {session.title || 'Group Mentoring Session'}
                                                                            </h3>
                                                                             <p className="text-sm text-slate-500 mt-1">
                                                                                Group Session &bull; <span className="font-semibold">{session.totalCount} Mentees</span>
                                                                            </p>
                                                                        </div>
                                                                         <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400 text-[10px] uppercase font-bold tracking-widest bg-emerald-50 dark:bg-emerald-500/10">
                                                                            Upcoming Batch
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                                                                         <div className="flex items-center gap-3">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleCancelSession(session.batchId, true); }}
                                                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all active:scale-90"
                                                                                title="Cancel All in Batch"
                                                                            >
                                                                                <X className="w-5 h-5" />
                                                                            </button>
                                                                            {session.meeting_link ? (
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); window.open(session.meeting_link, '_blank'); }}
                                                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
                                                                                >
                                                                                    Join <Video className="w-4 h-4" />
                                                                                </button>
                                                                            ) : (
                                                                                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold rounded-lg text-sm cursor-not-allowed italic">
                                                                                    Link Pending
                                                                                </button>
                                                                            )}
                                                                         </div>
                                                                          <button className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                                                            {isExpanded ? 'Hide Details' : 'View Group'} 
                                                                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                            {/* EXPANDED CONTENT */}
                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: "auto", opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="overflow-hidden bg-slate-50/30 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800"
                                                                    >
                                                                        <div className="p-4 pl-12 sm:pl-48 space-y-3">
                                                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                            {session.batchItems.map((subSession: any) => (
                                                                                <div key={subSession.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                                                            <User className="w-4 h-4 text-slate-500" />
                                                                                        </div>
                                                                                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                                                                                            {subSession.otherName}
                                                                                        </span>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleCancelSession(subSession.id); }}
                                                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all"
                                                                                        title="Remove Mentee from Session"
                                                                                    >
                                                                                         <X className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                <motion.div
                                                    key={session.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="group flex flex-col sm:flex-row gap-5 p-5 sm:p-6 nexus-card nexus-card-hover transition-all duration-300"
                                                >
                                                    <div className="flex flex-col md:flex-row gap-5">
                                                        {/* Left: Date/Time Block */}
                                                        <div className="md:w-40 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-4 md:pb-0 md:pr-5 flex flex-col justify-center">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Calendar className="w-4 h-4 text-primary" />
                                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                                    {formatDate(session.scheduled_at).split(',')[0]}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="w-4 h-4 text-slate-400" />
                                                                <span className="text-sm font-medium text-slate-500">
                                                                    {session.time} ({session.duration})
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Right: Session Details & Actions */}
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                                                                <div>
                                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                                        {session.title || 'Mentoring Session'}
                                                                    </h3>
                                                                    <p className="text-sm text-slate-500">
                                                                        with <span className="font-semibold text-slate-700 dark:text-slate-300">{session.otherName}</span>
                                                                    </p>
                                                                </div>
                                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400 text-[10px] uppercase font-bold tracking-widest bg-transparent">
                                                                    Upcoming
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                                {profile?.role === 'mentor' && (
                                                                    <button
                                                                        onClick={() => handleCancelSession(session.id)}
                                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all active:scale-90"
                                                                        title="Cancel Session"
                                                                    >
                                                                        <X className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                                {session.meeting_link ? (
                                                                    <button
                                                                        onClick={() => window.open(session.meeting_link, '_blank')}
                                                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all active:scale-95"
                                                                    >
                                                                        Join Now <Video className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold rounded-xl text-sm cursor-not-allowed italic">
                                                                        Link Pending
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {completedSessions.length > 0 && (
                        <div className="pt-4 space-y-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <div className="w-1 h-5 bg-gradient-to-b from-emerald-400 to-green-600 rounded-full" />
                                Recent History
                            </h2>
                            <div className="space-y-8">
                                {Object.entries(groupItemsByDate(completedSessions, s => s.scheduled_at)).map(([date, items]) => (
                                    <div key={date} className="space-y-4">
                                        <div className="flex items-center gap-3 pl-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{date}</span>
                                            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {items.map((session: any, i: number) => (
                                                <motion.div
                                                    key={session.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="group flex items-center justify-between p-5 sm:p-6 nexus-card nexus-card-hover transition-all duration-300 cursor-pointer"
                                                >
                                                        <div className="flex items-center gap-4 text-left min-w-0 flex-1">
                                                            <div className="nexus-card p-3 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner group-hover:scale-110 transition-transform shrink-0">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                   <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{session.title}</p>
                                                                   <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest bg-transparent">
                                                                Completed
                                                            </span>
                                                                </div>
                                                                <p className="text-xs text-slate-500 truncate">{session.time} &bull; with {session.otherName}</p>
                                                            </div>
                                                        </div>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSession(session);
                                                            setIsRecapOpen(true);
                                                        }}
                                                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                    >
                                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>


                {/* Sidebar Mini-Calendar or Stats */}
                <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent p-5 relative overflow-hidden">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 relative z-10 tracking-tight">Weekly Highlights</h3>
                        <div className="space-y-6 relative z-10">
                            <div className="flex items-center gap-5 group cursor-default">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                                    <Video className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalHoursScheduled}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {profile?.role === 'mentor' ? 'Hours Scheduled' : 'Hours Logged'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{completedSessions.length}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Sessions</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{upcomingSessions.length}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Confirmed</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="nexus-card p-5 border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10">
                        <h4 className="font-bold mb-2 text-slate-900 dark:text-white">Quick Tip</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Confirm your sessions at least 24 hours in advance to maintain a high professional rating.
                        </p>
                    </div>
                    <div className="nexus-card p-5 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10">
                        <h4 className="font-bold mb-2 text-slate-900 dark:text-white">Group Tip</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Use Group Sessions to address common questions and build community among your mentees.
                        </p>
                    </div>
                </div>
            </div>

            {/* Schedule Session Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90dvh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Schedule New Session</h2>
                            <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form noValidate onSubmit={handleScheduleSession} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Session Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newSession.title}
                                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm"
                                    placeholder="e.g., Mock Interview Preparation"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Mentee</label>
                                {menteesLoading ? (
                                    <div className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-400 flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        Loading your mentees...
                                    </div>
                                ) : (
                                    <div className="relative group/select">
                                        <select
                                            required
                                            value={newSession.mentee_id}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setNewSession({ 
                                                    ...newSession, 
                                                    mentee_id: val,
                                                    session_type: val === 'all' ? 'group' : newSession.session_type
                                                });
                                            }}
                                            className="w-full pl-4 pr-10 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm appearance-none font-medium text-slate-900 dark:text-white"
                                        >
                                            <option value="" disabled>-- Select a Mentee --</option>
                                            <optgroup label="Group Actions">
                                                <option value="all" className="font-bold text-primary">Group Session (All Mentees)</option>
                                            </optgroup>
                                            <optgroup label="Individual Mentees">
                                                {myMentees.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name} {m.student_id ? `(${m.student_id})` : ''}</option>
                                                ))}
                                            </optgroup>
                                            {myMentees.length === 0 && (
                                                <option value="" disabled>No mentees assigned yet</option>
                                            )}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-primary transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" /> Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + 3600000).toISOString().slice(0, 16)}
                                        value={newSession.scheduled_at}
                                        onChange={(e) => setNewSession({ ...newSession, scheduled_at: e.target.value })}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" /> Duration
                                    </label>
                                    <select
                                        required
                                        value={newSession.duration_minutes}
                                        onChange={(e) => setNewSession({ ...newSession, duration_minutes: Number(e.target.value) })}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm appearance-none font-medium text-slate-900 dark:text-white"
                                    >
                                        <option value="15">15 Minutes</option>
                                        <option value="30">30 Minutes</option>
                                        <option value="45">45 Minutes</option>
                                        <option value="60">60 Minutes</option>
                                        <option value="90">90 Minutes</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Session Type</label>
                                <select
                                    required
                                    disabled={newSession.mentee_id === 'all'}
                                    value={newSession.session_type}
                                    onChange={(e) => setNewSession({ ...newSession, session_type: e.target.value })}
                                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm appearance-none font-medium text-slate-900 dark:text-white disabled:opacity-60"
                                >
                                    <option value="one-on-one">1-on-1 Mentoring</option>
                                    <option value="group">Group Session</option>
                                    <option value="workshop">Workshop</option>
                                </select>
                                {newSession.mentee_id === 'all' && (
                                    <p className="text-[10px] text-primary mt-1 ml-1 font-bold">Automatically set to Group Session for multiple mentees</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                                    Meeting Link <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={newSession.meeting_link}
                                    onChange={(e) => setNewSession({ ...newSession, meeting_link: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm"
                                    placeholder="https://meet.google.com/..."
                                />
                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Paste any meeting link (Google Meet, Zoom, Teams, etc.)</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isScheduling}
                                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-blue-700 active:scale-95 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isScheduling ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Scheduling...
                                        </span>
                                    ) : "Schedule Session"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Session Recap Modal */}
            {isRecapOpen && selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Recap</h2>
                            <p className="text-slate-500 dark:text-slate-400">Completed on {selectedSession.dateStr}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                                    <p className="font-bold text-slate-900 dark:text-white">{selectedSession.duration}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Type</p>
                                    <p className="font-bold text-slate-900 dark:text-white">{selectedSession.type}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Participants</p>
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                        {selectedSession.otherName.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedSession.otherName}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">{profile?.role === 'mentor' ? 'Mentee' : 'Mentor'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                                    Attendance and participation were recorded. You can export the full transcript and analytics from the Settings module.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 pt-0">
                            <button
                                onClick={() => setIsRecapOpen(false)}
                                className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-bold hover:bg-black dark:hover:bg-slate-700 transition-all shadow-lg"
                            >
                                Close Recap
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}


