"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Users,
    Calendar,
    CheckCircle2,
    Megaphone,
    X
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

import { 
    // Types from page.tsx removed as unused
} from "../page";
interface MenteeProgress {
    mentorName: string;
    nextSession: string;
    taskProgress: number;
    total_sessions_attended: number;
    mentor_id: string | null;
}

interface MenteeDashboardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profile: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingRequests: any[];
    menteeProgress: MenteeProgress;
    dataLoading: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleAcceptRequest: (request: any) => Promise<void>;
    handleRejectRequest: () => Promise<void>;
    setShowRejectionModal: (show: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSelectedRequest: (request: any) => void;
    rejectionReason: string;
    setRejectionReason: (reason: string) => void;
    showRejectionModal: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedRequest: any;
    isProcessingRequest: boolean;
    toast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function MenteeDashboard({
    profile,
    user,
    pendingRequests,
    menteeProgress,
    dataLoading,
    handleAcceptRequest,
    handleRejectRequest,
    setShowRejectionModal,
    setSelectedRequest,
    rejectionReason,
    setRejectionReason,
    showRejectionModal,
    selectedRequest,
    isProcessingRequest,
    toast
}: MenteeDashboardProps) {
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [unreadAnnouncement, setUnreadAnnouncement] = useState<any>(null);
    const [bannerDismissed, setBannerDismissed] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        const fetch = async () => {
            try {
                const { data: menteeRow } = await supabase
                    .from("mentees")
                    .select("assigned_mentor_id")
                    .eq("id", user.id)
                    .maybeSingle();
                if (!menteeRow?.assigned_mentor_id) return;

                const { data: readData } = await supabase
                    .from("announcement_reads")
                    .select("announcement_id")
                    .eq("mentee_id", user.id);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const readIds = new Set((readData || []).map((r: any) => r.announcement_id));

                const { data: announcements } = await supabase
                    .from("announcements")
                    .select("id, title, content")
                    .eq("mentor_id", menteeRow.assigned_mentor_id)
                    .order("created_at", { ascending: false });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const unread = (announcements || []).find((a: any) => !readIds.has(a.id));
                if (unread) setUnreadAnnouncement(unread);
            } catch (error) {
                logger.warn("MenteeDashboard", "Failed to fetch announcements", error);
            }
        };
        fetch();
    }, [user?.id]);

    const hasMentor =
        menteeProgress.mentorName !== 'Unassigned Mentor' &&
        menteeProgress.mentorName !== 'Unassigned';

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full max-w-7xl mx-auto">

            {/* ── Page Header ────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Academic Dashboard
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-xl font-bold uppercase tracking-widest border border-emerald-500/20">Mentee</span>
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
                        Welcome back,{" "}
                        <span className="text-slate-800 dark:text-slate-200 font-bold">
                            {(() => {
                                const name = profile?.full_name || user?.user_metadata?.full_name || 'Mentee';
                                const parts = name.split(' ');
                                const titles = ['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'ms', 'ms.', 'mrs', 'mrs.'];
                                if (parts.length > 1 && titles.includes(parts[0].toLowerCase())) {
                                    return `${parts[0]} ${parts[1]}`;
                                }
                                return parts[0];
                            })()}
                        </span>
                    </p>
                    {(profile?.student_id || user?.user_metadata?.student_id) && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5 w-fit pr-4">
                            <div className="px-2.5 py-1 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/5 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID</span>
                                <span className="text-xs font-bold text-primary tracking-tight">{profile?.student_id || user?.user_metadata?.student_id}</span>
                            </div>
                            {profile?.semester && (
                                <div className="px-2.5 py-1 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/5 flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sem</span>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{profile.semester}</span>
                                </div>
                            )}
                            {profile?.section && (
                                <div className="px-2.5 py-1 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/5 flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sec</span>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{profile.section}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Pending Mentor Request Banner ──────────────────── */}
            {pendingRequests.length > 0 && (
                <div className="space-y-3">
                    {pendingRequests.map((request) => (
                        <motion.div
                            key={request.id}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative overflow-hidden rounded-2xl bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50"
                        >

                            <div className="relative z-10 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                                <div className="space-y-1.5">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/50 text-[10px] font-bold uppercase tracking-widest border border-blue-200 text-blue-700 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-700">
                                        Action Required
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">Mentor Connection Request</h2>
                                    <p className="text-blue-800/80 dark:text-blue-200/80 text-sm max-w-xl leading-relaxed">
                                        <strong className="text-blue-900 dark:text-white font-semibold">{request.mentor?.full_name}</strong> wants to guide you as your official mentor.
                                        {request.mentor?.expertise && ` They specialize in ${request.mentor.expertise.join(', ')}.`}
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => handleAcceptRequest(request)}
                                        disabled={isProcessingRequest}
                                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 text-sm shadow-lg shadow-blue-600/20"
                                    >
                                        {isProcessingRequest && selectedRequest?.id === request.id ? "Accepting..." : "Accept Connection"}
                                    </button>
                                    <button
                                        onClick={() => { setSelectedRequest(request); setShowRejectionModal(true); }}
                                        disabled={isProcessingRequest}
                                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all disabled:opacity-50 text-sm"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* â”€â”€ Announcement Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {unreadAnnouncement && !bannerDismissed && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 nexus-card border-l-4 border-l-primary cursor-pointer group hover:bg-slate-50"
                    onClick={() => router.push("/dashboard/announcements")}
                >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">New Announcement</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate mt-0.5">{unreadAnnouncement.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{unreadAnnouncement.content}</p>
                    </div>
                    <button
                        onClick={e => { e.stopPropagation(); setBannerDismissed(true); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </motion.div>
            )}

            {/* â”€â”€ Rejection Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {showRejectionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
                    >
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Decline Request</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            Please provide a reason for declining. This helps the mentor understand your decision.
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Already assigned to another mentor, or focused on a different domain."
                            className="w-full h-28 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary transition-all text-sm mb-6 resize-none"
                        />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowRejectionModal(false)}
                                className="flex-1 py-3.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectRequest}
                                disabled={!rejectionReason.trim() || isProcessingRequest}
                                className="flex-1 py-3.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 shadow-lg shadow-red-500/20 text-sm"
                            >
                                {isProcessingRequest ? "Declining..." : "Decline Request"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* â”€â”€ Quick Stat Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Mentor Card */}
                <Link
                    href={menteeProgress.mentor_id && menteeProgress.mentor_id !== 'Unassigned'
                        ? `/dashboard/mentor?id=${menteeProgress.mentor_id}`
                        : "#"}
                    onClick={(e) => {
                        if (!menteeProgress.mentor_id || menteeProgress.mentor_id === 'Unassigned') {
                            e.preventDefault();
                            toast("Mentor not yet assigned to your account.", "info");
                        }
                    }}
                    className="nexus-card nexus-card-hover p-5 group cursor-pointer block overflow-hidden relative"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <Users className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">My Mentor</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {dataLoading && menteeProgress.mentorName === 'Unassigned Mentor' ? (
                                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 shimmer-skeleton" />
                            ) : (
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                                    {hasMentor ? menteeProgress.mentorName.charAt(0).toUpperCase() : '?'}
                                </div>
                            )}
                            <div className="min-w-0">
                                {dataLoading && menteeProgress.mentorName === 'Unassigned Mentor' ? (
                                    <div className="h-5 w-28 bg-slate-100 dark:bg-slate-800 rounded-lg shimmer-skeleton" />
                                ) : (
                                    <div className="font-bold text-base text-slate-900 dark:text-white tracking-tight truncate group-hover:text-primary transition-colors">
                                        {menteeProgress.mentorName}
                                    </div>
                                )}
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5 group-hover:text-primary/60 transition-colors">
                                    {hasMentor ? 'View profile →' : 'Awaiting assignment'}
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Next Session Card */}
                <div className="nexus-card p-5 group overflow-hidden relative">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Next Session</span>
                        </div>
                        {dataLoading && menteeProgress.nextSession === 'None Scheduled' ? (
                            <div className="h-6 w-36 bg-slate-100 dark:bg-slate-800 rounded-lg shimmer-skeleton" />
                        ) : (
                            <div className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                                {menteeProgress.nextSession === 'None Scheduled' || menteeProgress.nextSession === 'No upcoming sessions' ? (
                                    <span className="text-slate-400 font-medium text-sm">None Scheduled</span>
                                ) : (
                                    menteeProgress.nextSession
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => router.push('/dashboard/sessions')}
                            className="text-[10px] font-bold text-primary mt-2 hover:underline"
                        >
                            View sessions →
                        </button>
                    </div>
                </div>

                {/* Task Progress Card */}
                <div className="nexus-card p-5 group overflow-hidden relative">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tasks Done</span>
                            </div>
                            <span className="font-bold text-emerald-600 text-lg">{Number.isNaN(menteeProgress.taskProgress) ? 0 : (menteeProgress.taskProgress || 0)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
                            {dataLoading ? (
                                <div className="w-full h-full shimmer-skeleton" />
                            ) : (
                                <div
                                    className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${Number.isNaN(menteeProgress.taskProgress) ? 0 : (menteeProgress.taskProgress || 0)}%` }}
                                />
                            )}
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/tasks')}
                            className="text-[10px] font-bold text-primary mt-2 hover:underline"
                        >
                            View tasks →
                        </button>
                    </div>
                </div>
            </div>

            {/* â”€â”€ Bottom Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-1 gap-5 sm:gap-6">

                {/* Mentor Feedback */}
                <div className="nexus-card p-5 sm:p-6 space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mentor Feedback</h2>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                        {dataLoading ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shimmer-skeleton" />
                                    <div className="space-y-1.5">
                                        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded shimmer-skeleton" />
                                        <div className="h-2 w-16 bg-slate-100 dark:bg-slate-800 rounded shimmer-skeleton" />
                                    </div>
                                </div>
                                <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/40 rounded-xl shimmer-skeleton" />
                            </div>
                        ) : hasMentor ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                                        <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">
                                            {(menteeProgress.mentorName || 'M').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{menteeProgress.mentorName}</div>
                                        <div className="text-xs text-slate-500">Your assigned mentor</div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/10 text-slate-600 dark:text-slate-400 text-sm italic leading-relaxed">
                                    No recent feedback. Complete your tasks to receive guidance!
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-5 space-y-2">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto opacity-60">
                                    <Users className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-xs mx-auto">
                                    Feedback will appear once you are assigned a mentor.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sessions attended badge */}
                    {menteeProgress.total_sessions_attended > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium">
                                <strong className="text-slate-700 dark:text-slate-200 font-bold">
                                    {menteeProgress.total_sessions_attended}
                                </strong>{" "}
                                session{menteeProgress.total_sessions_attended !== 1 ? 's' : ''} attended
                            </span>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
}

