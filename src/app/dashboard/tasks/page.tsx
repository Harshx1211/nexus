/**
 * @file dashboard/tasks/page.tsx
 * @description Task management page for both mentors and mentees.
 *
 * Mentors can create, review, approve, or request changes on tasks.
 * Mentees can view, start, and submit their assigned tasks.
 * All task mutations are persisted to the Supabase `assignments` table.
 */

"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter, Clock, CheckCircle2, AlertTriangle, User, Users, X, ClipboardList, CircleDashed, GraduationCap, Briefcase, FileText, AlertCircle, ChevronDown, ChevronRight, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, getDeadlineStatus, groupItemsByDate } from "@/lib/date-utils";
import { exportTasksToCSV } from "@/lib/export-utils";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";


// ── Sub-components for Modals ──────────────────────────────────────
function ResultFillForm({ formData, setFormData, task, onUploadMarksheet, marksheetUploading }: {
    formData: any;
    setFormData: Dispatch<SetStateAction<any>>;
    task: any;
    onUploadMarksheet: (file: File) => void;
    marksheetUploading: boolean;
}) {
    let mentorConfig: { headline?: string; exam_type?: string; mentor_feedback?: string } = {};
    try { mentorConfig = JSON.parse(task.description || '{}'); } catch { /* ignore */ }
    const examType = mentorConfig.exam_type || 'mid';
    const headline = mentorConfig.headline || task.title;

    const subjects: any[] = (formData.subjects && formData.subjects.length) ? formData.subjects : [{ name: '', code: '', marks: '', grade: '', passOrFail: '' }];

    const updateSubject = (idx: number, field: string, value: string) => {
        setFormData((p: any) => {
            const subs = [...(p.subjects || [])];
            subs[idx] = { ...subs[idx], [field]: value };
            return { ...p, subjects: subs };
        });
    };
    const addSubject = () => {
        setFormData((p: any) => ({
            ...p,
            subjects: [...(p.subjects || []), { name: '', code: '', marks: '', grade: '', passOrFail: '' }]
        }));
    };
    const removeSubject = (idx: number) => {
        if (subjects.length <= 1) return;
        setFormData((p: any) => ({ ...p, subjects: p.subjects.filter((_: any, i: number) => i !== idx) }));
    };

    return (
        <div className="space-y-4">
            {headline && (
                <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5">📋 Instructions</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{headline}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-bold">
                        {examType === 'end-sem' ? 'End Semester Exam' : examType === 'ia' ? 'Internal Assessment' : 'Mid Exam'}
                    </p>
                </div>
            )}

            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Subjects</p>
                {subjects.map((sub: any, idx: number) => (
                    <div key={idx} className="nexus-card p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Subject {idx + 1}</p>
                            {subjects.length > 1 && (
                                <button type="button" onClick={() => removeSubject(idx)}
                                    className="text-[10px] text-red-400 hover:text-red-600 font-bold">Remove</button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Subject Name</label>
                                <input type="text" value={sub.name} onChange={e => updateSubject(idx, 'name', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm"
                                    placeholder="e.g. Mathematics" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Subject Code</label>
                                <input type="text" value={sub.code} onChange={e => updateSubject(idx, 'code', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm uppercase"
                                    placeholder="e.g. MATH101" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Marks / Grade</label>
                                <input type="text" value={sub.marks} onChange={e => updateSubject(idx, 'marks', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm"
                                    placeholder="e.g. 45/50 or A" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Grade / Pointer</label>
                                <input type="text" value={sub.grade} onChange={e => updateSubject(idx, 'grade', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm"
                                    placeholder="e.g. A+ or 9.0" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pass/Fail (optional)</p>
                            <div className="flex gap-1.5 ml-auto">
                                {['', 'pass', 'fail'].map(s => (
                                    <button key={s} type="button" onClick={() => updateSubject(idx, 'passOrFail', s)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                            sub.passOrFail === s && s === 'pass' ? 'bg-emerald-500 text-white'
                                                : sub.passOrFail === s && s === 'fail' ? 'bg-red-500 text-white'
                                                    : sub.passOrFail === s ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        }`}>{s === '' ? 'N/A' : s}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addSubject}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300/60 dark:border-slate-700/60 text-slate-500 text-xs font-bold uppercase tracking-widest hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-95 transition-all shadow-sm">
                    + Add Subject
                </button>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Remarks (Optional)</label>
                <textarea rows={2} value={formData.remarks ?? ''}
                    onChange={e => setFormData((p: any) => ({ ...p, remarks: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm resize-none"
                    placeholder="Any additional notes..." />
            </div>

            {examType === 'end-sem' && (
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">End Semester Details</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">CGPA</label>
                            <input type="number" step="0.01" min={0} max={10} value={formData.cgpa ?? ''}
                                onChange={e => setFormData((p: any) => ({ ...p, cgpa: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm"
                                placeholder="e.g. 8.5" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">SGPA</label>
                            <input type="number" step="0.01" min={0} max={10} value={formData.sgpa ?? ''}
                                onChange={e => setFormData((p: any) => ({ ...p, sgpa: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm"
                                placeholder="e.g. 8.9" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Marksheet (Image/PDF)</label>
                        {formData.marksheet_url ? (
                            <div className="flex items-center gap-2">
                                <a href={formData.marksheet_url} target="_blank" rel="noreferrer"
                                    className="text-xs text-primary underline font-bold">View Uploaded File</a>
                                <button type="button" onClick={() => setFormData((p: any) => ({ ...p, marksheet_url: '' }))}
                                    className="text-xs text-red-400 hover:text-red-600 font-bold">Remove</button>
                            </div>
                        ) : (
                            <label className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                                marksheetUploading ? 'border-primary/40 text-primary/40' : 'border-slate-300 dark:border-slate-700 text-slate-400 hover:border-primary hover:text-primary'
                            }`}>
                                <input type="file" accept="image/*,.pdf" className="sr-only" disabled={marksheetUploading}
                                    onChange={e => { if (e.target.files?.[0]) onUploadMarksheet(e.target.files[0]); }} />
                                📍 Upload Marksheet
                            </label>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Task Response Viewer Sub-component (Mentor View) ─────────────────────
function TaskResponseViewer({ task }: { task: any }) {
    const data = task.formData || {};
    const subjects = data.subjects || [];
    
    let mentorConfig: { headline?: string; exam_type?: string } = {};
    try { mentorConfig = JSON.parse(task.description || '{}'); } catch { /* ignore */ }
    const examType = mentorConfig.exam_type || 'mid';

    return (
        <div className="space-y-6">
            {task.taskType === 'result' && (
                <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Task Report Type</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {examType === 'end-sem' ? 'End Semester Examination' : examType === 'ia' ? 'Internal Assessment' : 'Mid-term Examination'}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Subject Intelligence</p>
                        {subjects.length > 0 ? (
                            <div className="grid gap-3">
                                {subjects.map((s: any, i: number) => (
                                    <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{s.name || 'Unknown Subject'}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.code || 'NO-CODE'}</p>
                                        </div>
                                        <div className="flex gap-4 sm:gap-6">
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold uppercase text-slate-400">Score</p>
                                                <p className="text-xs font-bold text-primary">{s.marks || '-'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold uppercase text-slate-400">Grade</p>
                                                <p className="text-xs font-bold text-primary">{s.grade || '-'}</p>
                                            </div>
                                            {s.passOrFail && (
                                                <div className="text-right">
                                                    <p className="text-[9px] font-bold uppercase text-slate-400">Result</p>
                                                    <p className={`text-[9px] font-bold uppercase ${s.passOrFail === 'pass' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {s.passOrFail}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic">No subject data provided.</p>
                        )}
                    </div>

                    {examType === 'end-sem' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                <p className="text-[9px] font-bold uppercase text-emerald-600 mb-1">Final CGPA</p>
                                <p className="text-xl font-bold text-emerald-600 tracking-tight">{data.cgpa || 'N/A'}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                                <p className="text-[9px] font-bold uppercase text-indigo-600 mb-1">Semester SGPA</p>
                                <p className="text-xl font-bold text-indigo-600 tracking-tight">{data.sgpa || 'N/A'}</p>
                            </div>
                        </div>
                    )}

                    {data.marksheet_url && (
                        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
                            <p className="text-xs font-bold text-white">Attached Marksheet</p>
                            <a href={data.marksheet_url} target="_blank" rel="noreferrer" 
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white transition-all shadow-xl">
                                Open File
                            </a>
                        </div>
                    )}
                </div>
            )}

            {task.taskType === 'placement' && (
                <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Deployment Status</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                            {data.status?.replace('-', ' ') || 'Pending Notification'}
                        </p>
                    </div>

                    {data.status === 'placed' && (
                        <div className="grid gap-3">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
                                <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Assigned Unit (Company)</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{data.company || 'Not Specified'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
                                    <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Role Designation</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{data.role || 'Not Specified'}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
                                    <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Package (LPA)</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{data.package || 'Not Specified'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {data.status === 'higher-studies' && (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
                            <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Target Institution</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{data.higher_studies || 'Not Specified'}</p>
                        </div>
                    )}
                </div>
            )}

            {data.remarks && (
                <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Personal Remarks</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">&quot;{data.remarks}&quot;</p>
                </div>
            )}
        </div>
    );
}

// ───────────────────────────────────────────────────────────────────

export default function TasksPage() {
    const { user, profile, loading: authLoading, globalData, updateGlobalData } = useAuth();
    const { toast, confirm, prompt } = useToast();

    // SWR initialization: If we already have tasks in globalData, use them immediately
    const [tasks, setTasks] = useState<any[]>(() =>
        globalData.tasks?.length > 0 ? (globalData.tasks as any[]) : []
    );
    const [loading, setLoading] = useState(() =>
        !(globalData.tasks?.length > 0)
    );
    const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('in-progress');
    const [searchTerm, setSearchTerm] = useState("");
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [_priorityFilter, _setPriorityFilter] = useState<'all' | 'overdue' | 'high'>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState<{
        priorities: string[];
        types: string[];
        deadline: string;
    }>({
        priorities: [],
        types: [],
        deadline: 'any',
    });
    const activeFilterCount = filters.priorities.length + filters.types.length + (filters.deadline !== 'any' ? 1 : 0);
    const toggleFilter = (key: 'priorities' | 'types', value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: prev[key].includes(value) ? prev[key].filter((v: string) => v !== value) : [...prev[key], value]
        }));
    };
    const clearFilters = () => setFilters({ priorities: [], types: [], deadline: 'any' });

    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Failsafe: max 3 seconds - then show empty state and let user act
    useEffect(() => {
        if (!loading) return;
        const timeout = setTimeout(() => {
            logger.warn("TasksPage", "Failsafe: Loading took too long, forcing resolution.");
            setLoading(false);
        }, 10000);
        return () => clearTimeout(timeout);
    }, [loading]);
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [myMentees, setMyMentees] = useState<any[]>([]);
    const [newTask, setNewTask] = useState<{
        title: string;
        mentee_id: string;
        due_date: string;
        description: string;
        priority: string;
        task_type: 'general' | 'result' | 'placement';
        headline?: string;
        examType?: 'mid' | 'ia' | 'end-sem';
    }>({
        title: '',
        mentee_id: '',
        due_date: '',
        description: '',
        priority: 'Normal',
        task_type: 'general',
        headline: '',
        examType: 'mid'
    });
    const [isCreating, setIsCreating] = useState(false);

    // Response View and Submit Form Modals
    const [viewModal, setViewModal] = useState<{ open: boolean; task: any | null }>({ open: false, task: null });
    const [formModal, setFormModal] = useState<{ open: boolean; task: any | null }>({ open: false, task: null });
    const [formData, setFormData] = useState<any>({});
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);
    const [marksheetUploading, setMarksheetUploading] = useState(false);



    const _handleActionClick = async (taskId: string, newStatus: string) => {
        if (!user) return;
        const taskToUpdate = tasks.find(t => t.rawId === taskId);
        if (!taskToUpdate) return;

        const updatePayload: any = { status: newStatus };
        let successMessage = "";
        let errorMessage = "";

        if (newStatus === 'in-progress') {
            successMessage = "Task marked as in-progress.";
            errorMessage = "Failed to mark task as in-progress.";
        } else if (newStatus === 'reviewed') {
            const feedback = await prompt({ title: "Feedback", message: "Provide feedback for the mentee (optional):" });
            if (feedback !== null) { // User didn't cancel
                let description = taskToUpdate.description;
                if (taskToUpdate.taskType === 'result' || taskToUpdate.taskType === 'placement') {
                    try {
                        const config = JSON.parse(description || '{}');
                        config.mentor_feedback = feedback;
                        description = JSON.stringify(config);
                    } catch { /* ignore */ }
                } else {
                    description = `${description}\n\n[Mentor Feedback: ${feedback}]`;
                }
                updatePayload.description = description;
            }
            successMessage = "Task reviewed and feedback added.";
            errorMessage = "Failed to review task.";
        } else if (newStatus === 'request-changes' && profile?.role === 'mentor') {
            // Mentor requests changes
            const feedback = await prompt({ title: "Request Revisions", message: "What changes are required for the mentee?" });
            if (feedback === null) return; // User cancelled
            
            let description = taskToUpdate.description;
            if (taskToUpdate.taskType === 'result' || taskToUpdate.taskType === 'placement') {
                try {
                    const config = JSON.parse(description || '{}');
                    config.mentor_feedback = feedback;
                    description = JSON.stringify(config);
                } catch { /* ignore */ }
            } else {
                description = `${description}\n\n[Mentor Feedback: ${feedback}]`;
            }
            updatePayload.status = 'in-progress';
            updatePayload.description = description;
            successMessage = "Changes requested for the task.";
            errorMessage = "Failed to request changes.";
        }

        try {
            const { error } = await supabase
                .from('assignments')
                .update(updatePayload)
                .eq('id', taskId);

            if (error) throw error;
            toast(successMessage, "success");
            setRefreshTrigger(prev => prev + 1);
            setViewModal({ open: false, task: null }); // Close modal after action
        } catch (error) {
            logger.error("TasksPage", `Error updating task status to ${newStatus}`, error);
            toast(errorMessage, "error");
        }
    };

    useEffect(() => {
        // EAGER FETCH: Start as soon as we have a user ID.
        if (!user?.id) return;

        // ðŸŸ¢ REAL-TIME SUBSCRIPTION
        const channel = supabase
            .channel('tasks-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'assignments' },
                () => {
                    logger.debug("TasksPage", "Assignments table changed, refreshing...");
                    setRefreshTrigger(prev => prev + 1);
                }
            )
            .subscribe();

        const fetchTasks = async () => {
            try {
                // SWR: Use cached data if available.
                const hasCachedData = tasks.length > 0;

                if (!hasCachedData) {
                    setLoading(true);
                }

                const { data: tasksData, error: tasksError } = await supabase
                    .from('assignments')
                    .select('*, mentor:profiles!mentor_id(full_name), mentee:profiles!mentee_id(full_name, student_id)')
                    .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
                    .order('assigned_at', { ascending: false });

                if (tasksError) throw tasksError;


                const formatted = (tasksData || []).map((t: any) => {
                    const isMentorSide = t.mentor_id === user.id;
                    const otherPerson = isMentorSide ? t.mentee : t.mentor;
                    const rawTaskType = (t as any).task_type || 'general';
                    const deadlineStatus = getDeadlineStatus(t.due_date);
                    
                    // Enterprise Status Labels
                    let statusLabel = isMentorSide ? 'Pending Start' : 'To Do';
                    let feedback = null;

                    if (t.status === 'in-progress') {
                        statusLabel = 'In Progress';
                        
                        // Check for mentor feedback
                        if (t.description?.includes('[Mentor Feedback:')) {
                            statusLabel = 'Revision Required';
                            const match = t.description.match(/\[Mentor Feedback: (.*?)\]/);
                            if (match) feedback = match[1];
                        } else if (rawTaskType === 'result' || rawTaskType === 'placement') {
                            try {
                                const config = JSON.parse(t.description || '{}');
                                if (config.mentor_feedback) {
                                    statusLabel = 'Revision Required';
                                    feedback = config.mentor_feedback;
                                }
                            } catch { /* ignore corrupted JSON */ }
                        }
                    }
                    if (t.status === 'submitted') {
                        statusLabel = isMentorSide ? 'Review Pending' : 'Submitted';
                    }
                    if (t.status === 'reviewed') {
                        statusLabel = 'Completed';
                    }

                    const priority = deadlineStatus === 'overdue' ? 'Critical' :
                        deadlineStatus === 'upcoming' ? 'High' : 'Medium';

                    return {
                        id: t.id,
                        rawId: t.id,
                        title: t.title || 'Assignment',
                        description: t.description || '',
                        otherName: otherPerson?.full_name || 'User',
                        dueDate: formatDate(t.due_date),
                        rawDueDate: t.due_date,
                        rawUpdatedAt: t.updated_at,
                        deadlineStatus,
                        priority,
                        status: statusLabel,
                        rawStatus: t.status,
                        taskType: rawTaskType,
                        formData: (t as any).form_data,
                        feedback: feedback,
                        batchId: (t as any).batch_id,
                        menteeId: t.mentee_id
                    };
                });

                // DATA RECONCILIATION
                const dataChanged = JSON.stringify(formatted) !== JSON.stringify(tasks);
                if (dataChanged) {
                    setTasks(formatted);
                    updateGlobalData('tasks', formatted);
                }

                // Unify mentee data source from globalData
                // NOTE: globalData.mentees (from dashboard) stores mentees-table PK as `id`,
                // but assignments.mentee_id needs the profile UUID (profiles.id).
                // We use m.profiles?.id as the authoritative profile UUID when available.
                const menteeList = (globalData.myMentees?.length > 0 ? globalData.myMentees : globalData.mentees) || [];
                if (menteeList.length > 0) {
                    const formattedMentees = menteeList.map((m: any) => ({
                        id: m.profiles?.id || m.profile_id || m.id,
                        name: m.name || m.full_name || 'Mentee',
                        student_id: m.student_id || ''
                    }));
                    setMyMentees(formattedMentees);
                } else if (profile?.role === 'mentor' || user.user_metadata?.role === 'mentor') {
                    // Fetch for the dropdown if not in cache
                    const { data: mRows } = await supabase
                        .from('mentees')
                        .select('profiles:profiles!fk_mentee_profile(id, full_name, student_id)')
                        .eq('assigned_mentor_id', user.id);

                    if (mRows) {
                        const mList = mRows.map((m: any) => ({
                            id: m.profiles.id,
                            name: m.profiles.full_name || 'Mentee',
                            student_id: m.profiles.student_id || ''
                        }));
                        setMyMentees(mList);
                        updateGlobalData('mentees', mList); 
                    }
                }
            } catch (error: any) {
                logger.error("TasksPage", "CRITICAL: Fetch failed", {
                    message: error?.message || error,
                    details: error?.details,
                    hint: error?.hint,
                    code: error?.code
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refreshTrigger, user?.id, profile?.role, tasks.length, globalData, updateGlobalData]);

    const filteredTasks = tasks.filter(t => {
        const matchesTab = activeTab === 'all' ||
            (activeTab === 'in-progress' && (t.rawStatus === 'in-progress' || t.rawStatus === 'pending' || t.status === 'Revision Required' || (profile?.role === 'mentor' && t.rawStatus === 'submitted'))) ||
            (activeTab === 'completed' && (t.rawStatus === 'reviewed' || (profile?.role === 'mentee' && t.rawStatus === 'submitted')));

        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.otherName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesPriority = filters.priorities.length === 0 || filters.priorities.includes(t.priority);
        const matchesType = filters.types.length === 0 || filters.types.includes(t.taskType);
        
        let matchesDeadline = true;
        if (filters.deadline === 'today') {
            matchesDeadline = new Date(t.rawDueDate).toDateString() === new Date().toDateString();
        } else if (filters.deadline === 'week') {
            const today = new Date();
            const due = new Date(t.rawDueDate);
            const diffTime = due.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            matchesDeadline = diffDays >= 0 && diffDays <= 7;
        } else if (filters.deadline === 'overdue') {
            matchesDeadline = t.deadlineStatus === 'overdue';
        }

        return matchesTab && matchesSearch && matchesPriority && matchesType && matchesDeadline;
    });

    const [expandedBatches, setExpandedBatches] = React.useState<Set<string>>(new Set());
    const toggleBatch = (batchId: string) => {
        setExpandedBatches(prev => {
            const next = new Set(prev);
            if (next.has(batchId)) next.delete(batchId);
            else next.add(batchId);
            return next;
        });
    };

    const groupedTasks = React.useMemo(() => {
        if (profile?.role !== 'mentor') return filteredTasks;
        
        const result: any[] = [];
        const seenBatches = new Set<string>();
        
        filteredTasks.forEach(t => {
            if (t.batchId) {
                if (!seenBatches.has(t.batchId)) {
                    seenBatches.add(t.batchId);
                    const batchItems = filteredTasks.filter(bt => bt.batchId === t.batchId);
                    const completed = batchItems.filter(bi => bi.rawStatus === 'reviewed').length;
                    result.push({
                        ...t,
                        id: `batch-${t.batchId}`,
                        isBatch: true,
                        batchItems: batchItems,
                        totalCount: batchItems.length,
                        completedCount: completed,
                        progressPercent: Math.round((completed / batchItems.length) * 100)
                    });
                }
            } else {
                result.push(t);
            }
        });
        return result;
    }, [filteredTasks, profile?.role]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || profile?.role !== 'mentor') return;

        if (!newTask.title.trim()) {
            toast("Please enter a task title.", "warning");
            return;
        }

        if (!newTask.due_date) {
            toast("Please set a deadline for this task.", "warning");
            return;
        }

        if (newTask.mentee_id !== 'all' && !newTask.mentee_id) {
            toast("Please select a recipient for this task.", "warning");
            return;
        }

        if (new Date(newTask.due_date) < new Date(new Date().setHours(0,0,0,0))) { toast("Due date cannot be in the past.", "warning"); return; }

        setIsCreating(true);
        try {
            const isGroupAssignment = newTask.mentee_id === "all";
            const targetMentees = isGroupAssignment ? myMentees : myMentees.filter(m => m.id === newTask.mentee_id);
            const targetMenteeIds = targetMentees.map(m => m.id);

            if (targetMenteeIds.length === 0) {
                toast("No mentees available to assign task.", "warning");
                setIsCreating(false);
                return;
            }

            const batchId = isGroupAssignment ? (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)) : null;
            const configPayload = {
                exam_type: newTask.examType,
                headline: newTask.headline || newTask.title,
                task_type: newTask.task_type
            };
            const insertData: any = {
                title: newTask.title,
                description: newTask.task_type === 'result' ? JSON.stringify(configPayload) : newTask.description,
                priority: newTask.priority || 'Normal',
                mentor_id: user.id,
                due_date: new Date(newTask.due_date).toISOString(),
                status: 'pending',
                task_type: newTask.task_type || 'general'
            };
            
            if (batchId) {
                insertData.batch_id = batchId;
            }

            const assignments = targetMenteeIds.map(mId => ({
                ...insertData,
                mentee_id: mId,
                assigned_at: new Date().toISOString(),
            }));

            const { error } = await supabase
                .from('assignments')
                .insert(assignments);

            if (error) throw error;
            
            // Explicit Manual Notification: Mentor -> Mentee
            try {
                const notifications = targetMenteeIds.map(mId => ({
                    recipient_id: mId,
                    type: 'task',
                    title: 'New Task Assigned',
                    content: `Your mentor assigned a new task: ${newTask.title}`,
                    link: '/dashboard/tasks',
                    is_read: false
                }));
                await supabase.from('notifications').insert(notifications);
            } catch (notifyErr) {
                logger.warn("TasksPage", "Failed to send manual assign notification", notifyErr);
            }

            toast(isGroupAssignment 
                ? `Task assigned to ${targetMenteeIds.length} mentees!`
                : `Task assigned successfully!`, "success");
            
            setIsModalOpen(false);
            setNewTask({ title: "", mentee_id: "", due_date: "", description: "", priority: "Normal", task_type: "general", headline: "", examType: "mid" });
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            logger.error("TasksPage", "Error creating task", {
                message: error?.message || error,
                newTask
            });
            toast(error.message || "Failed to create task", "error");
        } finally {
            setIsCreating(false);
        }
    };

    // Mentee submits a structured form (result / placement)
    const handleSubmitForm = async () => {
        if (!formModal.task) return;
        setIsSubmittingForm(true);
        try {
            const { error } = await supabase
                .from('assignments')
                .update({
                    status: 'submitted',
                    form_data: formData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', formModal.task.rawId);
            if (error) throw error;

            // Explicit Manual Notification: Mentee -> Mentor
            try {
                if (formModal.task.mentorId) {
                    await supabase.from('notifications').insert({
                        recipient_id: formModal.task.mentorId,
                        type: 'task',
                        title: 'Form Submitted',
                        content: `${profile?.full_name || 'A mentee'} submitted a form for: ${formModal.task.title}`,
                        link: '/dashboard/tasks',
                        is_read: false
                    });
                }
            } catch (notifyErr) {
                logger.warn("TasksPage", "Failed to send manual submit notification", notifyErr);
            }

            toast("Form submitted! Your mentor will review it.", "success");
            setFormModal({ open: false, task: null });
            setFormData({ subjects: [{ name: "", code: "", marks: "", grade: "", passOrFail: "" }] });
            setRefreshTrigger(p => p + 1);
        } catch (e: any) {
            toast(e.message || "Failed to submit form.", "error");
        } finally {
            setIsSubmittingForm(false);
        }
    };

    const handleMarksheetUpload = async (file: File) => {
        if (!file || !user?.id) return;

        // SECURITY: Validate file size (max 5MB) and type before uploading
        const MAX_SIZE_MB = 5;
        const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            toast(`File is too large. Max size is ${MAX_SIZE_MB}MB.`, "error");
            return;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast("Invalid file type. Only images (JPG, PNG, WebP) and PDFs are allowed.", "error");
            return;
        }

        setMarksheetUploading(true);
        try {
            // Use a safe, predictable extension derived from the MIME type (not user filename)
            const extMap: Record<string, string> = {
                "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
                "image/gif": "gif", "application/pdf": "pdf"
            };
            const safeExt = extMap[file.type] || "pdf";
            const path = `${user.id}/${formModal.task?.rawId}.${safeExt}`;
            const { error: upErr } = await supabase.storage
                .from('marksheets')
                .upload(path, file, { upsert: true, contentType: file.type });
            if (upErr) throw upErr;
            const { data: urlData } = supabase.storage.from('marksheets').getPublicUrl(path);
            setFormData((p: any) => ({ ...p, marksheet_url: urlData.publicUrl }));
            toast("Marksheet uploaded!", "success");
        } catch (e: any) {
            toast(e.message || "Upload failed.", "error");
        } finally {
            setMarksheetUploading(false);
        }
    };

    const handleSubmitTask = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Structured forms (Result/Placement) always open the modal
        if (task.taskType === 'result' || task.taskType === 'placement') {
            setFormModal({ open: true, task });
            setFormData(task.formData || { subjects: [{ name: "", code: "", marks: "", grade: "", passOrFail: "" }] });
            return;
        }

        const ok = await confirm({
            title: "Submit Task",
            message: "Are you sure you want to submit this task for review? Your mentor will be notified.",
            confirmText: "Submit",
            variant: "primary"
        });
        if (!ok) return;

        try {
            const { error } = await supabase
                .from('assignments')
                .update({ status: 'submitted', updated_at: new Date().toISOString() })
                .eq('id', taskId);

            if (error) throw error;

            // Explicit Manual Notification: Mentee -> Mentor
            try {
                if (task.mentorId) {
                    await supabase.from('notifications').insert({
                        recipient_id: task.mentorId,
                        type: 'task',
                        title: 'Task Submitted',
                        content: `${profile?.full_name || 'A mentee'} submitted the task: ${task.title}`,
                        link: '/dashboard/tasks',
                        is_read: false
                    });
                }
            } catch (notifyErr) {
                logger.warn("TasksPage", "Failed to send manual task submit notification", notifyErr);
            }

            toast("Task submitted! Your mentor will be notified.", "success");
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            logger.error("TasksPage", "Error submitting task", error);
            toast(error.message || "Failed to submit task", "error");
        }
    };

    const handleStartTask = async (taskId: string) => {
        try {
            const { error } = await supabase
                .from('assignments')
                .update({ status: 'in-progress', updated_at: new Date().toISOString() })
                .eq('id', taskId);

            if (error) throw error;
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            logger.error("TasksPage", "Error starting task", error);

            toast("Failed to start task.", "error");
        }
    };

    const handleReviewTask = async (taskId: string) => {
        const ok = await confirm({
            title: "Approve Task",
            message: "Mark this task as completed and approved?",
            confirmText: "Approve",
            variant: "primary"
        });
        if (!ok) return;

        try {
            const { error } = await supabase
                .from('assignments')
                .update({ status: 'reviewed', updated_at: new Date().toISOString() })
                .eq('id', taskId);

            if (error) throw error;
            toast("Task approved and marked as completed.", "success");
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            logger.error("TasksPage", "Error reviewing task", error);

            toast("Failed to update task status.", "error");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        const ok = await confirm({
            title: "Delete Task",
            message: "Are you sure you want to delete this task? This action cannot be undone.",
            confirmText: "Delete",
            variant: "danger"
        });
        if (!ok) return;

        try {
            let error;
            if (taskId.startsWith('batch-')) {
                const actualBatchId = taskId.replace('batch-', '');
                const res = await supabase.from('assignments').delete().eq('batch_id', actualBatchId);
                error = res.error;
            } else {
                const res = await supabase.from('assignments').delete().eq('id', taskId);
                error = res.error;
            }

            if (error) throw error;
            toast("Task deleted.", "info");
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            logger.error("TasksPage", "Error deleting task", error);

            toast("Failed to delete task.", "error");
        }
    };

    const handleExport = async (taskTitle: string) => {
        try {
            toast("Preparing export...", "info");
            // Fetch all assignments with this title for this mentor to ensure full data
            const { data, error } = await supabase
                .from('assignments')
                .select('*, mentee:profiles!mentee_id(full_name, student_id)')
                .eq('mentor_id', user!.id)
                .eq('title', taskTitle);

            if (error) throw error;
            if (!data || data.length === 0) {
                toast("No responses found for this task yet.", "warning");
                return;
            }

            exportTasksToCSV(taskTitle, data);
            toast("Export successful!", "success");
        } catch (e: any) {
            logger.error("TasksPage", "Export failed", e);
            toast("Failed to generate export.", "error");
        }
    };

    const handleRequestChanges = async (taskId: string) => {
        const feedback = await prompt({
            title: "Request Changes",
            message: "Enter feedback for the mentee. They will see this and can resubmit their work.",
            placeholder: "e.g. Please clarify the second point in your report...",
            confirmText: "Send Feedback",
            cancelText: "Cancel"
        });
        
        if (feedback === null) return; // User cancelled

        try {
            // Get current task to preserve description if needed
            const { data: currentTask } = await supabase
                .from('assignments')
                .select('description, task_type')
                .eq('id', taskId)
                .single();

            let newDescription = currentTask?.description || "";
            const isStructured = currentTask?.task_type === 'result' || currentTask?.task_type === 'placement';

            if (isStructured) {
                try {
                    const config = JSON.parse(newDescription || "{}");
                    config.mentor_feedback = feedback;
                    newDescription = JSON.stringify(config);
                } catch {
                    // Fallback to plain text if JSON is already corrupted
                    newDescription = feedback ? `[Mentor Feedback: ${feedback}]\n\n` + newDescription : newDescription;
                }
            } else {
                newDescription = feedback ? `[Mentor Feedback: ${feedback}]\n\n` + newDescription : newDescription;
            }

            const { error } = await supabase
                .from('assignments')
                .update({
                    status: 'in-progress',
                    description: newDescription,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;
            toast("Feedback sent successfully.", "success");
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            logger.error("TasksPage", "Error requesting changes", error);
            toast("Failed to request changes.", "error");
        }
    };

    // Show inline skeleton while data loads - never block the whole page
    const _hasVisibleContent = tasks.length > 0;
    // ZERO-LATENCY UI: Only block the whole page if we have NO identity info.
    const isBlocking = authLoading && !profile?.role && !user?.user_metadata?.role;

    if (isBlocking) {
        return (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500 pb-12">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-3">
                        <div className="h-10 w-64 rounded-2xl bg-slate-200 dark:bg-slate-800 shimmer-skeleton" />
                        <div className="h-4 w-96 rounded-xl bg-slate-100 dark:bg-slate-800/60 shimmer-skeleton" />
                    </div>
                    <div className="h-12 w-40 rounded-2xl bg-slate-200 dark:bg-slate-800 shimmer-skeleton" />
                </div>

                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-800 shimmer-skeleton" />
                        <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-800 shimmer-skeleton" />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 shimmer-skeleton" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    return (
        <>
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">
            {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                    >
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            Tasks
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-lg leading-relaxed">
                            {profile?.role === 'mentor'
                                ? 'Deploy, monitor, and evaluate student tasks in real-time.'
                                : 'Track your active tasks and submit deliverables to your mentor.'}
                        </p>
                    </motion.div>
                    
                    {profile?.role === 'mentor' && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-semibold transition-colors hover:bg-blue-600 w-full sm:w-auto justify-center"
                        >
                            <Plus className="w-5 h-5" /> 
                            <span className="uppercase tracking-widest text-[10px]">New Task</span>
                        </motion.button>
                    )}
                </div>

                {/* Filter & Search Bar */}
                <div className="relative z-[70] flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-1.5 nexus-card shadow-lg">
                    <div className="flex items-center gap-1 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                        {[
                            { id: 'in-progress', label: 'Active', count: tasks.filter(t => t.status !== 'Completed').length },
                            { id: 'completed', label: 'History', count: tasks.filter(t => t.status === 'Completed').length }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`relative px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                                    activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTabPill"
                                        className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/20"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    {tab.label}
                                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                        {tab.count}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 px-2 w-full lg:w-auto">
                        <div className="relative flex-1 lg:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full lg:w-64 pl-10 pr-4 py-2 rounded-lg bg-transparent border-none outline-none text-sm font-medium focus:ring-0 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 hidden lg:block" />
                        {/* Filter Button + Panel */}
                        <div className="relative" ref={filterRef}>
                            <button
                                onClick={() => setIsFilterOpen(v => !v)}
                                className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                                    activeFilterCount > 0
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Filter tasks"
                            >
                                <Filter className="w-4 h-4" />
                                {activeFilterCount > 0 && (
                                    <span className="text-[10px] font-bold bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {isFilterOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-12 z-[100] w-72 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-black/60 overflow-hidden"
                                    >
                                        {/* Panel Header */}
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Filters</span>
                                            <button onClick={clearFilters} className="text-[10px] font-bold text-primary hover:underline">
                                                Clear all
                                            </button>
                                        </div>

                                        <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">

                                            {/* Priority */}
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Priority</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['High', 'Normal'].map(p => (
                                                        <button
                                                            key={p}
                                                            onClick={() => toggleFilter('priorities', p)}
                                                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                                                filters.priorities.includes(p)
                                                                    ? 'bg-primary text-white border-primary'
                                                                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary'
                                                            }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Task Type */}
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Task Type</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['general', 'result', 'placement'].map(t => (
                                                        <button
                                                            key={t}
                                                            onClick={() => toggleFilter('types', t)}
                                                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                                                                filters.types.includes(t)
                                                                    ? 'bg-primary text-white border-primary'
                                                                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary'
                                                            }`}
                                                        >
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Deadline */}
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Deadline</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { id: 'any', label: 'Any time' },
                                                        { id: 'today', label: 'Due today' },
                                                        { id: 'week', label: 'Due this week' },
                                                        { id: 'overdue', label: 'Overdue' },
                                                    ].map(d => (
                                                        <button
                                                            key={d.id}
                                                            onClick={() => setFilters(prev => ({ ...prev, deadline: d.id }))}
                                                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                                                filters.deadline === d.id
                                                                    ? 'bg-primary text-white border-primary'
                                                                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary'
                                                            }`}
                                                        >
                                                            {d.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                        </div>

                                        {/* Panel Footer */}
                                        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                                            <button
                                                onClick={() => setIsFilterOpen(false)}
                                                className="w-full py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold tracking-wider hover:opacity-90 transition-opacity"
                                            >
                                                Apply Filters
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 container mx-auto px-4 sm:px-6 grid grid-cols-1 gap-5 mt-6">
                {filteredTasks.length === 0 ? (
                    <div className="relative group overflow-hidden p-8 sm:p-10 text-center nexus-card flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm group-hover:rotate-6 transition-transform duration-500">
                                <ClipboardList className="w-8 h-8 text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">No tasks found</h3>
                            <p className="max-w-xs mx-auto text-sm text-slate-500 font-medium leading-relaxed">
                                {searchTerm ? "No tasks match your search criteria. Try a different term." : "Your task list is clear. Get started by creating a new task."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(groupItemsByDate(
                            [...groupedTasks].sort((a, b) => {
                                const dateA = activeTab === 'completed' ? a.rawUpdatedAt : a.rawDueDate;
                                const dateB = activeTab === 'completed' ? b.rawUpdatedAt : b.rawDueDate;
                                return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
                            }),
                            t => activeTab === 'completed' ? t.rawUpdatedAt : t.rawDueDate
                        )).map(([date, items]) => (
                            <div key={date} className="group/date space-y-3">
                                <div className="flex items-center gap-6 px-1">
                                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                        {date}
                                    </span>
                                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                                </div>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <AnimatePresence mode="popLayout">
                                        {items.map((task: any, idx: number) => (
                                            <div key={task.id}>
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="group/card relative nexus-card nexus-card-hover overflow-hidden"
                                                >
                                                    <div 
                                                        onClick={() => {
                                                            if (task.isBatch && profile?.role === 'mentor') {
                                                                toggleBatch(task.batchId);
                                                            } else if (profile?.role === 'mentor' && (task.rawStatus === 'submitted' || task.rawStatus === 'reviewed' || task.status === 'Revision Required')) {
                                                                setViewModal({ open: true, task });
                                                            }
                                                        }}
                                                        className={`p-5 sm:p-6 transition-all duration-300 bg-transparent ${
                                                            (task.isBatch || (profile?.role === 'mentor' && (task.rawStatus === 'submitted' || task.rawStatus === 'reviewed' || task.status === 'Revision Required'))) ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/5' : ''
                                                        }`}
                                                    >

                                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                                                            <div className="flex items-start gap-5 flex-1 min-w-0">
                                                                {/* Status Icon Wrapper */}
                                                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/card:scale-105 ${
                                                                    task.isBatch ? 'bg-primary/10 text-primary dark:bg-primary/20' :
                                                                    task.rawStatus === 'reviewed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                                    task.rawStatus === 'submitted' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                                                                    task.status === 'Revision Required' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                                                    'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                                }`}>
                                                                    {task.isBatch ? <Users className="w-6 h-6" /> :
                                                                     task.rawStatus === 'reviewed' ? <CheckCircle2 className="w-6 h-6" /> :
                                                                     task.rawStatus === 'submitted' ? <FileText className="w-6 h-6" /> :
                                                                     task.status === 'Revision Required' ? <AlertTriangle className="w-6 h-6" /> :
                                                                     <CircleDashed className="w-6 h-6" />}
                                                                </div>

                                                                <div className="space-y-1.5 min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                                        {task.isBatch && (
                                                                            <div className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest bg-primary text-white">
                                                                                Group
                                                                            </div>
                                                                        )}
                                                                        {!task.isBatch && task.rawStatus === 'reviewed' && (
                                                                            <div className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                                                                Verified
                                                                            </div>
                                                                        )}
                                                                        <div className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border ${
                                                                            task.priority === 'High' ? 'border-red-200 text-red-600 dark:border-red-500/30 dark:text-red-400' :
                                                                            task.priority === 'Medium' ? 'border-amber-200 text-amber-600 dark:border-amber-500/30 dark:text-amber-400' :
                                                                            'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
                                                                        }`}>
                                                                            {task.priority || 'Normal'}
                                                                        </div>
                                                                        <div className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border ${
                                                                            task.taskType === 'result' ? 'border-indigo-200 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-400' :
                                                                            task.taskType === 'placement' ? 'border-purple-200 text-purple-600 dark:border-purple-500/30 dark:text-purple-400' :
                                                                            'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
                                                                        }`}>
                                                                            {task.taskType}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-full tracking-tight transition-all">
                                                                        {task.title}
                                                                    </h3>

                                                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                                                                                <Users className="w-3 h-3 text-slate-400" />
                                                                            </div>
                                                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                                                {task.isBatch ? `${task.totalCount} Mentees assigned` : (profile?.role === 'mentor' ? task.otherName : 'Mentor: ' + task.otherName)}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${task.deadlineStatus === 'overdue' ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                            <Clock className="w-3.5 h-3.5" />
                                                                            <span>{activeTab === 'completed' ? 'Completed ' : 'Due '} {task.dueDate}</span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {task.isBatch && (
                                                                        <div className="mt-3 space-y-2">
                                                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                                <span>Overall Progress</span>
                                                                                <span>{task.completedCount} / {task.totalCount} Completed</span>
                                                                            </div>
                                                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${task.totalCount > 0 ? Math.round((task.completedCount / task.totalCount) * 100) : 0}%` }} />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2.5 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                                                                {task.isBatch ? (
                                                                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                                                                className="flex-none px-3 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center border border-red-200/50 dark:border-red-500/20 shadow-sm"
                                                                                title="Delete Entire Batch"
                                                                            >
                                                                                <X className="w-5 h-5" />
                                                                            </button>
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleExport(task.title); }}
                                                                                className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                                                                            >
                                                                                <Download className="w-4 h-4 text-primary" />
                                                                                <span>Export Logs</span>
                                                                            </button>
                                                                        </div>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); toggleBatch(task.batchId); }}
                                                                            className="w-full sm:w-auto px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg sm:shadow-md"
                                                                        >
                                                                            {expandedBatches.has(task.batchId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                                            {expandedBatches.has(task.batchId) ? 'Hide List' : 'View Mentees'}
                                                                        </button>
                                                                    </div>
                                                                ) : profile?.role === 'mentor' ? (
                                                                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                                                                        {task.rawStatus === 'pending' && (
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors">Delete</button>
                                                                        )}
                                                                        {task.rawStatus === 'submitted' && (
                                                                            <>
                                                                                <button onClick={(e) => { e.stopPropagation(); handleRequestChanges(task.id); }} className="flex-1 lg:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors">Request Revision</button>
                                                                                <button onClick={(e) => { e.stopPropagation(); handleReviewTask(task.id); }} className="flex-1 lg:flex-none px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors">Approve</button>
                                                                            </>
                                                                        )}
                                                                        {task.rawStatus === 'reviewed' && (
                                                                            <div className="px-4 py-2 flex items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-sm font-semibold">
                                                                                Verified
                                                                            </div>
                                                                        )}
                                                                        {(task.taskType === 'result' || task.taskType === 'placement') && (
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleExport(task.title); }}
                                                                                className="px-4 py-2 bg-white/50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                                                            >
                                                                                <FileText className="w-4 h-4" /> Export
                                                                            </button>
                                                                        )}
                                                                        {(task.rawStatus === 'in-progress') && (
                                                                            <div className="px-4 py-2 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm font-semibold">
                                                                                In Progress
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                                                                        {task.rawStatus === 'pending' && (
                                                                            <button onClick={(e) => { e.stopPropagation(); handleStartTask(task.id); }} className="flex-1 lg:flex-none px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors">Start Task</button>
                                                                    )}
                                                                    {(task.rawStatus === 'in-progress') && (
                                                                        <button onClick={(e) => { e.stopPropagation(); handleSubmitTask(task.id); }} className="flex-1 lg:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                                                                            {task.taskType === 'general' ? 'Submit' : 'Fill Details'}
                                                                        </button>
                                                                    )}
                                                                    {task.rawStatus === 'submitted' && (
                                                                        <div className="px-4 py-2 flex items-center justify-center bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700/50">
                                                                            Under Review
                                                                        </div>
                                                                    )}
                                                                    {task.rawStatus === 'reviewed' && (
                                                                        <div className="px-4 py-2 flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-500/20">
                                                                            Completed
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                        {task.feedback && profile?.role === 'mentee' && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, scale: 0.98 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="mt-4 p-5 rounded-2xl bg-slate-950 border border-red-500/30 shadow-xl relative overflow-hidden"
                                                            >
                                                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                                                    <AlertCircle className="w-12 h-12 text-red-500" />
                                                                </div>
                                                                <div className="flex items-center gap-2.5 mb-2 relative z-10">
                                                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">Mentor Revision Feedback</span>
                                                                </div>
                                                                <p className="text-[14px] font-medium text-slate-200 leading-relaxed italic relative z-10 pr-6">
                                                                    &quot;{task.feedback}&quot;
                                                                </p>
                                                            </motion.div>
                                                        )}
                                                </div>
                                            </motion.div>

                                            {/* Expanded Batch Items */}
                                            <AnimatePresence>
                                                {task.isBatch && expandedBatches.has(task.batchId) && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-slate-50 dark:bg-slate-900/30"
                                                    >
                                                        <div className="p-4 sm:p-6 space-y-3">
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Individual Mentees</p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {task.batchItems.map((bi: any) => (
                                                                    <div 
                                                                        key={bi.id} 
                                                                        onClick={() => {
                                                                            if (bi.rawStatus === 'submitted' || bi.rawStatus === 'reviewed' || bi.status === 'Revision Required') {
                                                                                setViewModal({ open: true, task: bi });
                                                                            }
                                                                        }}
                                                                        className={`p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-3 group/item transition-all ${
                                                                            (bi.rawStatus === 'submitted' || bi.rawStatus === 'reviewed' || bi.status === 'Revision Required') ? 'cursor-pointer hover:border-primary hover:shadow-md' : ''
                                                                        }`}
                                                                    >
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                                            bi.rawStatus === 'reviewed' ? 'bg-emerald-50 text-emerald-500' : 
                                                                            bi.rawStatus === 'submitted' ? 'bg-indigo-50 text-indigo-500' : 
                                                                            'bg-slate-100 text-slate-400'
                                                                        }`}>
                                                                            <User className="w-4 h-4" />
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{bi.otherName}</p>
                                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{bi.status}</p>
                                                                        </div>
                                                                        {(bi.rawStatus === 'submitted' || bi.rawStatus === 'reviewed') && (
                                                                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover/item:text-primary transition-colors" />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </AnimatePresence>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </div>

            {/* Create Task Modal */}
            <AnimatePresence>
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
                    >
                        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assign New Task</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form noValidate onSubmit={handleCreateTask} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                            <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Task Type</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {[
                                        { key: 'general', label: 'General', icon: ClipboardList, desc: 'Custom description task' },
                                        { key: 'result', label: 'Result Form', icon: GraduationCap, desc: 'Marks & grades entry' },
                                        { key: 'placement', label: 'Placement', icon: Briefcase, desc: 'Placement status form' },
                                    ].map(opt => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => {
                                                const autoTitle = opt.key === 'result' ? 'Submit Your Academic Results' : opt.key === 'placement' ? 'Update Placement Status' : '';
                                                setNewTask({ ...newTask, task_type: opt.key as any, title: autoTitle });
                                            }}
                                            className={`p-3 rounded-2xl border-2 text-left transition-all ${
                                                newTask.task_type === opt.key
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                            }`}
                                        >
                                            <opt.icon className={`w-4 h-4 mb-1 ${newTask.task_type === opt.key ? 'text-primary' : 'text-slate-400'}`} />
                                            <p className={`text-xs font-bold ${newTask.task_type === opt.key ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</p>
                                            <p className="text-[10px] text-slate-400">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Task Parameters</label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                                    placeholder="e.g. Complete Chapters 1-3"
                                    dir="auto"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Target Operative(s)</label>
                                <div className="relative group/select">
                                    <select
                                        value={newTask.mentee_id}
                                        onChange={e => setNewTask({ ...newTask, mentee_id: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium appearance-none"
                                    >
                                        <option value="" disabled>Select a Mentee</option>
                                        <optgroup label="Group Actions">
                                            <option value="all" className="font-bold text-primary">👥 All Mentees</option>
                                        </optgroup>
                                        <optgroup label="Individual Mentees">
                                            {myMentees.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.student_id})</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-primary transition-colors">
                                        <User className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Deadline & Priority Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Deadline</label>
                                    <input
                                        type="datetime-local"
                                        value={newTask.due_date}
                                        onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Priority</label>
                                    <div className="flex gap-2">
                                        {(['High', 'Normal'] as const).map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setNewTask({ ...newTask, priority: p })}
                                                className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl border-2 transition-all active:scale-95 ${
                                                    newTask.priority === p 
                                                        ? p === 'High' ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400' : 'border-slate-800 bg-slate-800 text-white dark:border-slate-700 dark:bg-slate-700 dark:text-white' 
                                                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Result-specific config fields */}
                            {newTask.task_type === 'result' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Exam Title (Optional)</label>
                                        <input
                                            type="text"
                                            value={newTask.headline || ''}
                                            onChange={e => setNewTask({ ...newTask, headline: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                                            placeholder="e.g. Semester 4 - Mid Term 1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Exam Type</label>
                                        <div className="flex gap-2">
                                             {['mid', 'ia', 'end-sem'].map((examKey) => {
                                                const examLabel: Record<string,string> = {'mid':'Mid Exam','ia':'IA','end-sem':'End Sem'};
                                                return (
                                                    <button key={examKey} type="button"
                                                        onClick={() => setNewTask({ ...newTask, examType: examKey as 'mid'|'ia'|'end-sem' })}
                                                        className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl border-2 transition-all active:scale-95 ${newTask.examType === examKey ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                                                    >{examLabel[examKey]}</button>
                                                );
                                             })}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Additional Instructions (Optional)</label>
                                        <textarea
                                            value={newTask.description || ''}
                                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium resize-none"
                                            rows={3}
                                            placeholder="Any specific instructions for submitting results..."
                                            dir="auto"
                                        />
                                    </div>
                                </div>
                            )}
                            {newTask.task_type === 'general' && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Description</label>
                                    <textarea
                                        rows={3}
                                        value={newTask.description || ''}
                                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium resize-none"
                                        placeholder="Additional instructions for the mentee..."
                                    />
                                </div>
                            )}
                        </form>

                        {/* Modal Footer */}
                        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 flex items-center justify-end gap-3 shrink-0">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setNewTask({ title: "", mentee_id: "", due_date: "", description: "", priority: "Normal", task_type: "general", headline: "", examType: "mid" });
                                }}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTask}
                                disabled={isCreating}
                                className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm flex items-center gap-2 shadow-sm"
                            >
                                {isCreating ? "Saving..." : "Create Task"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            </AnimatePresence>
            {/* Response Viewer Modal (Mentor) */}
            <AnimatePresence>
                {viewModal.open && viewModal.task && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-xl shadow-lg border border-white/10 overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="p-5 sm:p-7 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5 shrink-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight italic">Intelligence Report</h2>
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest pl-5">{viewModal.task.otherName} &bull; {viewModal.task.title}</p>
                                </div>
                                <button onClick={() => setViewModal({ open: false, task: null })} 
                                    className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/10 rounded-2xl transition-all active:rotate-90">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-5 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
                                <TaskResponseViewer task={viewModal.task} />
                            </div>

                            <div className="p-5 sm:p-7 border-t border-slate-100 dark:border-white/5 flex gap-4 bg-slate-50/50 dark:bg-white/5 shrink-0">
                                {viewModal.task.rawStatus === 'submitted' && (
                                    <>
                                        <button 
                                            onClick={() => {
                                                handleRequestChanges(viewModal.task.rawId);
                                                setViewModal({ open: false, task: null });
                                            }}
                                            className="flex-1 py-3 sm:py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/10"
                                        >
                                            Request Revisions
                                        </button>
                                        <button 
                                            onClick={() => {
                                                handleReviewTask(viewModal.task.rawId);
                                                setViewModal({ open: false, task: null });
                                            }}
                                            className="flex-1 py-3 sm:py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/30"
                                        >
                                            Approve Task
                                        </button>
                                    </>
                                )}
                                {viewModal.task.rawStatus === 'reviewed' && (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-center p-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                                            <CheckCircle2 className="w-5 h-5 mr-2" />
                                            <span className="font-bold">Task verified and completed</span>
                                        </div>
                                        <button 
                                            onClick={() => setViewModal({ open: false, task: null })}
                                            className="w-full py-4 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-2xl font-bold text-xs uppercase tracking-[0.2em]"
                                        >
                                            Close Details
                                        </button>
                                    </div>
                                )}
                                {viewModal.task.status === 'Revision Required' && (
                                    <button 
                                        onClick={() => setViewModal({ open: false, task: null })}
                                        className="w-full py-4 bg-red-500/10 text-red-600 border border-red-500/20 rounded-2xl font-bold text-xs uppercase tracking-[0.2em]"
                                    >
                                        Close Revision Log
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Structured Form Modal (Mentee fill-in) */}
            <AnimatePresence>
                {formModal.open && formModal.task && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{formModal.task.taskType === 'result' ? '📋 Result Submission' : '💼 Placement Status'}</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">{formModal.task.title}</p>
                                </div>
                                <button onClick={() => { setFormModal({ open: false, task: null }); setFormData({}); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 overflow-y-auto flex-1 space-y-4">
                                {formModal.task.taskType === 'result' ? (
                                    <ResultFillForm
                                        formData={formData}
                                        setFormData={setFormData}
                                        task={formModal.task}
                                        onUploadMarksheet={handleMarksheetUpload}
                                        marksheetUploading={marksheetUploading}
                                    />
                                ) : (
                                    /* Placement Form */
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Placement Status</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                {[
                                                    { key: 'placed', label: 'Placed' },
                                                    { key: 'not-placed', label: 'Not Placed' },
                                                    { key: 'higher-studies', label: 'Higher Studies' },
                                                    { key: 'other', label: 'Other' },
                                                ].map(opt => (
                                                    <button key={opt.key} type="button" onClick={() => setFormData((p: any) => ({ ...p, status: opt.key }))}
                                                        className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                                                            formData.status === opt.key
                                                                ? 'border-primary bg-primary/5 text-primary'
                                                                : 'border-slate-200 dark:border-slate-800 text-slate-600'
                                                        }`}>{opt.label}</button>
                                                ))}
                                            </div>
                                        </div>

                                        {formData.status === 'placed' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Company Name</label>
                                                    <input type="text" value={formData.company ?? ''} onChange={e => setFormData((p: any) => ({ ...p, company: e.target.value }))}
                                                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium" placeholder="e.g. Google, TCS, Infosys" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Job Role</label>
                                                    <input type="text" value={formData.role ?? ''} onChange={e => setFormData((p: any) => ({ ...p, role: e.target.value }))}
                                                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium" placeholder="e.g. Software Engineer" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Package (LPA)</label>
                                                    <input type="number" value={formData.package ?? ''} onChange={e => setFormData((p: any) => ({ ...p, package: e.target.value }))}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm" placeholder="e.g. 6.5" />
                                                </div>
                                            </div>
                                        )}

                                        {formData.status === 'higher-studies' && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Program / University</label>
                                                <input type="text" value={formData.higher_studies ?? ''} onChange={e => setFormData((p: any) => ({ ...p, higher_studies: e.target.value }))}
                                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm" placeholder="e.g. M.Tech at IIT Delhi" />
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Remarks (Optional)</label>
                                            <textarea rows={2} value={formData.remarks ?? ''} onChange={e => setFormData((p: any) => ({ ...p, remarks: e.target.value }))}
                                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm resize-none" placeholder="Anything else to add..." />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
                                <button onClick={() => { setFormModal({ open: false, task: null }); setFormData({}); }}
                                    className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all text-center">Cancel</button>
                                <button onClick={handleSubmitForm} disabled={isSubmittingForm || !formData.status && formModal.task.taskType === 'placement'}
                                    className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    {isSubmittingForm ? 'Submitting...' : 'Submit Form'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
        </>
    );
}


