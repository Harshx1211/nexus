/**
 * @file dashboard/analytics/page.tsx
 * @description Performance Analytics dashboard.
 *
 * Fetches real data from Supabase to show:
 * - Per-month session bar chart (last 12 months)
 * - Task completion breakdown donut
 * - Role-specific stats (mentee count for mentors / mentor info for mentees)
 * - A dynamic insight paragraph built from real numbers
 * All data is real - no hardcoded placeholders.
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Users, Clock, CheckCircle2, Calendar,
    Target, Award, Sparkles,
    AlertCircle, BarChart2, Layers
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MonthBucket {
    label: string;   // e.g. "Jan"
    count: number;   // sessions in that month
    hours: number;   // hours in that month
}

interface AnalyticsData {
    totalHours: number;
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    menteeCount: number;          // mentor only
    mentorName: string | null;    // mentee only
    taskTotal: number;
    taskCompleted: number;        // reviewed / submitted
    taskPending: number;
    taskInProgress: number;
    taskOverdue: number;
    taskSuccessRate: number;
    avgSessionDuration: number;
    monthlyBuckets: MonthBucket[];
    sessionTypes: { label: string; count: number; color: string }[];
}

const EMPTY: AnalyticsData = {
    totalHours: 0, totalSessions: 0, completedSessions: 0, upcomingSessions: 0,
    menteeCount: 0, mentorName: null,
    taskTotal: 0, taskCompleted: 0, taskPending: 0, taskInProgress: 0,
    taskOverdue: 0, taskSuccessRate: 0,
    avgSessionDuration: 0,
    monthlyBuckets: [],
    sessionTypes: []
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Returns last 12 calendar-month labels e.g. ["Apr", "May", ..., "Mar"] */
function getLast12MonthLabels(): { label: string; year: number; month: number }[] {
    const now = new Date();
    const result = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        result.push({
            label: d.toLocaleString("default", { month: "short" }),
            year: d.getFullYear(),
            month: d.getMonth()  // 0-indexed
        });
    }
    return result;
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AnalyticsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [data, setData] = useState<AnalyticsData>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [activeBar, setActiveBar] = useState<number | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Failsafe
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 10000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        const isMentor = profile?.role === "mentor" || user?.user_metadata?.role === "mentor";
        fetchAll(user.id, isMentor);
    }, [user?.id, profile?.role, user?.user_metadata?.role, refreshTrigger]);

    // Real-time synchronization
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('analytics_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sessions' },
                () => {
                    logger.info("AnalyticsPage", "Real-time session update");
                    setRefreshTrigger(prev => prev + 1);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'assignments' },
                () => {
                    logger.info("AnalyticsPage", "Real-time assignment update");
                    setRefreshTrigger(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const fetchAll = async (userId: string, isMentor: boolean) => {
        setLoading(true);
        try {
            const now = new Date();

            const [sessionsRes, tasksRes, menteeRes, mentorRes] = await Promise.all([
                supabase
                    .from("sessions")
                    .select("id, scheduled_at, duration_minutes, session_type")
                    .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
                    .order("scheduled_at", { ascending: true }),
                supabase
                    .from("assignments")
                    .select("status, due_date")
                    .eq(isMentor ? "mentor_id" : "mentee_id", userId),
                isMentor
                    ? supabase.from("mentees").select("id", { count: "exact", head: true }).eq("assigned_mentor_id", userId)
                    : Promise.resolve({ count: 0 }),
                !isMentor
                    ? supabase
                        .from("mentees")
                        .select("profiles:profiles!fk_mentor_profile(full_name)")
                        .eq("id", userId)
                        .maybeSingle()
                    : Promise.resolve({ data: null })
            ]);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sessions = (sessionsRes.data || []) as any[];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tasks = (tasksRes.data || []) as any[];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const menteeCount = (menteeRes as any).count || 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mentorName = (!isMentor && (mentorRes.data as any)?.profiles?.full_name) || null;

            // â”€â”€ Session stats â”€â”€
            const completed = sessions.filter(s => new Date(s.scheduled_at) < now);
            const upcoming = sessions.filter(s => new Date(s.scheduled_at) >= now);
            const totalMins = completed.reduce((a, s) => a + (s.duration_minutes || 0), 0);
            const avgDuration = completed.length > 0 ? Math.round(totalMins / completed.length) : 0;

            // â”€â”€ Monthly buckets â”€â”€
            const months = getLast12MonthLabels();
            const monthlyBuckets: MonthBucket[] = months.map(({ label, year, month }) => {
                const inMonth = completed.filter(s => {
                    const d = new Date(s.scheduled_at);
                    return d.getFullYear() === year && d.getMonth() === month;
                });
                const hrs = inMonth.reduce((a, s) => a + (s.duration_minutes || 0), 0) / 60;
                return { label, count: inMonth.length, hours: parseFloat(hrs.toFixed(1)) };
            });

            // â”€â”€ Session type breakdown â”€â”€
            const typeMap: Record<string, number> = {};
            sessions.forEach(s => {
                const t = s.session_type || "one-on-one";
                typeMap[t] = (typeMap[t] || 0) + 1;
            });
            const typeColors: Record<string, string> = {
                "one-on-one": "bg-primary",
                "group": "bg-emerald-500",
                "workshop": "bg-amber-500",
                "review": "bg-indigo-500",
                "other": "bg-slate-400"
            };
            const sessionTypes = Object.entries(typeMap).map(([key, count]) => ({
                label: key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " "),
                count,
                color: typeColors[key] || "bg-slate-400"
            }));

            // â”€â”€ Task stats â”€â”€
            const taskCompleted = tasks.filter(t => ["reviewed", "submitted"].includes(t.status)).length;
            const taskPending = tasks.filter(t => t.status === "pending").length;
            const taskInProgress = tasks.filter(t => t.status === "in-progress").length;
            const taskOverdue = tasks.filter(t => {
                if (["reviewed", "submitted"].includes(t.status)) return false;
                return t.due_date && new Date(t.due_date) < now;
            }).length;
            const taskSuccessRate = tasks.length > 0 ? Math.round((taskCompleted / tasks.length) * 100) : 0;

            setData({
                totalHours: parseFloat((totalMins / 60).toFixed(1)),
                totalSessions: sessions.length,
                completedSessions: completed.length,
                upcomingSessions: upcoming.length,
                menteeCount,
                mentorName,
                taskTotal: tasks.length,
                taskCompleted,
                taskPending,
                taskInProgress,
                taskOverdue,
                taskSuccessRate,
                avgSessionDuration: avgDuration,
                monthlyBuckets,
                sessionTypes
            });
        } catch (e) {
            logger.error("AnalyticsPage", "Fetch error", e);
        } finally {
            setLoading(false);
        }
    };

    const isMentor = profile?.role === "mentor" || user?.user_metadata?.role === "mentor";
    const isBlocking = authLoading && !profile?.role && !user?.user_metadata?.role;

    // â”€â”€ Build dynamic insight text â”€â”€
    const insightText = useMemo(() => {
        if (loading && data.totalSessions === 0) return "Calculating your performance metrics...";
        if (isMentor) {
            const best = data.monthlyBuckets.reduce((a, b) => b.count > a.count ? b : a, { label: "-", count: 0, hours: 0 });
            if (data.totalSessions === 0) return "No sessions recorded yet. Schedule your first session to start seeing analytics.";
            return `You've completed ${data.completedSessions} session${data.completedSessions !== 1 ? "s" : ""} totalling ${data.totalHours} hours of mentoring. Your most active month was ${best.label} with ${best.count} session${best.count !== 1 ? "s" : ""}. Average session duration: ${data.avgSessionDuration} mins. Task completion rate across your mentees is ${data.taskSuccessRate}%.`;
        } else {
            if (data.totalSessions === 0) return "No sessions recorded yet. Your mentor will schedule sessions soon.";
            const streak = data.taskSuccessRate;
            return `You've attended ${data.completedSessions} session${data.completedSessions !== 1 ? "s" : ""} with ${data.mentorName ? data.mentorName : "your mentor"}, totalling ${data.totalHours} hours. You have ${data.upcomingSessions} upcoming session${data.upcomingSessions !== 1 ? "s" : ""}. Your overall task completion stands at ${streak}%${streak >= 70 ? " - excellent work!" : streak >= 40 ? ". Keep pushing!" : ". Focus on completing pending tasks."}`;
        }
    }, [data, loading, isMentor]);

    // â”€â”€ Chart max â”€â”€
    const chartMax = Math.max(...data.monthlyBuckets.map(b => b.count), 1);

    if (isBlocking) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12">
                <div className="h-10 w-64 rounded-xl bg-slate-200 dark:bg-slate-800 shimmer-skeleton" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/50 shimmer-skeleton" />
                    ))}
                </div>
                <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800/50 shimmer-skeleton" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Performance Analytics
                        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-xl font-bold uppercase tracking-widest border border-primary/20">Insights</span>
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
                        {isMentor ? "Real-time insights into your mentoring activity and mentee progress." : "Track your learning journey, session history, and task progress."}
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Clock className="w-5 h-5" />}
                    label="Total Hours"
                    value={loading ? null : `${data.totalHours}h`}
                    sub="Mentoring Time"
                    detail={loading ? null : `${data.completedSessions} sessions completed`}
                    color="primary"
                />
                {isMentor ? (
                    <StatCard
                        icon={<Users className="w-5 h-5" />}
                        label="Active Mentees"
                        value={loading ? null : data.menteeCount}
                        sub="Assigned to you"
                        detail={loading ? null : data.menteeCount === 0 ? "No mentees yet" : `${data.upcomingSessions} upcoming session${data.upcomingSessions !== 1 ? "s" : ""}`}
                        color="amber"
                    />
                ) : (
                    <StatCard
                        icon={<Users className="w-5 h-5" />}
                        label="My Mentor"
                        value={loading ? null : data.mentorName ? "Assigned" : "Pending"}
                        sub={data.mentorName || "Not yet assigned"}
                        detail={loading ? null : `${data.upcomingSessions} upcoming session${data.upcomingSessions !== 1 ? "s" : ""}`}
                        color="amber"
                    />
                )}
                <StatCard
                    icon={<Calendar className="w-5 h-5" />}
                    label="Upcoming"
                    value={loading ? null : data.upcomingSessions}
                    sub="Scheduled Sessions"
                    detail={loading ? null : `${data.totalSessions} total sessions`}
                    color="emerald"
                />
                <StatCard
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    label="Task Rate"
                    value={loading ? null : `${data.taskSuccessRate}%`}
                    sub="Completion Rate"
                    detail={loading ? null : `${data.taskCompleted}/${data.taskTotal} tasks done`}
                    color="indigo"
                />
            </div>

            {/* Dynamic Insight */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white relative overflow-hidden shadow-2xl shadow-primary/20 border border-white/10"
            >
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-24 -mt-24 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-16 -mb-16 pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">AI Insight</p>
                        <p className="text-sm sm:text-base text-white/90 font-medium leading-relaxed max-w-3xl">
                            {insightText}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Monthly Sessions Bar Chart */}
                <div className="xl:col-span-2 nexus-card p-4 sm:p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BarChart2 className="w-4 h-4 text-primary" />
                                Session Activity
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                Number of sessions per month - last 12 months
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block" />Sessions
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-52 flex items-end gap-2 px-2">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="flex-1 shimmer-skeleton rounded-t-xl" style={{ height: `${20 + Math.random() * 60}%` }} />
                            ))}
                        </div>
                    ) : data.monthlyBuckets.every(b => b.count === 0) ? (
                        <div className="h-52 flex flex-col items-center justify-center text-center gap-3">
                            <BarChart2 className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                            <p className="text-sm font-semibold text-slate-400">No sessions recorded yet</p>
                            <p className="text-xs text-slate-300 dark:text-slate-600 max-w-xs">Charts will populate as you complete sessions</p>
                        </div>
                    ) : (
                        <div className="h-52 flex items-end gap-1.5 sm:gap-2.5 px-1">
                            {data.monthlyBuckets.map((bucket, i) => {
                                const pct = chartMax > 0 ? (bucket.count / chartMax) * 100 : 0;
                                const isActive = activeBar === i;
                                return (
                                    <div
                                        key={i}
                                        className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                                        onMouseEnter={() => setActiveBar(i)}
                                        onMouseLeave={() => setActiveBar(null)}
                                    >
                                        {/* Tooltip */}
                                        <div className={`relative w-full flex-1 flex flex-col justify-end transition-all`}>
                                            {isActive && (
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap z-20">
                                                    {bucket.count} session{bucket.count !== 1 ? "s" : ""}
                                                    <br />
                                                    <span className="font-medium opacity-70">{bucket.hours}h</span>
                                                </div>
                                            )}
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: pct > 0 ? `${Math.max(pct, 4)}%` : "4%" }}
                                                transition={{ delay: i * 0.04, duration: 0.8, ease: "easeOut" }}
                                                className={`w-full rounded-t-xl transition-colors duration-200 ${pct === 0 ? "bg-slate-100 dark:bg-slate-800/40" : isActive ? "bg-blue-500" : "bg-gradient-to-t from-primary/40 to-primary"}`}
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                            {bucket.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Y-axis labels */}
                    {!loading && data.monthlyBuckets.some(b => b.count > 0) && (
                        <div className="mt-4 flex items-center justify-between px-1">
                            <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold">0</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{chartMax} sessions max</span>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-5">

                    {/* Task Breakdown */}
                    <div className="nexus-card p-5 sm:p-6">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                            <Target className="w-4 h-4 text-indigo-500" /> Task Breakdown
                        </h3>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-8 rounded-xl shimmer-skeleton" />)}
                            </div>
                        ) : data.taskTotal === 0 ? (
                            <div className="text-center py-6">
                                <Layers className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-slate-400">No tasks assigned yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <TaskBar label="Completed" count={data.taskCompleted} total={data.taskTotal} color="bg-emerald-500" textColor="text-emerald-600 dark:text-emerald-400" />
                                <TaskBar label="In Progress" count={data.taskInProgress} total={data.taskTotal} color="bg-primary" textColor="text-primary" />
                                <TaskBar label="Pending" count={data.taskPending} total={data.taskTotal} color="bg-amber-500" textColor="text-amber-600 dark:text-amber-400" />
                                {data.taskOverdue > 0 && (
                                    <TaskBar label="Overdue" count={data.taskOverdue} total={data.taskTotal} color="bg-red-500" textColor="text-red-600 dark:text-red-400" />
                                )}
                                <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span>Total Tasks</span>
                                        <span className="text-slate-900 dark:text-white">{data.taskTotal}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Session Types */}
                    <div className="nexus-card p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                            <Layers className="w-4 h-4 text-primary" /> Session Types
                        </h3>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2].map(i => <div key={i} className="h-7 rounded-xl shimmer-skeleton" />)}
                            </div>
                        ) : data.sessionTypes.length === 0 ? (
                            <p className="text-xs text-center text-slate-400 py-4">No sessions yet</p>
                        ) : (
                            <div className="space-y-3">
                                {data.sessionTypes.map(t => (
                                    <div key={t.label} className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.color}`} />
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex-1">{t.label}</span>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{t.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row - Avg Duration + Success Highlight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Avg Session Duration */}
                <div className="nexus-card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                        <Clock className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Avg Session Duration</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {loading ? <span className="inline-block h-7 w-16 shimmer-skeleton rounded-xl" /> : data.avgSessionDuration > 0 ? `${data.avgSessionDuration} min` : "-"}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Across {data.completedSessions} sessions</p>
                    </div>
                </div>

                {/* Achievement / Status card */}
                <div className={`p-4 rounded-2xl relative overflow-hidden border ${data.taskSuccessRate >= 70
                    ? "bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-400 shadow-xl shadow-emerald-500/20"
                    : data.taskSuccessRate >= 40
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 border-amber-400 shadow-xl shadow-amber-500/20"
                        : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 shadow-xl"
                    } text-white`}
                >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20 shrink-0">
                            {data.taskSuccessRate >= 70 ? <Award className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">Performance Status</p>
                            <p className="text-lg font-bold leading-tight">
                                {loading ? "Calculating..." :
                                    data.taskTotal === 0 ? "No tasks yet" :
                                        data.taskSuccessRate >= 70 ? "High Performer 🏆" :
                                            data.taskSuccessRate >= 40 ? "On Track 🚀" :
                                                "Action Needed ⚠️"}
                            </p>
                            <p className="text-xs text-white/80 mt-0.5">
                                {data.taskTotal > 0 ? `${data.taskSuccessRate}% task completion rate` : "Complete tasks to see your status"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overdue warning */}
            {!loading && data.taskOverdue > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-4 p-5 rounded-[24px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40"
                >
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-red-700 dark:text-red-300">
                            {data.taskOverdue} overdue task{data.taskOverdue !== 1 ? "s" : ""} need attention
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                            {isMentor ? "Check the Tasks page to review and update deadlines." : "Go to the Tasks page and submit your pending work."}
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({ icon, label, value, sub, detail, color }: any) {
    const colorMap: Record<string, string> = {
        primary: "bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/20",
        amber: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20",
        emerald: "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20",
        indigo: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20",
    };
    
    const isLoading = value === null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`nexus-card nexus-card-hover p-5 sm:p-6 group overflow-hidden relative`}
        >
            <div className="flex items-center gap-3 relative z-10">
                <div className={`w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 ${colorMap[color]} group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mt-0.5">
                        {isLoading
                            ? <div className="h-7 w-14 shimmer-skeleton rounded-xl" />
                            : value
                        }
                    </div>
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 relative z-10">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{sub}</p>
                {detail && (
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {isLoading ? <span className="inline-block h-3 w-24 shimmer-skeleton rounded" /> : detail}
                    </p>
                )}
            </div>
        </motion.div>
    );
}

function TaskBar({ label, count, total, color, textColor }: { label: string; count: number; total: number; color: string; textColor: string }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${textColor}`}>{label}</span>
                <span className="text-[11px] font-bold text-slate-900 dark:text-white">{count} <span className="font-medium text-slate-400">({pct}%)</span></span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: "circOut" }}
                    className={`${color} h-full rounded-full`}
                />
            </div>
        </div>
    );
}

