/**
 * @file dashboard/announcements/page.tsx
 * @description Announcements page.
 * Mentors can post broadcast messages to all their mentees.
 * Mentees can view announcements from their assigned mentor and mark them as read.
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Plus, X, Send, CheckCircle2, Clock, Trash2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";
import { groupItemsByDate } from "@/lib/date-utils";

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function AnnouncementsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const { toast, confirm } = useToast();

    const isMentor = profile?.role === "mentor" || user?.user_metadata?.role === "mentor";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const [menteeCount, setMenteeCount] = useState(0);

    const [form, setForm] = useState({ title: "", content: "" });

    // Failsafe
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 10000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!user?.id || authLoading) return;
        fetchAll();

        // ðŸŸ¢ REAL-TIME SUBSCRIPTION
        // Link: https://supabase.com/docs/guides/realtime/subscriptions
        const channel = supabase
            .channel('announcements-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'announcements' },
                () => {
                    logger.debug("AnnouncementsPage", "Announcement table changed, refreshing...");
                    fetchAll();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'announcement_reads' },
                () => {
                    // Mentors see total read counts update live
                    if (isMentor) {
                        logger.debug("AnnouncementsPage", "Announcement reads changed, refreshing counts...");
                        fetchAll();
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    logger.info("AnnouncementsPage", "Real-time subscription active.");
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading, isMentor]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            if (isMentor) {
                // Mentor: fetch own announcements + read counts
                const { data, error } = await supabase
                    .from("announcements")
                    .select("*, reads:announcement_reads(count)")
                    .eq("mentor_id", user!.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setAnnouncements(data || []);

                // Get mentee count for display
                const { count } = await supabase
                    .from("mentees")
                    .select("id", { count: "exact", head: true })
                    .eq("assigned_mentor_id", user!.id);
                setMenteeCount(count || 0);

            } else {
                // Mentee: fetch announcements from assigned mentor
                const { data: menteeRow } = await supabase
                    .from("mentees")
                    .select("assigned_mentor_id")
                    .eq("id", user!.id)
                    .maybeSingle();

                if (!menteeRow?.assigned_mentor_id) {
                    setAnnouncements([]);
                    setLoading(false);
                    return;
                }

                const [announcementsRes, readsRes] = await Promise.all([
                    supabase
                        .from("announcements")
                        .select("*")
                        .eq("mentor_id", menteeRow.assigned_mentor_id)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("announcement_reads")
                        .select("announcement_id")
                        .eq("mentee_id", user!.id)
                ]);

                setAnnouncements(announcementsRes.data || []);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setReadIds(new Set((readsRes.data || []).map((r: any) => r.announcement_id)));
            }
        } catch (e) {
            logger.error("AnnouncementsPage", "Fetch error", e);
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) {
            toast("Please fill in both title and message.", "warning");
            return;
        }

        if (isMentor && menteeCount === 0) {
            const ok = await confirm({
                title: "No Mentees Assigned",
                message: "You currently have 0 assigned mentees. You can still post this announcement, but index-based notifications will only be sent to mentees who are officially assigned to you in the database. Continue?",
                confirmText: "Post Anyway",
                variant: "primary"
            });
            if (!ok) return;
        }

        setIsPosting(true);
        try {
            const { error } = await supabase.from("announcements").insert({
                mentor_id: user!.id,
                title: form.title.trim(),
                content: form.content.trim(),
            });
            if (error) throw error;

            // Explicit Manual Notification: Mentor -> All Assigned Mentees
            try {
                const { data: menteeRows } = await supabase
                    .from('mentees')
                    .select('id')
                    .eq('assigned_mentor_id', user!.id);
                
                if (menteeRows && menteeRows.length > 0) {
                    const notifications = menteeRows.map(m => ({
                        recipient_id: m.id,
                        type: 'announcement',
                        title: 'New Announcement',
                        content: `Your mentor posted: ${form.title.trim()}`,
                        link: '/dashboard/announcements',
                        is_read: false
                    }));
                    await supabase.from('notifications').insert(notifications);
                }
            } catch (notifyErr) {
                logger.warn("AnnouncementsPage", "Failed to send broadcast notifications", notifyErr);
            }

            toast("Announcement posted! Your mentees have been notified.", "success");
            setForm({ title: "", content: "" });
            setIsComposing(false);
            fetchAll();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            logger.error("AnnouncementsPage", "Post failure", e);
            toast(e.message || "Failed to post announcement. Check your connection.", "error");
        } finally {
            setIsPosting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: "Delete Announcement",
            message: "This will remove the announcement for all mentees. This cannot be undone.",
            confirmText: "Delete",
            variant: "danger",
        });
        if (!ok) return;
        try {
            const { error } = await supabase.from("announcements").delete().eq("id", id);
            if (error) throw error;
            toast("Announcement deleted.", "info");
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            toast(e.message || "Failed to delete.", "error");
        }
    };

    const handleMarkRead = async (announcementId: string) => {
        try {
            await supabase.from("announcement_reads").upsert({
                announcement_id: announcementId,
                mentee_id: user!.id,
            });
            setReadIds(prev => new Set([...prev, announcementId]));
        } catch (e) {
            logger.error("AnnouncementsPage", "Mark read failed", e);
        }
    };

    const isBlocking = authLoading && !profile?.role && !user?.user_metadata?.role;

    if (isBlocking) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">
                <div className="h-10 w-64 rounded-2xl shimmer-skeleton bg-slate-200 dark:bg-slate-800" />
                {[1, 2].map(i => <div key={i} className="h-32 rounded-2xl shimmer-skeleton bg-slate-100 dark:bg-slate-800/50" />)}
            </div>
        );
    }

    const unreadAnnouncements = announcements.filter(a => !readIds.has(a.id));
    const readAnnouncements = announcements.filter(a => readIds.has(a.id));

    return (
        <div className="relative min-h-[80vh] animate-in fade-in duration-700 pb-20 max-w-7xl mx-auto">
            {/* Background Decorative Blobs */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -z-10" />
            <div className="absolute top-1/2 -left-24 w-72 h-72 bg-blue-600/5 blur-[100px] rounded-full -z-10" />

            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            Announcements
                        </h1>
                        <span className="hidden sm:inline-block text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-xl font-bold uppercase tracking-widest border border-primary/20">Broadcast Center</span>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
                            {isMentor
                                ? menteeCount > 0 
                                    ? `Keep your ${menteeCount} mentees informed with real-time broadcast messages.`
                                    : "You have no assigned mentees yet. Once you accept a request, they will appear here."
                                : "Stay updated with important news and resources from your mentor."}
                        </p>
                    </div>

                    {isMentor && (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
                            <button
                                onClick={() => setIsComposing(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 text-sm group"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                New Announcement
                            </button>
                        </div>
                    )}
                </div>

                {/* Compose Modal */}
                <AnimatePresence>
                    {isComposing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-[0_32px_128px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20 dark:border-white/5"
                            >
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">New Announcement</h2>
                                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Broadcasting to {menteeCount} Mentees</p>
                                    </div>
                                    <button
                                        onClick={() => { setIsComposing(false); setForm({ title: "", content: "" }); }}
                                        className="p-3 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <form onSubmit={handlePost} className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Subject / Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.title}
                                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                            placeholder="e.g. Mid-semester progress review"
                                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Announcement Message</label>
                                        <textarea
                                            required
                                            rows={5}
                                            value={form.content}
                                            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                                            placeholder="Type your message here..."
                                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => { setIsComposing(false); setForm({ title: "", content: "" }); }}
                                            className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isPosting}
                                            className="flex-1 px-6 py-4 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-blue-700 shadow-xl shadow-primary/20 transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {isPosting ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Post to Group
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-44 rounded-2xl shimmer-skeleton bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5" />
                        ))}
                    </div>
                ) : announcements.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-16 px-6 text-center"
                    >
                        <div className="relative mb-10">
                            {/* Glow behind icon */}
                            <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full" />
                            
                            <div className="relative w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 border border-white/60 dark:border-slate-800/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-center group overflow-hidden" style={{ backdropFilter: 'blur(20px)' }}>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Megaphone className="w-14 h-14 text-slate-200 dark:text-slate-700 group-hover:text-primary group-hover:scale-110 transition-all duration-500 ease-out" />
                            </div>
                        </div>

                        <div className="max-w-md mx-auto space-y-3">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {isMentor ? "Broadcast to your mentees" : "No updates yet"}
                            </h3>
                            <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                {isMentor
                                    ? "Share important deadlines, resources, or meeting links with everyone in one click."
                                    : "Assignments, news, and resources from your mentor will appear here."}
                            </p>
                        </div>

                        {isMentor && (
                            <button
                                onClick={() => setIsComposing(true)}
                                className="mt-8 px-6 py-3.5 bg-primary text-white font-bold rounded-xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 group"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                Post First Announcement
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <div className="space-y-12">
                        {/* Mentee: Unread section */}
                        {!isMentor && unreadAnnouncements.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 ml-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Unread Messages</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {unreadAnnouncements.map((a, i) => (
                                        <AnnouncementCard
                                            key={a.id}
                                            announcement={a}
                                            isMentor={false}
                                            isRead={false}
                                            onMarkRead={() => handleMarkRead(a.id)}
                                            index={i}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mentor: all announcements grouped by date */}
                        {isMentor && (
                            <div className="space-y-8">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {Object.entries(groupItemsByDate(announcements, (a: any) => a.created_at)).map(([date, items]) => (
                                    <div key={date} className="space-y-4">
                                        <div className="flex items-center gap-4 px-2">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-full border border-slate-200/50 dark:border-white/5">
                                                {date}
                                            </span>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {items.map((a, i) => (
                                                <AnnouncementCard
                                                    key={a.id}
                                                    announcement={a}
                                                    isMentor={true}
                                                    isRead={true}
                                                    menteeCount={menteeCount}
                                                    onDelete={() => handleDelete(a.id)}
                                                    index={i}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Mentee: Read/archived section grouped by date */}
                        {!isMentor && readAnnouncements.length > 0 && (
                            <div className="space-y-8">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 ml-2">Previously Shared</p>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {Object.entries(groupItemsByDate(readAnnouncements, (a: any) => a.created_at)).map(([date, items]) => (
                                    <div key={date} className="space-y-4">
                                        <div className="flex items-center gap-4 px-2">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">
                                                {date}
                                            </span>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                                            {items.map((a, i) => (
                                                <AnnouncementCard
                                                    key={a.id}
                                                    announcement={a}
                                                    isMentor={false}
                                                    isRead={true}
                                                    index={i}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// â”€â”€ Announcement Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AnnouncementCard({
    announcement,
    isMentor,
    isRead,
    menteeCount,
    onMarkRead,
    onDelete,
    index
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    announcement: any;
    isMentor: boolean;
    isRead: boolean;
    menteeCount?: number;
    onMarkRead?: () => void;
    onDelete?: () => void;
    index: number;
}) {
    const readCount = announcement.reads?.[0]?.count ?? 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -12 }}
            transition={{ 
                duration: 0.4, 
                delay: index * 0.05,
                ease: [0.23, 1, 0.32, 1] 
            }}
            whileHover={{ y: -2 }}
            className={`group relative p-5 sm:p-6 backdrop-blur-md rounded-[24px] border transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 ${
                !isRead && !isMentor
                    ? "border-primary/40 bg-gradient-to-br from-primary/10 to-blue-500/5 dark:from-primary/20 dark:to-blue-600/10 shadow-md shadow-primary/5"
                    : "bg-white/60 dark:bg-slate-900/60 border-slate-200/50 dark:border-white/5 shadow-sm"
            }`}
        >
            {/* New Badge Glow */}
            {!isRead && !isMentor && (
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full blur-[4px] animate-pulse" />
            )}

            <div className="flex items-start gap-5">
                {/* Icon Column */}
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                        !isRead && !isMentor 
                            ? "bg-gradient-to-br from-primary to-blue-600 text-white shadow-primary/20" 
                            : "bg-slate-100 dark:bg-slate-800/50 text-slate-400 group-hover:text-primary transition-colors"
                    }`}>
                        <Megaphone className="w-5 h-5" />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight tracking-tight group-hover:text-primary transition-colors">
                                {announcement.title}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <Clock className="w-3 h-3" /> {timeAgo(announcement.created_at)}
                                </span>
                                {!isRead && !isMentor && (
                                    <span className="bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest animate-in zoom-in duration-300">
                                        New
                                    </span>
                                )}
                            </div>
                        </div>

                        {isMentor && (
                            <button
                                onClick={onDelete}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                            >
                                <Trash2 className="w-4.5 h-4.5" />
                            </button>
                        )}
                    </div>

                    <p className="text-[15px] text-slate-600 dark:text-slate-300 mt-4 leading-relaxed font-medium">
                        {announcement.content}
                    </p>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
                        {/* Mentor Stats / Mentee Read Status */}
                        {isMentor ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 transition-all group-hover:border-primary/10">
                                <Users className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                    Read by <span className="text-primary">{readCount}</span> / {menteeCount} Mentees
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {!isRead ? (
                                    <button
                                        onClick={onMarkRead}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold rounded-xl transition-all active:scale-95 group/btn"
                                    >
                                        <CheckCircle2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                        Got it - Mark as Read
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 text-emerald-500 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-emerald-500/10">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Read & Acknowledged
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Visual Ornament */}
                        <div className="hidden sm:flex items-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

