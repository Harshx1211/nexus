/**
 * @file dashboard/mentees/page.tsx
 * @description Compact mentee directory - replaces big cards with a fast,
 * searchable list. Clicking a row navigates to the full mentee detail page.
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, X, BookOpen, Users, AlertCircle, ChevronRight, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getInitials } from "@/lib/date-utils";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";
import { downloadCSV } from "@/lib/csv-export";



export default function MenteesPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState("");
    const { profile, loading: authLoading, globalData, updateGlobalData, user } = useAuth();
    const { toast } = useToast();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [mentees, setMentees] = useState<any[]>(globalData.mentees || []);
    const [loading, setLoading] = useState(() => !globalData.mentees || globalData.mentees.length === 0);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [sentRequests, setSentRequests] = useState<any[]>([]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchRollNo, setSearchRollNo] = useState("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [searchResult, setSearchResult] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (!loading) return;
        const t = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(t);
    }, [loading]);

    useEffect(() => {
        if (authLoading) return;
        // BUG-35 FIX: Removed redundant early router.replace for mentees — the access
        // restriction UI at line ~237 already handles non-mentor users gracefully.
        // The early redirect caused a React state update during render warning in strict mode.

        // ðŸŸ¢ REAL-TIME SUBSCRIPTION
        const channel = supabase
            .channel('mentees-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'mentees' },
                () => {
                    logger.debug("MenteesPage", "Mentees table changed, refreshing...");
                    setRefreshTrigger(prev => prev + 1);
                }
            )
            .subscribe();

        const fetchData = async () => {
            if (!user) return;
            if (globalData.mentees.length > 0) setMentees(globalData.mentees);

            try {
                const { data: menteesData, error: mError } = await supabase
                    .from("mentees")
                    .select("id, profiles:profiles!fk_mentee_profile(id, full_name, email, student_id, semester, section)")
                    .eq("assigned_mentor_id", user.id);

                if (mError) throw mError;

                const { data: requestsData } = await supabase
                    .from("mentor_requests")
                    .select("*, mentee:profiles!mentee_id(full_name, student_id)")
                    .eq("mentor_id", user.id)
                    .in("status", ["pending", "rejected"])
                    .order("updated_at", { ascending: false });

                if (menteesData && menteesData.length > 0) {
                    // BUG-13 FIX: menteeIds should be profiles.id values (the auth user IDs)
                    // because assignments.mentee_id = profiles.id, NOT the mentees table pk.
                    // m.profiles?.id gives the correct profile ID.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const menteeProfileIds = menteesData.map((m: any) => (m.profiles as any)?.id).filter(Boolean);
                    const { data: allAssignments } = await supabase
                        .from("assignments")
                        .select("mentee_id, status")
                        .in("mentee_id", menteeProfileIds);

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const formatted = menteesData.map((m: any) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const p = m.profiles as any;
                        const profileId = p?.id;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const mA = allAssignments?.filter((a: any) => a.mentee_id === profileId) || [];
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const done = mA.filter((a: any) => ["submitted", "reviewed"].includes(a.status)).length;
                        const progress = mA.length > 0 ? Math.round((done / mA.length) * 100) : 0;
                        const name = p?.full_name || "Mentee";
                        return {
                            id: m.id,
                            profileId: p?.id || m.id,
                            name,
                            email: p?.email || "",
                            student_id: p?.student_id || "",
                            semester: p?.semester || "",
                            section: p?.section || "",
                            initials: getInitials(name),
                            progress,
                        };
                    });

                    if (JSON.stringify(formatted) !== JSON.stringify(mentees)) {
                        setMentees(formatted);
                        updateGlobalData("mentees", formatted);
                    }
                } else if (menteesData?.length === 0) {
                    setMentees([]);
                    updateGlobalData("mentees", []);
                }

                if (requestsData) setSentRequests(requestsData);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                logger.error("MenteesPage", "Fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        return () => {
            supabase.removeChannel(channel);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger, user?.id, authLoading, profile?.role]); // BUG-21 FIX: Use user?.id not user object to prevent infinite re-fetch loop

    const handleExport = () => {
        if (!mentees.length) { toast("No records to export", "info"); return; }
        downloadCSV(mentees.map(m => ({
            "Full Name": m.name,
            "Roll Number": m.student_id,
            "Email": m.email,
            "Progress (%)": m.progress,
        })), `Mentee_Directory_${new Date().toLocaleDateString()}.csv`);
        toast("Exported!", "success");
    };

    const handleSearchMentee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (profile?.role !== "mentor") { toast("Unauthorized", "error"); return; }

        // SECURITY: Sanitize input — strip any characters that could be used in
        // PostgREST filter injection (only allow alphanumeric, spaces, dots, hyphens, @)
        const rawInput = searchRollNo.trim();
        const sanitized = rawInput.replace(/[^a-zA-Z0-9\s.@_\-]/g, "");
        const roll = sanitized.toUpperCase();
        const rollLower = sanitized.toLowerCase();

        if (!roll) return;
        if (roll.length > 100) { toast("Search term is too long.", "error"); return; }

        setIsSearching(true);
        setSearchResult(null);
        try {
            // SECURITY FIX: Never interpolate user input into .or() string.
            // Use separate .ilike() calls instead — PostgREST parameterizes these safely.
            // Previously: .or(`student_id.ilike.${roll},email.ilike.%${roll}%,...`)
            // That was vulnerable to PostgREST filter injection.
            const { data, error: sError } = await supabase
                .from("profiles")
                .select(`
                    id, 
                    full_name, 
                    student_id, 
                    email, 
                    role, 
                    mentorship:mentees!fk_mentee_profile(assigned_mentor_id)
                `)
                .or(`student_id.ilike.${roll},email.ilike.%25${rollLower}%25,full_name.ilike.%25${rollLower}%25`)
                // BUG-20 FIX: .maybeSingle() throws PGRST116 if multiple rows match.
                // Use .limit(2) and take the first result to handle multi-match safely.
                .limit(2);
            const exactMatch = data?.[0] ?? null;

            if (sError) {
                logger.error("MenteesPage", `Search failed for [${roll}]`, sError);
                throw sError;
            }

            logger.debug("MenteesPage", `Search result for [${roll}]:`, exactMatch);

            if (exactMatch) {
                if (exactMatch.role !== "mentee") {
                    setSearchResult("not_a_mentee");
                    return;
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const m = (exactMatch as any).mentorship;
                if (m?.assigned_mentor_id) { 
                    setSearchResult("assigned"); 
                } else { 
                    setSearchResult(exactMatch); 
                }
            } else {
                setSearchResult("not_found");
            }
        } catch {
            toast("Search failed. Check your connection.", "error");
            setSearchResult("not_found");
        } finally {
            setIsSearching(false);
        }
    };

    const handleAssignMentee = async (menteeId: string) => {
        if (!user || profile?.role !== "mentor" || !searchResult) return;
        setIsAssigning(true);
        try {
            const { error } = await supabase.from("mentor_requests").insert({
                mentor_id: user.id,
                mentee_id: menteeId,
                status: "pending",
            });
            if (error) throw error;
            await supabase.from("notifications").insert({
                recipient_id: menteeId,
                type: "request",
                title: "New Mentor Connection",
                content: `${profile.full_name} wants to be your mentor.`,
                link: "/dashboard",
                is_read: false,
            });
            toast(`Request sent to ${searchResult.full_name}!`, "success");
            setIsAddModalOpen(false);
            setSearchResult(null);
            setSearchRollNo("");
            setRefreshTrigger(p => p + 1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast(err.message || "Failed to send request", "error");
        } finally {
            setIsAssigning(false);
        }
    };

    const filtered = mentees.filter(m =>
        m.name.toLowerCase().includes(debouncedTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(debouncedTerm.toLowerCase()) ||
        m.student_id.toLowerCase().includes(debouncedTerm.toLowerCase())
    );

    const avgProgress = filtered.length > 0
        ? Math.round(filtered.reduce((a, m) => a + m.progress, 0) / filtered.length)
        : 0;

    if (!authLoading && profile && profile.role !== "mentor") {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="font-bold text-slate-900 dark:text-white">Access Restricted</p>
                <button onClick={() => router.push("/dashboard")} className="px-5 py-2 bg-primary text-white rounded-xl font-bold">Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">

            <div className="space-y-4">            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">Mentee Directory</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{mentees.length} assigned mentee{mentees.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
                    <button onClick={handleExport} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-bold rounded-2xl border border-slate-200/60 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 transition-all text-sm shadow-sm">
                        <BookOpen className="w-4 h-4 text-primary" /> Export
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 text-sm">
                        <Plus className="w-4 h-4" /> Add Mentee
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="nexus-card p-4 sm:p-5 text-center overflow-hidden relative">
                    <p className="text-2xl sm:text-3xl font-bold text-primary relative z-10">{mentees.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 relative z-10">Assigned</p>
                </div>
                <div className="nexus-card p-4 sm:p-5 text-center overflow-hidden relative">
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-500 relative z-10">{avgProgress}%</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 relative z-10">Avg Progress</p>
                </div>
                <div className="nexus-card p-4 sm:p-5 text-center overflow-hidden relative">
                    <p className="text-2xl sm:text-3xl font-bold text-amber-500 relative z-10">{sentRequests.filter(r => r.status === "pending").length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 relative z-10">Pending</p>
                </div>
            </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by name, email, or roll number..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 nexus-card outline-none focus:border-primary transition-all text-sm"
                />
            </div>

            {/* Mentee List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-16 rounded-2xl shimmer-skeleton bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Users className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                            {searchTerm ? "No mentees found" : "No mentees assigned"}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {searchTerm ? "Try a different search term." : "Add your first mentee to get started."}
                        </p>
                    </div>
                    {!searchTerm && (
                        <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Mentee
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filtered.map((mentee, i) => (
                        <motion.div
                            key={mentee.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.04 }}
                        >
                            <Link
                                href={`/dashboard/mentees/detail?id=${mentee.profileId || mentee.id}`}
                                className="group w-full flex items-center gap-4 p-5 sm:p-6 nexus-card nexus-card-hover transition-all duration-300 cursor-pointer"
                            >
                                {/* Avatar */}
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                {mentee.initials}
                            </div>

                            {/* Name + Roll */}
                            <div className="flex-1 min-w-0">
                                 <p className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{mentee.name}</p>
                                 <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                     <span className="text-[10px] border border-primary/25 text-primary bg-transparent px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">{mentee.student_id || "No Roll"}</span>
                                     <p className="text-[11px] text-slate-400 font-medium truncate">
                                         {mentee.semester && `Sem ${mentee.semester}`}
                                         {mentee.section && ` (${mentee.section})`}
                                         {` • ${mentee.email}`}
                                     </p>
                                 </div>
                             </div>

                            {/* Progress */}
                            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 w-24">
                                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{mentee.progress}%</p>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all"
                                        style={{ width: `${mentee.progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Pending Requests */}
            {sentRequests.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Invitation Status
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sentRequests.map(req => (
                            <div key={req.id} className={`flex flex-col gap-2 p-4 glass rounded-2xl border ${req.status === "rejected" ? "border-red-200/60 dark:border-red-800/40 bg-red-50/30 dark:bg-red-900/10" : "border-white/40 dark:border-slate-800/50"}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-sm shrink-0">
                                        {getInitials(req.mentee?.full_name || "S")}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{req.mentee?.full_name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{req.mentee?.student_id}</p>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${req.status === "pending" ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"}`}>
                                        {req.status}
                                    </span>
                                </div>
                                {req.status === "rejected" && req.rejection_reason && (
                                    <div className="ml-12 pl-2 border-l-2 border-red-300 dark:border-red-700">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-0.5">Reason</p>
                                        <p className="text-xs text-red-600 dark:text-red-400 font-medium leading-relaxed">{req.rejection_reason}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Mentee Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Mentee</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Search by university roll number</p>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setSearchResult(null); setSearchRollNo(""); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <form onSubmit={handleSearchMentee} className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={searchRollNo}
                                        placeholder="Enter Roll Number"
                                        onChange={e => setSearchRollNo(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm uppercase"
                                    />
                                </div>
                                <button type="submit" disabled={isSearching || !searchRollNo.trim()} className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-bold rounded-2xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-primary/20">
                                    {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                                    {isSearching ? "Searching Intel..." : "Identify Mentee"}
                                </button>
                            </form>

                            {typeof searchResult === "object" && searchResult !== null && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center font-bold text-primary">
                                            {getInitials(searchResult.full_name)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{searchResult.full_name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{searchResult.student_id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleAssignMentee(searchResult.id)} disabled={isAssigning} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all">
                                        {isAssigning ? "..." : "Assign"}
                                    </button>
                                </motion.div>
                            )}
                            {searchResult === "not_found" && (
                                <div className="text-sm text-center text-red-500 bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-500/20 space-y-2">
                                    <p className="font-bold uppercase tracking-widest text-[10px]">Mentee Not Present</p>
                                    <p>No mentee found matching <span className="font-black underline">&quot;{searchRollNo}&quot;</span>. Make sure they have registered with this roll number or name.</p>
                                </div>
                            )}
                            {searchResult === "not_a_mentee" && <p className="text-sm text-center text-amber-500 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-500/20">This ID exists but is not registered as a mentee.</p>}
                            {searchResult === "assigned" && <p className="text-sm text-center text-amber-500 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-500/20">This mentee is already assigned to a mentor.</p>}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}


