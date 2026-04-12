"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Clock, CheckCircle2, FileText,
    Download, X, Calendar, User,
    AlertCircle, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, groupItemsByDate } from "@/lib/date-utils";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";

export default function LeavesPage() {
    const { user, profile } = useAuth();
    const { toast, confirm, prompt } = useToast();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedLeave, setSelectedLeave] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
    const [docLoading, setDocLoading] = useState(false);

    const [newLeave, setNewLeave] = useState({
        startDate: "",
        endDate: "",
        reason: "",
        file: null as File | null,
    });

    useEffect(() => {
        if (user?.id && profile?.role) {
            fetchLeaves(user.id, profile.role);
        }
    }, [user?.id, profile?.role, refreshTrigger]);

    useEffect(() => {
        if (!user?.id || !profile?.role) return;
        const channel = supabase
            .channel("medical_leaves_realtime")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "medical_leaves",
                filter: profile.role === "mentee"
                    ? `mentee_id=eq.${user.id}`
                    : `mentor_id=eq.${user.id}`,
            }, () => setRefreshTrigger((p) => p + 1))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user?.id, profile?.role]);

    const fetchLeaves = async (userId: string, role: string) => {
        setLoading(true);
        try {
            let query = supabase.from("medical_leaves").select(
                "*, mentee:profiles!mentee_id(full_name, student_id, section, semester, department)"
            );
            if (role === "mentee") query = query.eq("mentee_id", userId);
            else query = query.eq("mentor_id", userId);
            const { data, error } = await query.order("created_at", { ascending: false });
            if (error) throw error;
            setLeaves(data || []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            logger.error("LeavesPage", "Error fetching leaves", err);
        } finally {
            setLoading(false);
        }
    };

    const loadDocPreview = async (path: string) => {
        setDocLoading(true);
        setDocPreviewUrl(null);
        try {
            const { data, error } = await supabase.storage
                .from("medical-reports")
                .createSignedUrl(path, 60 * 30); // 30-min signed URL
            if (error) throw error;
            setDocPreviewUrl(data.signedUrl);
        } catch {
            toast("Could not load document preview.", "error");
        } finally {
            setDocLoading(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openDetail = (leave: any) => {
        setSelectedLeave(leave);
        setDocPreviewUrl(null);
        setIsDetailModalOpen(true);
        if (leave.report_file_path) {
            loadDocPreview(leave.report_file_path);
        }
    };

    const handleDownload = async (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        try {
            toast("Preparing download...", "info");
            const { data, error } = await supabase.storage.from("medical-reports").download(path);
            if (error) throw error;
            const url = URL.createObjectURL(data);
            const a = document.createElement("a");
            a.href = url;
            a.download = path.split("/").pop() || "report";
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch {
            toast("Failed to download file.", "error");
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected") => {
        let rejectionReason = null;
        if (newStatus === "rejected") {
            rejectionReason = await prompt({ title: "Rejection Reason", message: "Provide a reason for rejecting:" });
            if (rejectionReason === null) return;
        } else {
            const ok = await confirm({ title: "Approve Leave", message: "Approve this medical leave?", confirmText: "Approve", variant: "primary" });
            if (!ok) return;
        }
        try {
            const { error } = await supabase.from("medical_leaves").update({
                status: newStatus,
                rejection_reason: rejectionReason,
                updated_at: new Date().toISOString(),
            }).eq("id", id);
            if (error) throw error;
            toast(`Leave ${newStatus}.`, "success");
            setIsDetailModalOpen(false);
            setRefreshTrigger((p) => p + 1);
        } catch {
            toast("Failed to update status.", "error");
        }
    };

    const handleSubmitLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || profile?.role !== "mentee") return;
        if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) {
            toast("Please fill all required fields.", "warning");
            return;
        }
        if (new Date(newLeave.startDate) > new Date(newLeave.endDate)) {
            toast("End date must be on or after the start date.", "warning");
            return;
        }
        setIsSubmitting(true);
        try {
            const { data: menteeData, error: mError } = await supabase
                .from("mentees").select("assigned_mentor_id").eq("id", user.id).single();
            if (mError || !menteeData?.assigned_mentor_id) throw new Error("No assigned mentor found.");

            let reportPath = null;
            if (newLeave.file) {
                if (newLeave.file.size > 5 * 1024 * 1024) throw new Error("File must be < 5MB");
                const ext = newLeave.file.name.includes('.') ? newLeave.file.name.split(".").pop() : 'bin';
                const name = `${Date.now()}.${ext}`;
                reportPath = `${user.id}/${name}`;
                const { error: upErr } = await supabase.storage.from("medical-reports").upload(reportPath, newLeave.file);
                if (upErr) throw upErr;
            }

            const { error } = await supabase.from("medical_leaves").insert({
                mentee_id: user.id,
                mentor_id: menteeData.assigned_mentor_id,
                start_date: newLeave.startDate,
                end_date: newLeave.endDate,
                reason: newLeave.reason,
                report_file_path: reportPath,
            });
            if (error) throw error;

            toast("Leave request submitted.", "success");
            setIsSubmitModalOpen(false);
            setNewLeave({ startDate: "", endDate: "", reason: "", file: null });
            setRefreshTrigger((p) => p + 1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast(err.message || "Failed to submit.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusConfig = (status: string) => {
        if (status === "approved") return { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: <CheckCircle2 className="w-5 h-5" /> };
        if (status === "rejected") return { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: <X className="w-5 h-5" /> };
        return { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: <Clock className="w-5 h-5" /> };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Medical Leaves
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
                        {profile?.role === "mentor" ? "Review and approve leave requests from your mentees." : "Submit and track your medical leave applications."}
                    </p>
                </div>
                {profile?.role === "mentee" && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
                        <button
                            onClick={() => setIsSubmitModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 text-sm"
                        >
                            <Plus className="w-4 h-4" /> Request Leave
                        </button>
                    </div>
                )}
            </div>

            {/* Leave List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 rounded-2xl shimmer-skeleton" />
                    ))}
                </div>
            ) : leaves.length === 0 ? (
                <div className="py-20 flex flex-col items-center text-center space-y-4 glass rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">No leave requests found</h3>
                        <p className="text-sm text-slate-500 mt-1">Medical leave history will appear here.</p>
                    </div>
                    {profile?.role === "mentee" && (
                        <button onClick={() => setIsSubmitModalOpen(true)} className="px-5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/10 transition-all">
                            Submit a Request
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupItemsByDate(leaves, (l) => l.created_at)).map(([date, items]) => (
                        <div key={date} className="space-y-3">
                            <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">{date}</span>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                            </div>
                            <div className="space-y-3">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(items as any[]).map((leave, i) => {
                                    const sc = statusConfig(leave.status);
                                    return (
                                        <motion.div
                                            key={leave.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => openDetail(leave)}
                                            className="group flex items-center justify-between gap-4 p-5 sm:p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-[24px] shadow-sm cursor-pointer hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${sc.bg} ${sc.color} border ${sc.border}`}>
                                                    {sc.icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-primary transition-colors">
                                                        {profile?.role === "mentor" ? leave.mentee?.full_name : "Medical Leave Request"}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(leave.start_date)} — {formatDate(leave.end_date)}
                                                        </span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${sc.bg} ${sc.color} ${sc.border}`}>
                                                            {leave.status}
                                                        </span>
                                                        {profile?.role === "mentor" && leave.mentee?.student_id && (
                                                            <span className="text-[10px] text-primary font-bold px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                                                                {leave.mentee.student_id}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {leave.report_file_path && (
                                                    <button
                                                        onClick={(e) => handleDownload(e, leave.report_file_path)}
                                                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                                        title="Download Report"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── DETAIL MODAL ─────────────────────────────────────── */}
            <AnimatePresence>
                {isDetailModalOpen && selectedLeave && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 28 }}
                            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
                        >
                            {/* Modal Header */}
                            {(() => {
                                const sc = statusConfig(selectedLeave.status);
                                return (
                                    <div className={`p-6 ${sc.bg} border-b border-slate-100 dark:border-white/5 flex items-center justify-between`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${sc.border} ${sc.color} bg-white dark:bg-slate-900`}>
                                                {selectedLeave.status === "approved" ? <CheckCircle2 className="w-6 h-6" /> :
                                                 selectedLeave.status === "rejected" ? <X className="w-6 h-6" /> :
                                                 <Clock className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Leave Details</h2>
                                                <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${sc.color}`}>
                                                    Status: {selectedLeave.status}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsDetailModalOpen(false)}
                                            className="p-2 rounded-full bg-white/70 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:scale-110 transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Modal Body */}
                            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                                {/* Mentee Info (Mentor View) */}
                                {profile?.role === "mentor" && selectedLeave.mentee && (
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white text-sm">{selectedLeave.mentee.full_name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                {selectedLeave.mentee.student_id}
                                                {selectedLeave.mentee.section && ` · Section ${selectedLeave.mentee.section}`}
                                                {selectedLeave.mentee.semester && ` · Sem ${selectedLeave.mentee.semester}`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Duration */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-primary shrink-0" />
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatDate(selectedLeave.start_date)}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">End Date</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-primary shrink-0" />
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatDate(selectedLeave.end_date)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Reason for Absence</p>
                                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                            &quot;{selectedLeave.reason}&quot;
                                        </p>
                                    </div>
                                </div>

                                {/* Rejection Reason */}
                                {selectedLeave.status === "rejected" && selectedLeave.rejection_reason && (
                                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Mentor&apos;s Feedback</p>
                                        </div>
                                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">{selectedLeave.rejection_reason}</p>
                                    </div>
                                )}

                                {/* Approved note */}
                                {selectedLeave.status === "approved" && (
                                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">This leave request has been approved by your mentor.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Medical Document Preview */}
                                {selectedLeave.report_file_path && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Medical Document</p>
                                        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                                            {docLoading ? (
                                                <div className="h-48 flex flex-col items-center justify-center gap-3">
                                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                    <p className="text-xs text-slate-400 font-medium">Loading document...</p>
                                                </div>
                                            ) : docPreviewUrl ? (
                                                (() => {
                                                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedLeave.report_file_path);
                                                    return isImage ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={docPreviewUrl}
                                                            alt="Medical Report"
                                                            className="w-full max-h-72 object-contain bg-white dark:bg-slate-900 p-2"
                                                        />
                                                    ) : (
                                                        <iframe
                                                            src={docPreviewUrl}
                                                            className="w-full h-72"
                                                            title="Medical Report Preview"
                                                        />
                                                    );
                                                })()
                                            ) : (
                                                <div className="h-32 flex items-center justify-center">
                                                    <p className="text-xs text-slate-400">Preview unavailable.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer / Actions */}
                            <div className="p-5 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-3">
                                {selectedLeave.report_file_path && (
                                    <button
                                        onClick={(e) => handleDownload(e, selectedLeave.report_file_path)}
                                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all"
                                    >
                                        <Download className="w-4 h-4" /> View Medical Report
                                    </button>
                                )}

                                {profile?.role === "mentor" && selectedLeave.status === "pending" && (
                                    <div className="flex gap-3 flex-1">
                                        <button
                                            onClick={() => handleUpdateStatus(selectedLeave.id, "rejected")}
                                            className="flex-1 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 font-bold text-sm border border-red-200 dark:border-red-900/50 hover:bg-red-100 transition-all"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(selectedLeave.id, "approved")}
                                            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                )}

                                {!(profile?.role === "mentor" && selectedLeave.status === "pending") && !selectedLeave.report_file_path && (
                                    <button
                                        onClick={() => setIsDetailModalOpen(false)}
                                        className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 transition-all"
                                    >
                                        Close
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── SUBMIT MODAL ─────────────────────────────────────── */}
            <AnimatePresence>
                {isSubmitModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90dvh] border border-slate-200 dark:border-white/10"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" /> Request Medical Leave
                                </h2>
                                <button onClick={() => setIsSubmitModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitLeave} className="p-6 space-y-5 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Start Date</label>
                                        <input type="date" required value={newLeave.startDate} onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">End Date</label>
                                        <input type="date" required min={newLeave.startDate} value={newLeave.endDate} onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Reason for Leave</label>
                                    <textarea required rows={4} value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm resize-none" placeholder="Briefly explain your medical condition..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Medical Report (Optional, PDF/Image)</label>
                                    <input type="file" accept=".pdf,image/*" onChange={(e) => setNewLeave({ ...newLeave, file: e.target.files?.[0] || null })} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-blue-600 cursor-pointer" />
                                    <p className="text-[10px] text-slate-400 mt-1.5 italic">Confidential — only your mentor can view this. Max 5MB.</p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsSubmitModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-blue-600 active:scale-95 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                                        {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Submit Request"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
