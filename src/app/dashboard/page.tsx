/**
 * @file dashboard/page.tsx
 * @description Main overview dashboard for authenticated users.
 *
 * Displays real-time stats, upcoming sessions, recent activity, and
 * quick-access cards. Renders different content for mentors vs mentees.
 * Statistics are fetched from `sessions`, `assignments`, and `mentees` tables.
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { CONFIG } from "@/lib/config";
import {
    Users,
    Calendar,
    Clock,
    CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, getInitials } from "@/lib/date-utils";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";
import { MentorDashboard } from "./components/MentorDashboard";
import { MenteeDashboard } from "./components/MenteeDashboard";

export interface DashboardStats {
    activeMentees: number;
    totalSessions: number;
    hoursGuided: number;
    completionRate: number;
}

export interface DashboardSession {
    id: string;
    mentor_id: string;
    mentee_id: string;
    status: string;
    scheduled_at: string;
    duration_minutes?: number;
    meeting_link?: string;
    topic?: string;
    title?: string;
    mentees?: {
        profiles: {
            full_name: string;
        };
    };
    mentee?: {
        full_name: string;
    };
}

export interface DashboardMentee {
    id: string;
    name: string;
    student_id?: string;
    initials: string;
    progress: number;
}

export interface DashboardActivity {
    id: string;
    text: string;
    bold: string;
    type: 'task' | 'session';
    time: string;
}

interface LoadingStates {
    stats: boolean;
    sessions: boolean;
    mentees: boolean;
    activity: boolean;
    requests: boolean;
    auth: boolean;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading, globalData, updateGlobalData } = useAuth();
    const { toast } = useToast();

    const [stats, setStats] = useState<DashboardStats>({
        activeMentees: 0,
        totalSessions: 0,
        hoursGuided: 0,
        completionRate: 0,
    });
    const [upcomingSessions, setUpcomingSessions] = useState<DashboardSession[]>([]);
    const [menteeProgress, setMenteeProgress] = useState({ 
        mentorName: 'Unassigned Mentor', 
        nextSession: 'None Scheduled', 
        taskProgress: 0,
        total_sessions_attended: 0,
        mentor_id: null as string | null
    });

    const [loadingStates, setLoadingStates] = useState<LoadingStates>({
        stats: true,
        sessions: true,
        mentees: true,
        activity: true,
        requests: true,
        auth: true,
    });

    // Failsafe: max 10 seconds - matches AuthContext timeout
    useEffect(() => {
        if (!loadingStates.auth) return;
        const timeout = setTimeout(() => {
            logger.warn("DashboardPage", "Failsafe: Auth resolution took too long, forcing resolution.");
            setLoadingStates(prev => ({ ...prev, auth: false }));
        }, CONFIG.TIMEOUTS.AUTH_RESOLUTION);
        return () => clearTimeout(timeout);
    }, [loadingStates.auth]);

    const [activeMentees, setActiveMentees] = useState<DashboardMentee[]>((globalData.mentees as DashboardMentee[]) || []);
    const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);

    // Determine initial stats from global cache if available
    useEffect(() => {
        if (globalData.mentees.length > 0 && profile?.role === 'mentor') {
            setActiveMentees(globalData.mentees as DashboardMentee[]);
            setLoadingStates(prev => ({ ...prev, mentees: false }));
        }
    }, [globalData.mentees, profile?.role]);

    // State for pending mentor requests (for mentees)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isProcessingRequest, setIsProcessingRequest] = useState(false);
    const [resolutionAttempt, setResolutionAttempt] = useState(0);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isStuck, setIsStuck] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Track if we are stuck in "Resolving Identity"
    useEffect(() => {
        if (!authLoading && !profile?.role && !user?.user_metadata?.role) {
            const timer = setTimeout(() => setIsStuck(true), 5000);
            return () => clearTimeout(timer);
        } else {
            setIsStuck(false);
        }
    }, [authLoading, profile?.role, user?.user_metadata?.role, resolutionAttempt]);

    // Fetch dashboard data
    useEffect(() => {
        async function fetchDashboardData() {
            // EAGER FETCHING: Use user.id from session even if profile isn't verified yet
            const userId = profile?.id || user?.id;

            if (!userId) {
                // Only block if we truly have no identity
                if (!authLoading) setLoadingStates(prev => ({ ...prev, auth: false }));
                return;
            }

            try {
                // Determine effective role from profile (preferred) or metadata/localStorage fallback
                let effectiveRole = profile?.role || (user?.user_metadata?.role as string);
                if (!effectiveRole && typeof window !== 'undefined') {
                    const cachedProfile = localStorage.getItem(`nexus_profile_${userId}`);
                    if (cachedProfile) effectiveRole = JSON.parse(cachedProfile).role;
                }

                // SECURITY HARDENING
                if (!effectiveRole) {
                    setLoadingStates(prev => ({ ...prev, auth: false }));
                    return;
                }

                // ZERO-LATENCY STRATEGY:
                // If we have cached data, resolve the primary "blocking" loading state immediately.
                if (globalData.mentees.length > 0) setLoadingStates(prev => ({ ...prev, mentees: false }));
                if (upcomingSessions.length > 0) setLoadingStates(prev => ({ ...prev, sessions: false }));
                if (stats.totalSessions > 0) setLoadingStates(prev => ({ ...prev, stats: false }));

                setLoadingStates(prev => ({ ...prev, auth: false })); // Auth resolved, now fetching specific data

                if (effectiveRole === 'mentor') {
                    // ... (rest of mentor fetch logic)
                    // 1. Fetch mentor stats and sessions in parallel
                    const [
                        { data: menteesWithProfiles },
                        { data: sessions },
                        { data: upcoming },
                        { data: assignments }
                    ] = await Promise.all([
                        supabase.from('mentees')
                            .select('id, profiles:profiles!fk_mentee_profile(id, full_name, role, student_id), career_goals')
                            .eq('assigned_mentor_id', userId),
                        supabase.from('sessions')
                            .select('*')
                            .eq('mentor_id', userId),
                        supabase.from('sessions')
                            .select('*, mentee:profiles!mentee_id(full_name)')
                            .eq('mentor_id', userId)
                            .eq('status', 'scheduled')
                            .gte('scheduled_at', new Date().toISOString())
                            .order('scheduled_at', { ascending: true })
                            .limit(20),
                        supabase.from('assignments')
                            .select('id, status, created_at, title, mentee_id')
                            .eq('mentor_id', userId)
                    ]);

                    const completedCount = sessions?.filter(s => s.status === 'completed').length || 0;
                    const totalCount = sessions?.length || 0;

                    setStats({
                        activeMentees: menteesWithProfiles?.length || 0,
                        totalSessions: totalCount,
                        hoursGuided: Math.round((sessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0) / 60) || 0,
                        completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
                    });

                    // 2. Synthesize mentee details and activity feed
                    if (menteesWithProfiles && menteesWithProfiles.length > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const menteeStats = menteesWithProfiles.map((m: any) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const p = m.profiles as any;
                            // assignments.mentee_id references profiles.id (profile UUID), not the mentees table PK
                            const profileId = p?.id;
                            const mAssignments = assignments?.filter(a => a.mentee_id === profileId) || [];
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const completed = mAssignments.filter((a: any) => ['submitted', 'reviewed'].includes(a.status)).length;
                            const progress = mAssignments.length > 0 ? Math.round((completed / mAssignments.length) * 100) : 0;
                            const name = p?.full_name || (p?.email ? p.email.split('@')[0] : 'Mentee');
                            return {
                                id: profileId || m.id, // Use profile UUID as primary id for cross-page cache compatibility
                                profile_id: profileId, // Explicit alias used by tasks page to assign correctly
                                name,
                                student_id: p?.student_id || "",
                                initials: getInitials(name),
                                progress: progress
                            };
                        });
                        setActiveMentees(menteeStats);

                        // Update global cache
                        if (menteeStats.length > 0) {
                            updateGlobalData('mentees', menteeStats);
                        }

                        // 3. Synthesize Activity Feed
                        const activities: DashboardActivity[] = [];
                        if (assignments && assignments.length > 0) {
                            const sortedAssignments = [...assignments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                            sortedAssignments.slice(0, 3).forEach(a => {
                                // BUG-06 FIX: menteesWithProfiles rows have m.id = mentees table pk,
                                // but assignments.mentee_id = profiles.id (auth user id).
                                // Must match via the nested profiles.id field (p?.id).
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const mName = (menteesWithProfiles.find((m: any) => (m.profiles as any)?.id === a.mentee_id)?.profiles as any)?.full_name || 'Mentee';
                                activities.push({
                                    id: `task-${a.mentee_id}-${a.created_at}`,
                                    text: `You assigned a new task "${a.title}" to `,
                                    bold: mName,
                                    type: 'task',
                                    time: a.created_at
                                });
                            });
                        }
                        if (sessions) {
                            sessions.filter(s => s.status === 'completed').sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()).slice(0, 2).forEach(s => {
                                // BUG-06 FIX: Same as above — use profiles.id not mentees row id
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const mName = (menteesWithProfiles.find((m: any) => (m.profiles as any)?.id === s.mentee_id)?.profiles as any)?.full_name || 'Mentee';
                                activities.push({
                                    id: `session-${s.id}`,
                                    text: `Session completed with `,
                                    bold: mName,
                                    type: 'session',
                                    time: s.scheduled_at
                                });
                            });
                        }
                        setRecentActivity(activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 4));
                    }

                    // Map upcoming sessions to nested structure and group them by batch_id
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const upcomingMap = new Map<string, any>();
                    upcoming?.forEach((s: any) => {
                        if (!s) return;
                        const isGroup = !!s.batch_id || s.session_type === 'group' || !s.mentee_id;
                        const key = s.batch_id || s.id;
                        if (!upcomingMap.has(key)) {
                            upcomingMap.set(key, {
                                ...s,
                                mentees: { profiles: isGroup ? { full_name: 'Group Session' } : (s.mentee || { full_name: 'Mentee' }) },
                                groupCount: 1
                            });
                        } else {
                            const entry = upcomingMap.get(key);
                            if (entry) {
                                entry.groupCount += 1;
                                if (entry.mentees?.profiles) {
                                    entry.mentees.profiles.full_name = `Group Session (${entry.groupCount} Mentees)`;
                                }
                            }
                        }
                    });
                    
                    setUpcomingSessions(Array.from(upcomingMap.values()).slice(0, 5));

                    updateGlobalData('dashboard', []);

                } else if (effectiveRole === 'mentee') {
                    logger.info("DashboardPage", `Mentees fetch: Role=mentee, UserId=${userId}`);

                    const [
                        { data: requests, error: requestsError },
                        { data: menteeRecordRaw },
                        { data: sessions },
                        { data: assignments }
                    ] = await Promise.all([
                        supabase.from('mentor_requests').select('*, mentor:profiles!mentor_id(full_name, expertise)').eq('mentee_id', userId).ilike('status', 'pending'),
                        supabase.from('mentees').select('assigned_mentor_id, total_sessions_attended').eq('id', userId).maybeSingle(),
                        supabase.from('sessions').select('*').eq('mentee_id', userId).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(1),
                        supabase.from('assignments').select('status').eq('mentee_id', userId)
                    ]);

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const menteeRecord = menteeRecordRaw as any;
                    if (menteeRecord?.assigned_mentor_id) {
                        try {
                            const { data: mentorProfile } = await supabase
                                .from('profiles')
                                .select('full_name')
                                .eq('id', menteeRecord.assigned_mentor_id)
                                .single();
                            if (mentorProfile) {
                                menteeRecord.mentor = mentorProfile;
                            }
                        } catch (e) {
                            logger.warn("DashboardPage", "Mentor profile fetch failed", e);
                        }
                    }

                    if (requestsError) {
                        logger.error("DashboardPage", "Error fetching requests", requestsError);
                    }

                    let effectiveRequests = requests || [];

                    // BUG-04 FIX: Invalid PostgREST join filter. Resolve mentee's profile ID
                    // from email first, then query mentor_requests by mentee_id directly.
                    if (effectiveRequests.length === 0 && user?.email) {
                        logger.warn("DashboardPage", `No requests for ID ${userId}, trying rescue fetch by email ${user.email}`);
                        const { data: profileRow } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('email', user.email)
                            .maybeSingle();

                        if (profileRow?.id && profileRow.id !== userId) {
                            const { data: rescueRequests, error: rescueError } = await supabase
                                .from('mentor_requests')
                                .select('*, mentor:profiles!mentor_id(full_name, expertise)')
                                .eq('mentee_id', profileRow.id)
                                .ilike('status', 'pending');

                            if (rescueError) {
                                logger.error("DashboardPage", "Rescue fetch error", rescueError);
                            }

                            if (rescueRequests && rescueRequests.length > 0) {
                                logger.info("DashboardPage", `Rescue found ${rescueRequests.length} requests by email.`);
                                effectiveRequests = rescueRequests;
                            }
                        }
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    logger.info("DashboardPage", `Mentee Data Resolved: RequestsCount=${effectiveRequests.length}, Mentor=${(menteeRecord as any)?.mentor?.full_name || 'None'}`);

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mentorName = (menteeRecord as any)?.mentor?.full_name || 'Unassigned';

                    setPendingRequests(effectiveRequests);

                    let nextSessionText = 'No upcoming sessions';
                    if (sessions && sessions.length > 0) {
                        nextSessionText = formatDate(sessions[0].scheduled_at);
                    }

                    let completionRatio = 0;
                    if (assignments && assignments.length > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const completed = assignments.filter((a: any) => ['submitted', 'reviewed'].includes(a.status)).length;
                        completionRatio = Math.round((completed / assignments.length) * 100);
                    }

                    setMenteeProgress({
                        mentorName: mentorName,
                        nextSession: nextSessionText,
                        taskProgress: completionRatio,
                        total_sessions_attended: menteeRecord?.total_sessions_attended || 0,
                        mentor_id: menteeRecord?.assigned_mentor_id || null
                    });
                }
            } catch (error) {
                logger.error("DashboardPage", "Error fetching dashboard data", error);
            } finally {
                setLoadingStates(prev => ({ ...prev, auth: false, stats: false, sessions: false, mentees: false, activity: false, requests: false }));
            }
        }

        fetchDashboardData();

        // ðŸŸ¢ FULL-APP REAL-TIME SYNC
        const userId = profile?.id || user?.id;
        if (!userId) return;

        logger.info("DashboardPage", "Setting up global real-time listeners...");
        
        const channel = supabase
            .channel('dashboard-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'mentor_requests', filter: `mentee_id=eq.${userId}` },
                () => {
                    logger.debug("DashboardPage", "Mentor request changed, refreshing...");
                    fetchDashboardData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sessions' }, // Filter by mentor_id/mentee_id in production if possible
                () => {
                    logger.debug("DashboardPage", "Sessions changed, refreshing stats...");
                    fetchDashboardData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'assignments' },
                () => {
                    logger.debug("DashboardPage", "Assignments changed, refreshing stats...");
                    fetchDashboardData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id, profile?.role, refreshTrigger]); // BUG-22 FIX: Use stable primitives, not the profile object

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAcceptRequest = async (request: any) => {
        if (!request || !profile) return;
        setIsProcessingRequest(true);
        try {
            const acceptPromise = (async () => {
                // 1. Update request status
                logger.info("DashboardPage", "Step 1: Updating request status...");
                const { error: reqError } = await supabase
                    .from('mentor_requests')
                    .update({ status: 'accepted', updated_at: new Date().toISOString() })
                    .eq('id', request.id);

                if (reqError) {
                    logger.error("DashboardPage", "Failed to update request status", reqError);
                    throw new Error(`Request update failed: ${reqError.message}`);
                }
                
                // 2. EXTRA-SAFETY: Manually update/create the mentee record too in case triggers are missing
                // This ensures the alignment between mentees table and requests table is robust.
                logger.info("DashboardPage", "Step 2: Explicitly assigning mentor to mentee record...");
                const { error: menteeError } = await supabase
                    .from('mentees')
                    .upsert({ 
                        id: request.mentee_id,
                        assigned_mentor_id: request.mentor_id,
                        assignment_date: new Date().toISOString(),
                        updated_at: new Date().toISOString() 
                    });
                
                if (menteeError) {
                    logger.warn("DashboardPage", "Manual mentee assignment upsert failed, but request was accepted.", menteeError);
                }

                logger.info("DashboardPage", "Acceptance steps completed! Server-side triggers may also run in parallel.");


                // 3. Automatically decline other pending requests (background)
                const otherRequests = pendingRequests.filter(r => r.id !== request.id);
                if (otherRequests.length > 0) {
                    supabase
                        .from('mentor_requests')
                        .update({
                            status: 'rejected',
                            rejection_reason: 'Accepted another mentor request.',
                            updated_at: new Date().toISOString()
                        })
                        .in('id', otherRequests.map(r => r.id))
                        .then(() => { });
                }

                // 4. Notify the mentor: Handled by 'on_mentor_request_accepted' trigger.
            })();


            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), 8000)
            );

            await Promise.race([acceptPromise, timeoutPromise]);

            toast(`You are now connected with ${request.mentor?.full_name}!`, "success");
            setPendingRequests(prev => prev.filter(r => r.id !== request.id));

            // BUG-25 FIX: trigger a data re-fetch instead of a full page reload
            setRefreshTrigger(prev => prev + 1);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            logger.error("DashboardPage", "Accept request failed", err);
            if (err.message === 'TIMEOUT') {
                toast("Connection is taking too long. Please refresh.", "error");
            } else {
                toast("Failed to accept request. Please try again.", "error");
            }
        } finally {
            setIsProcessingRequest(false);
        }
    };

    const handleRejectRequest = async () => {
        if (!selectedRequest || !rejectionReason.trim()) return;
        setIsProcessingRequest(true);
        try {
            await supabase
                .from('mentor_requests')
                .update({
                    status: 'rejected',
                    rejection_reason: rejectionReason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedRequest.id);

            toast("Request declined.", "info");

            // BUG-11 FIX: Guard against null mentor_id before inserting the notification
            if (selectedRequest.mentor_id) {
                await supabase.from('notifications').insert({
                    recipient_id: selectedRequest.mentor_id,
                    type: 'request',
                    title: 'Connection Declined',
                    content: `${profile?.full_name || 'A mentee'} declined your request. Reason: ${rejectionReason}`,
                    link: '/dashboard',
                    is_read: false
                });
            }

            setPendingRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
            setSelectedRequest(null);
            setShowRejectionModal(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        } catch (err: any) {
            toast("Failed to decline request.", "error");
        } finally {
            setIsProcessingRequest(false);
        }
    };

    // ZERO-LATENCY UI: Only show blocking skeleton if we have literally NO data to show
    const effectiveRole = profile?.role ||
        (user?.user_metadata?.role as string) ||
        (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(`nexus_profile_${user?.id}`) || '{}').role : null);

    const isBlocking = !mounted || (authLoading && !effectiveRole);

    // SECURITY BRANCH: If we have no role yet but aren't blocking, we must show a neutral "Resolving" state
    // rather than defaulting to the Mentor view. 
    if (!isBlocking && !effectiveRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="text-center space-y-8 max-w-sm animate-in fade-in zoom-in duration-500">
                    {/* BUG-4 FIX: Spinner rings need a relative parent so their absolute positioning works correctly */}
                    <div className="relative inline-block w-20 h-20 mx-auto">
                        <div className="absolute inset-2 border-2 border-primary/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Clock className="w-8 h-8 text-primary/40" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Resolving Identity</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                            {isStuck ? "This is taking longer than expected. Most likely your profile is still being synchronized." : "Please wait while we secure your session and prepare your dashboard..."}
                        </p>
                    </div>

                    {isStuck && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800"
                        >
                            <button
                                onClick={async () => {
                                    setResolutionAttempt(prev => prev + 1);
                                    if (!user) return;
                                    try {
                                        toast("Attempting to provision account records...", "info");
                                        const meta = user.user_metadata || {};
                                        // Use upsert to create/fix profile and mentee record
                                        const { error: pErr } = await supabase.from("profiles").upsert({
                                            id: user.id,
                                            email: user.email,
                                            full_name: meta.full_name || meta.name || "User",
                                            role: meta.role || "mentee",
                                            student_id: meta.student_id || user.email?.split('@')[0].toUpperCase(),
                                            semester: meta.semester,
                                            section: meta.section,
                                            updated_at: new Date().toISOString()
                                        });
                                        if (pErr) throw pErr;

                                        if (meta.role === 'mentee' || !meta.role) {
                                            const { error: mErr } = await supabase.from("mentees").upsert({
                                                id: user.id,
                                                father_name: meta.father_name || "",
                                                mother_name: meta.mother_name || "",
                                                father_mobile: meta.father_mobile || "",
                                                mother_mobile: meta.mother_mobile || "",
                                                updated_at: new Date().toISOString()
                                            });
                                            if (mErr) throw mErr;
                                        }
                                        
                                        toast("Profile synchronized! Refreshing...", "success");
                                        setTimeout(() => window.location.reload(), 1500);
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    } catch (err: any) {
                                        logger.error("DashboardPage", "Manual sync failed", err);
                                        toast("Sync failed. You may need to run the repair SQL script.", "error");
                                    }
                                }}
                                className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all"
                            >
                                Sync & Fix My Profile
                            </button>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Or</p>
                            <button
                                onClick={() => {
                                    // BUG-10 FIX: Only clear NEXUS and Supabase keys, not all localStorage
                                    const keys = Object.keys(localStorage);
                                    keys.forEach(k => {
                                        if (k.startsWith('sb-') || k.startsWith('nexus_')) {
                                            localStorage.removeItem(k);
                                        }
                                    });
                                    supabase.auth.signOut().then(() => window.location.replace("/"));
                                }}
                                className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                Sign Out & Try Again
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        );
    }

    if (isBlocking) {
        // ... (existing loading skeleton remains same)
        return (
            <div className="space-y-10 animate-in fade-in duration-500 w-full pb-12">
                <div className="space-y-3">
                    <div className="h-10 w-72 bg-slate-200 dark:bg-slate-800 rounded-2xl shimmer-skeleton"></div>
                    <div className="h-5 w-full max-w-sm bg-slate-100 dark:bg-slate-800/60 rounded-xl shimmer-skeleton"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shimmer-skeleton"></div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="h-7 w-48 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl shimmer-skeleton"></div>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shimmer-skeleton"></div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="h-7 w-32 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl shimmer-skeleton"></div>
                        <div className="h-[420px] bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shimmer-skeleton"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Role-based Layouts
    if (profile?.role === 'mentee') {
        return (
            <MenteeDashboard
                profile={profile}
                user={user}
                pendingRequests={pendingRequests}
                menteeProgress={menteeProgress}
                dataLoading={loadingStates.auth}
                handleAcceptRequest={handleAcceptRequest}
                handleRejectRequest={handleRejectRequest}
                setShowRejectionModal={setShowRejectionModal}
                setSelectedRequest={setSelectedRequest}
                rejectionReason={rejectionReason}
                setRejectionReason={setRejectionReason}
                showRejectionModal={showRejectionModal}
                selectedRequest={selectedRequest}
                isProcessingRequest={isProcessingRequest}
                toast={toast}
            />
        );
    }

    if (effectiveRole === 'mentor') {
        return (
            <MentorDashboard
                profile={profile}
                user={user}
                stats={stats}
                upcomingSessions={upcomingSessions}
                activeMentees={activeMentees}
                recentActivity={recentActivity}
                dataLoading={loadingStates.auth}
                router={router}
                statsConfig={[
                    { key: "activeMentees", label: "Active Mentees", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
                    { key: "totalSessions", label: "Total Sessions", icon: Calendar, color: "text-purple-600", bg: "bg-purple-100" },
                    { key: "completionRate", label: "Completion Rate", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
                ]}
            />
        );
    }


    // FINAL FALLBACK: If we're not mentor and not mentee (or if somehow we reached here),
    // show a safe descriptive message or the student view.
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-700">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
            <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Connecting...</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Finalizing your dashboard settings...</p>
            </div>
        </div>
    );
}

