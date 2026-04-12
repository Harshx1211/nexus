"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Users,
    Calendar,
    CheckCircle2,
    ArrowUpRight,
    Activity,
    TrendingUp
} from "lucide-react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getInitials, formatDate } from "@/lib/date-utils";
import Link from "next/link";

import { 
    DashboardStats, 
    DashboardSession, 
    DashboardMentee, 
    DashboardActivity 
} from "../page";

interface MentorDashboardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profile: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any;
    stats: DashboardStats;
    upcomingSessions: DashboardSession[];
    activeMentees: DashboardMentee[];
    recentActivity: DashboardActivity[];
    dataLoading: boolean;
    router: AppRouterInstance;
    statsConfig: { 
        key: keyof DashboardStats; 
        label: string; 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        icon: any; 
        color: string; 
        bg: string; 
    }[];
}

export function MentorDashboard({
    profile,
    user,
    stats,
    upcomingSessions,
    activeMentees,
    recentActivity,
    dataLoading,
    router,
    statsConfig
}: MentorDashboardProps) {
    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">

            {/* ── Page Header ─────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Overview Dashboard
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-xl font-bold uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" /> Live Data</span>
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Welcome back,{" "}
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">
                            {(() => {
                                const name = profile?.full_name || user?.user_metadata?.full_name || 'Professor';
                                const parts = name.split(' ');
                                const titles = ['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'ms', 'ms.', 'mrs', 'mrs.'];
                                if (parts.length > 1 && titles.includes(parts[0].toLowerCase())) {
                                    return `${parts[0]} ${parts[1]}`;
                                }
                                return parts[0];
                            })()}
                        </span>
                        . You have{" "}
                        <span className="font-bold text-primary">{upcomingSessions.length}</span> session{upcomingSessions.length !== 1 ? 's' : ''} scheduled.
                    </p>
                </div>
            </div>

            {/* ── Stat Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {statsConfig.map((statConfig, index) => {
                    const value = stats[statConfig.key];
                    const displayValue = statConfig.key === 'hoursGuided' ? `${value}h` :
                        statConfig.key === 'completionRate' ? `${value}%` :
                            value.toString();

                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                            onClick={() => {
                                if (statConfig.key === 'totalSessions' || statConfig.key === 'hoursGuided') router.push('/dashboard/sessions');
                                else if (statConfig.key === 'activeMentees') router.push('/dashboard/mentees');
                                else router.push('/dashboard/tasks');
                            }}
                            className={`nexus-card nexus-card-hover p-5 sm:p-6 cursor-pointer group overflow-hidden relative`}
                        >
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                                        <statConfig.icon className={`w-5 h-5 ${statConfig.color.replace('bg-', 'text-')}`} />
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div>
                                    {dataLoading && value === 0 ? (
                                        <div className="h-9 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl shimmer-skeleton mb-2" />
                                    ) : (
                                        <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                                            {displayValue}
                                        </div>
                                    )}
                                    <div className="text-sm font-medium text-slate-500">
                                        {statConfig.label}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* â”€â”€ Main Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

                {/* Left column */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Upcoming Sessions */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Upcoming Sessions</h2>
                            <button
                                onClick={() => router.push('/dashboard/sessions')}
                                className="text-xs font-bold text-primary hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-all"
                            >
                                View All <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {upcomingSessions.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingSessions.map((session, i) => (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="nexus-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between group hover:shadow-md transition-all gap-4"
                                    >

                                        <div className="flex items-center gap-4 relative">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm shrink-0">
                                                {session.mentees?.profiles?.full_name
                                                    ? session.mentees.profiles.full_name.charAt(0).toUpperCase()
                                                    : '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">
                                                    {session.mentees?.profiles?.full_name || 'Mentee'}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                                    <p className="text-xs text-slate-500 font-medium truncate">
                                                        {session.title || 'Session'} • {session.scheduled_at ? formatDate(session.scheduled_at) : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 md:shrink-0">
                                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold tracking-wider uppercase">
                                                Scheduled
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (session.meeting_link) window.open(session.meeting_link, '_blank');
                                                    else router.push('/dashboard/sessions');
                                                }}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-blue-600 transition-all transition-colors active:scale-95"
                                            >
                                                <span>Join</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="nexus-card p-8 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="font-semibold text-slate-500 dark:text-slate-400">No upcoming sessions scheduled</p>
                                <button
                                    onClick={() => router.push('/dashboard/sessions')}
                                    className="mt-4 px-5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/10 transition-all"
                                >
                                    Schedule a Session
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Active Mentees */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Active Mentees
                                <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">{stats.activeMentees}</span>
                            </h2>
                            <button
                                onClick={() => router.push('/dashboard/mentees')}
                                className="text-xs font-bold text-primary hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-all"
                            >
                                Directory <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {activeMentees.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {activeMentees.slice(0, 6).map((mentee) => (
                                    <Link
                                        key={mentee.id}
                                        href={`/dashboard/mentees/detail?id=${mentee.id}`}
                                        className="nexus-card nexus-card-hover p-4 flex flex-col gap-3 group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm shrink-0">
                                                {mentee.initials || getInitials(mentee.name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                    {mentee.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
                                                    {mentee.student_id || "-"}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {mentee.progress}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-slate-400 dark:bg-slate-500 h-full rounded-full transition-all duration-500 ease-out"
                                                style={{ width: `${mentee.progress}%` }}
                                            />
                                        </div>
                                    </Link>
                                ))}

                                {activeMentees.length > 6 && (
                                    <div
                                        onClick={() => router.push('/dashboard/mentees')}
                                        className="nexus-card p-4 flex items-center justify-center text-center border-dashed cursor-pointer hover:border-primary/30 hover:bg-primary/3 transition-all group"
                                    >
                                        <div>
                                            <div className="text-xl font-bold text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                                                +{activeMentees.length - 6}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                More
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="nexus-card p-8 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="font-semibold text-slate-500 dark:text-slate-400">No mentees assigned yet</p>
                                <button
                                    onClick={() => router.push('/dashboard/mentees')}
                                    className="mt-4 px-5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/10 transition-all"
                                >
                                    Add a Mentee
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column - Recent Activity + CTA */}
                <div className="space-y-5">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Recent Activity</h2>

                    <div className="nexus-card p-5 space-y-1">
                        {recentActivity.length > 0 ? recentActivity.map((activity, idx) => (
                            <React.Fragment key={activity.id}>
                                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                            {activity.text}
                                            <span className="font-bold text-slate-900 dark:text-white"> {activity.bold}</span>.
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                            {formatDate(activity.time)}
                                        </p>
                                    </div>
                                </div>
                                {idx < recentActivity.length - 1 && (
                                    <div className="h-px bg-slate-100 dark:bg-white/5 mx-3" />
                                )}
                            </React.Fragment>
                        )) : (
                            <div className="text-center py-8 space-y-2">
                                <Activity className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto" />
                                <p className="text-sm text-slate-400">No recent activity yet.</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => router.push('/dashboard/sessions')}
                        className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-blue-600 transition-all duration-200 text-sm"
                    >
                        + Schedule Session
                    </button>

                    {/* Quick links */}
                    <div className="nexus-card p-4 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Quick Links</p>
                        {[
                            { label: "Assign a Task", href: "/dashboard/tasks", icon: CheckCircle2, color: "text-emerald-500" },
                            { label: "View Analytics", href: "/dashboard/analytics", icon: TrendingUp, color: "text-violet-500" },
                        ].map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                            >
                                <item.icon className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors`} />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    {item.label}
                                </span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 ml-auto transition-colors group-hover:text-slate-400" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}


