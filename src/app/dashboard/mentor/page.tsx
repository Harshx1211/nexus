"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
    ArrowLeft, Mail, BookOpen, Clock, 
    Calendar, MessageSquare, Award, 
    ExternalLink 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";

function MentorProfileContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const router = useRouter();
    useAuth(); // myProfile was unused
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [mentor, setMentor] = useState<any>(null);

    useEffect(() => {
        if (!id) return;

        const fetchMentor = async () => {
            setLoading(true);
            try {
                // Fetch basic profile
                const { data: profile, error: pError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (pError) throw pError;
                if (profile.role !== "mentor") {
                    throw new Error("This profile is not a mentor.");
                }

                setMentor(profile);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                logger.error("MentorProfile", "Failed to fetch mentor", err);
                toast(err.message || "Failed to load mentor profile.", "error");
                router.back();
            } finally {
                setLoading(false);
            }
        };

        fetchMentor();
    }, [id, router, toast]);

    if (loading) {
        return (
            <div className="p-10 space-y-8 animate-in fade-in duration-500">
                <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl shimmer-skeleton" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 h-[400px] bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shimmer-skeleton" />
                    <div className="lg:col-span-2 h-[400px] bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shimmer-skeleton" />
                </div>
            </div>
        );
    }

    if (!mentor) {
        return (
            <div className="p-10 text-center">
                <p className="text-slate-500 font-bold">No Mentor ID provided or profile not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10 p-6 sm:p-8 rounded-[32px] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-2xl shadow-primary/5">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors group w-fit"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Dashboard
                </button>
                <div className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/20 w-fit">
                    Faculty Profile
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass p-8 rounded-2xl border border-white/40 dark:border-slate-800/50 text-center space-y-6 relative overflow-hidden group shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-primary/20 to-blue-500/10 -z-10 group-hover:scale-110 transition-transform duration-700" />
                        
                        <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 mx-auto flex items-center justify-center text-primary text-3xl font-bold shadow-xl ring-4 ring-white dark:ring-slate-900 group-hover:rotate-3 transition-transform">
                            {mentor.full_name?.charAt(0).toUpperCase()}
                        </div>

                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{mentor.full_name}</h1>
                            <p className="text-sm font-bold text-primary uppercase tracking-widest opacity-80">Mentor &middot; Faculty</p>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-left group/item hover:bg-primary/5 transition-colors">
                                <Mail className="w-4 h-4 text-slate-400 group-hover/item:text-primary transition-colors" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{mentor.email}</p>
                                </div>
                            </div>
                            {(mentor.employee_id || mentor.student_id) && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-left hover:bg-primary/5 transition-colors">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Faculty ID</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{mentor.employee_id || mentor.student_id}</p>
                                    </div>
                                </div>
                            )}
                            {mentor.department && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-left hover:bg-primary/5 transition-colors">
                                    <Award className="w-4 h-4 text-slate-400" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{mentor.department}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => router.push(`/dashboard/messages?chat=${id}`)}
                            className="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group/btn active:scale-[0.98]"
                        >
                            <MessageSquare className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            Message Mentor
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Expertise & Bio */}
                    <div className="glass p-8 sm:p-10 rounded-2xl border border-white/40 dark:border-slate-800/50 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-500" />
                                Areas of Expertise
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {mentor.expertise && mentor.expertise.length > 0 ? (
                                    mentor.expertise.map((tag: string, i: number) => (
                                        <span key={i} className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                            {tag}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No expertise specified yet.</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-500" />
                                Professional Bio
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                {mentor.bio || `${mentor.designation || 'Faculty Member'} ${mentor.full_name} is a dedicated mentor at NEXUS helping students achieve their academic and professional goals.`}
                            </p>
                            {mentor.designation && (
                                <div className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 w-fit">
                                    <p className="text-xs font-bold text-slate-500">Designation: <span className="text-slate-900 dark:text-white">{mentor.designation}</span></p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats or Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-6 rounded-[32px] bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 space-y-4 shadow-sm group hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-900 dark:text-white">Schedule Session</h3>
                                <p className="text-xs text-slate-500 font-medium">Request a new meeting with your mentor.</p>
                            </div>
                            <button 
                                onClick={() => router.push('/dashboard/sessions')}
                                className="w-full py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:bg-primary group-hover:text-white transition-all"
                            >
                                Open Sessions
                            </button>
                        </div>

                        <div className="p-6 rounded-[32px] bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 space-y-4 shadow-sm group hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                <ExternalLink className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-900 dark:text-white">Mentor Announcements</h3>
                                <p className="text-xs text-slate-500 font-medium">Check latest updates from your mentor.</p>
                            </div>
                            <button 
                                onClick={() => router.push('/dashboard/announcements')}
                                className="w-full py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:bg-primary group-hover:text-white transition-all"
                            >
                                View Updates
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MentorProfilePage() {
    return (
        <Suspense fallback={<div className="p-10 space-y-8 shimmer-skeleton h-screen" />}>
            <MentorProfileContent />
        </Suspense>
    );
}

