/**
 * @file dashboard/settings/page.tsx
 * @description User profile settings page.
 *
 * Allows both mentors and mentees to update their full name, bio, and role-specific
 * details (expertise for mentors, career goals for mentees).
 * Profile data is persisted to the Supabase `profiles` and `mentees` tables.
 */

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    User,
    Save,
    Mail,
    Users,
    Briefcase,
    Building2,
    ShieldCheck,
    Hash
} from "lucide-react";
import { CONFIG } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";



export default function SettingsPage() {
    const { user, profile, displayName, refreshProfile } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || (displayName !== "User" ? displayName : ""));
    const [bio, setBio] = useState(profile?.bio || "");
    const [expertise, setExpertise] = useState(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exp = (profile as any)?.expertise;
        return Array.isArray(exp) ? exp.join(", ") : (exp || "");
    });
    const [academicGoals, setAcademicGoals] = useState("");
    const [semester, setSemester] = useState(profile?.semester || "");
    const [section, setSection] = useState(profile?.section || "");
    const [branch, setBranch] = useState(profile?.department || "");
    const [studentId, setStudentId] = useState(profile?.student_id || user?.user_metadata?.student_id || "");

    // Mentor Specific State
    const [employeeId, setEmployeeId] = useState("");
    const [designation, setDesignation] = useState("");
    const [department, setDepartment] = useState("");

    // Parent Information State
    const [isMenteeDataLoading, setIsMenteeDataLoading] = useState(false);
    const [menteeRecordExists, setMenteeRecordExists] = useState(false);
    const [fatherName, setFatherName] = useState("");
    const [motherName, setMotherName] = useState("");
    const [fatherMobile, setFatherMobile] = useState("");
    const [motherMobile, setMotherMobile] = useState("");
    const [fatherOccupation, setFatherOccupation] = useState("");
    const [motherOccupation, setMotherOccupation] = useState("");


    // Load initial values when profile changes
    useEffect(() => {
        if (profile) {
            logger.info("SettingsPage", `Profile loaded. ID: ${profile.id}, Role: ${profile.role}`);
            setBio(profile.bio || "");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const exp = (profile as any).expertise;
            setExpertise(Array.isArray(exp) ? exp.join(", ") : (exp || ""));
            
            // Sync semester/section/studentId from profile always
            setSemester(profile.semester || "");
            setSection(profile.section || "");
            setBranch(profile.department || "");
            setDepartment(profile.department || "");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setDesignation((profile as any).designation || "");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setEmployeeId((profile as any).employee_id || "");
            
            // For roll number, always prioritize the email-prefix if it's a mentee, 
            // OR use the stored student_id if it exists.
            const derivedId = user?.email ? user.email.split('@')[0].toUpperCase() : "";
            setStudentId(profile.student_id || derivedId);

            // If mentee, fetch additional details from mentees table
            if (profile.role === 'mentee') {
                const fetchMenteeData = async () => {
                    setIsMenteeDataLoading(true);
                    logger.info("SettingsPage", `Fetching mentee data for ID: ${profile.id}`);
                    try {
                        const { data: menteeData, error } = await supabase
                            .from('mentees')
                            .select('career_goals, father_name, mother_name, father_mobile, mother_mobile, father_occupation, mother_occupation')
                            .eq('id', profile.id)
                            .maybeSingle();

                        if (error) {
                            logger.error("SettingsPage", "Critical error fetching mentee data from table 'mentees'", error);
                            toast(`Database Error: ${error.message}. Please contact support.`, "error");
                            return;
                        }

                        if (menteeData) {
                            logger.info("SettingsPage", "Mentee data successfully fetched from DB", menteeData);
                            setMenteeRecordExists(true);
                            setAcademicGoals(menteeData.career_goals || "");
                            setFatherName(menteeData.father_name || "");
                            setMotherName(menteeData.mother_name || "");
                            setFatherMobile(menteeData.father_mobile || "");
                            setMotherMobile(menteeData.mother_mobile || "");
                            setFatherOccupation(menteeData.father_occupation || "");
                            setMotherOccupation(menteeData.mother_occupation || "");
                        } else {
                            logger.warn("SettingsPage", "No record found in 'mentees' table for this ID. A new row will be created when you click Save.");
                            setMenteeRecordExists(false);
                        }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        logger.error("SettingsPage", "Unexpected error in fetchMenteeData", e);
                    } finally {
                        setIsMenteeDataLoading(false);
                    }
                };
                fetchMenteeData();
            } else {
                logger.info("SettingsPage", "User is not a mentee, skipping mentee-specific data fetch.");
            }
        } else if (displayName && displayName !== "User" && !fullName) {
             setFullName(displayName);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, displayName, user?.email]);

    const handleSave = async () => {
        if (!user?.id) return;
        setIsSaving(true);


        const saveOperation = async () => {
            const currentRole = profile?.role || user?.user_metadata?.role;

            // Form validation for mentees
            if (currentRole === 'mentee') {
                // BUG FIX: If the fields are empty but NO record exists yet (initial save),
                // OR if the user is explicitly trying to fill one, check them.
                // Otherwise, don't crash the bio-save if they haven't filled it yet.
                const anyParentField = fatherName.trim() || motherName.trim() || fatherMobile.trim() || motherMobile.trim() || fatherOccupation.trim() || motherOccupation.trim();
                
                if (!menteeRecordExists || anyParentField) {
                    // All parent information is mandatory
                    if (!fatherName.trim() || !motherName.trim() || !fatherMobile.trim() || !motherMobile.trim() || !fatherOccupation.trim() || !motherOccupation.trim()) {
                         throw new Error("All parent information fields (including Father's & Mother's Occupation) are mandatory. Please complete all 6 fields.");
                    }
                    if (!/^\d{10}$/.test(fatherMobile.trim()) || !/^\d{10}$/.test(motherMobile.trim())) {
                         throw new Error("Parent mobile numbers must be exactly 10 digits.");
                    }
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profileUpdate: any = {
                full_name: fullName.trim(),
                bio: bio.trim(),
                student_id: studentId.trim() || user.email?.split('@')[0].toUpperCase(),
                semester: semester,
                section: section.trim(),
                department: currentRole === 'mentee' ? branch.trim() : department.trim(),
                designation: designation.trim(),
                employee_id: employeeId.trim()
            };

            // Only update expertise if mentor
            if (currentRole === 'mentor') {
                profileUpdate.expertise = expertise.split(',').map((e: string) => e.trim()).filter(Boolean);
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    ...profileUpdate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (profileError) {
                logger.error("SettingsPage", "Profile update failed", profileError);
                throw profileError;
            }

            // If mentee, update record in mentees table
            if (currentRole === 'mentee') {
                logger.info("SettingsPage", "Updating mentee-specific record...");
                // use upsert here just in case the mentee row strictly doesn't exist yet
                // although the db trigger should have created it. Mentees table has fewer NOT NULLs.
                const { error: menteeError } = await supabase
                    .from('mentees')
                    .upsert({ 
                        id: user.id,
                        career_goals: academicGoals,
                        father_name: fatherName.trim(),
                        mother_name: motherName.trim(),
                        father_mobile: fatherMobile.trim(),
                        mother_mobile: motherMobile.trim(),
                        father_occupation: fatherOccupation.trim(),
                        mother_occupation: motherOccupation.trim()
                    }, { onConflict: 'id' });
                
                if (menteeError) {
                    logger.error("SettingsPage", "Mentee update failed", menteeError);
                    throw menteeError;
                }
            }

            await refreshProfile();
        };


        try {
            // WRAP ENTIRE OPERATION IN TIMEOUT RACE to prevent "Saving..." hang
            const savePromise = saveOperation();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('TIMEOUT_LIMIT')), 12000)
            );

            await Promise.race([savePromise, timeoutPromise]);
            toast("Profile updated successfully!", "success");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error?.message === 'TIMEOUT_LIMIT') {
                toast("Profile update is taking longer than expected. Please refresh the page manually to see changes.", "warning");
            } else {
                logger.error("SettingsPage", "Error updating profile", error);
                const errorMessage = error.message || "Please check your connection and try again.";
                toast(`Failed to update profile: ${errorMessage}`, "error");
            }
        } finally {
            // ALWAYS reset saving state, even if refreshProfile is still running in background
            setIsSaving(false);
            // Re-fetch profile one last time just in case
            refreshProfile().catch(() => {});
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Command Center <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-xl font-bold uppercase tracking-widest border border-primary/20">Settings</span>
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
                        Manage your account and professional details.
                    </p>
                </div>
            </div>

            <div className="glass p-5 sm:p-6 rounded-2xl border border-white/40 dark:border-slate-800/50">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 sm:space-y-10">
                    {/* Profile Header */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 bg-slate-50/50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5 transition-all">
                        <div className="relative group shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20 p-1">
                                <div className="w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner">
                                    <span className="text-xl sm:text-2xl font-bold text-primary">
                                        {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-center sm:text-left min-w-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">{fullName || displayName}</h2>
                            <p className="text-sm border-b border-transparent font-semibold capitalize text-slate-500 flex flex-wrap items-center justify-center sm:justify-start gap-1">
                                {!profile ? 'Synchronizing Profile...' : profile?.role === 'mentee' ? 'Mentee' : profile?.role === 'mentor' ? 'Mentor' : 'External Member'} 
                                <span className="opacity-30 mx-1">•</span> 
                                <span className="truncate">{CONFIG.university.name}</span>
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">Verified Profile</span>
                                {profile?.role === 'mentor' && (
                                    <span className="bg-primary/10 text-primary text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-primary/20">Mentor</span>
                                )}
                                {profile?.role === 'mentee' && (
                                    <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-500/20">Active Mentee</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="email" defaultValue={profile?.email || user?.email || ''} readOnly className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none text-slate-500 cursor-not-allowed transition-all text-sm" />
                            </div>
                        </div>

                        {profile?.role === 'mentee' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                        University Roll Number <span className="text-[10px] text-primary/60 font-bold uppercase ml-1">(Derived from Email)</span>
                                    </label>
                                    <div className="relative group opacity-80">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 font-bold text-xs flex items-center justify-center">#</div>
                                        <input 
                                            readOnly 
                                            type="text" 
                                            value={studentId} 
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none text-primary font-bold text-sm cursor-not-allowed" 
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 ml-1">Roll numbers are automatically derived from your university email prefix.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Current Semester</label>
                                        <select 
                                            value={semester} 
                                            onChange={(e) => setSemester(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm font-medium"
                                        >
                                            <option value="">Select Semester</option>
                                            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Section</label>
                                        <input 
                                            type="text" 
                                            value={section} 
                                            onChange={(e) => setSection(e.target.value.toUpperCase())}
                                            placeholder="e.g. A, B, C-1"
                                            className="w-full px-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm font-medium" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Academic Branch</label>
                                    <input 
                                        type="text" 
                                        value={branch} 
                                        readOnly={!!profile?.department}
                                        onChange={(e) => setBranch(e.target.value)}
                                        placeholder="e.g. Computer Science (CSE)"
                                        className={`w-full px-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none transition-all text-sm font-medium ${profile?.department ? 'cursor-not-allowed opacity-70 bg-slate-100/50' : 'focus:border-primary'}`} 
                                    />
                                    {profile?.department && <p className="text-[10px] text-slate-500 ml-1 italic">Branch can only be changed by your mentor.</p>}
                                </div>
                            </>
                        )}

                        {/* BUG-10 FIX: Bio is always visible, properly placed as a grid child with col-span-2 */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">About Me (Bio)</label>
                            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none resize-none" placeholder="Write a short professional bio..." />
                        </div>

                        {profile?.role === 'mentor' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Mentor ID</label>
                                    <div className="relative group">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all" />
                                        <input 
                                            type="text" 
                                            value={employeeId} 
                                            onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                                            placeholder="e.g. EMP12345"
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm font-medium" 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Designation</label>
                                        <div className="relative group">
                                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all" />
                                            <input 
                                                type="text" 
                                                value={designation} 
                                                onChange={(e) => setDesignation(e.target.value)}
                                                placeholder="e.g. Associate Professor"
                                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm font-medium" 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Department</label>
                                        <div className="relative group">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all" />
                                            <input 
                                                type="text" 
                                                value={department} 
                                                onChange={(e) => setDepartment(e.target.value)}
                                                placeholder="e.g. Computer Science (SOT)"
                                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm font-medium" 
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Area of Expertise</label>
                                    <div className="relative group">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all" />
                                        <input 
                                            type="text" 
                                            value={expertise} 
                                            onChange={e => setExpertise(e.target.value)} 
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary transition-all text-sm font-medium" 
                                            placeholder="e.g. Frontend Development, Machine Learning, UI/UX" 
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {profile?.role === 'mentee' && (
                            <div className="space-y-6 md:col-span-2 pt-4 border-t border-slate-100 dark:border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Parent Information</h3>
                                    </div>
                                    {isMenteeDataLoading && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold animate-pulse">
                                            <div className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                            Syncing Database...
                                        </div>
                                    )}
                                    {!isMenteeDataLoading && menteeRecordExists && fatherName && (
                                        <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-white/5 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Locked for Security</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300 ${isMenteeDataLoading ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                                    {/* Father Section */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Father&apos;s Name</label>
                                        <input readOnly={menteeRecordExists && !!fatherName} required type="text" value={fatherName} onChange={e => setFatherName(e.target.value)} className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white transition-all outline-none ${menteeRecordExists && fatherName ? 'cursor-not-allowed opacity-70 bg-slate-100/50' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/50'}`} placeholder="Father's Full Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Mother&apos;s Name</label>
                                        <input readOnly={menteeRecordExists && !!motherName} required type="text" value={motherName} onChange={e => setMotherName(e.target.value)} className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white transition-all outline-none ${menteeRecordExists && motherName ? 'cursor-not-allowed opacity-70 bg-slate-100/50' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/50'}`} placeholder="Mother's Full Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Father&apos;s Mobile</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">+91</div>
                                            <input readOnly={menteeRecordExists && !!fatherMobile} required type="tel" value={fatherMobile} onChange={e => setFatherMobile(e.target.value)} className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white transition-all outline-none ${menteeRecordExists && fatherMobile ? 'cursor-not-allowed opacity-70 bg-slate-100/50' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/50'}`} placeholder="10-digit number" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Mother&apos;s Mobile</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">+91</div>
                                            <input readOnly={menteeRecordExists && !!motherMobile} required type="tel" value={motherMobile} onChange={e => setMotherMobile(e.target.value)} className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white transition-all outline-none ${menteeRecordExists && motherMobile ? 'cursor-not-allowed opacity-70 bg-slate-100/50' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/50'}`} placeholder="10-digit number" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Father&apos;s Occupation</label>
                                        <input readOnly={menteeRecordExists && !!fatherOccupation} required type="text" value={fatherOccupation} onChange={e => setFatherOccupation(e.target.value)} className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white transition-all outline-none ${menteeRecordExists && fatherOccupation ? 'cursor-not-allowed opacity-70 bg-slate-100/50' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/50'}`} placeholder="e.g. Engineer, Business" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Mother&apos;s Occupation</label>
                                        <input readOnly={menteeRecordExists && !!motherOccupation} required type="text" value={motherOccupation} onChange={e => setMotherOccupation(e.target.value)} className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white transition-all outline-none ${menteeRecordExists && motherOccupation ? 'cursor-not-allowed opacity-70 bg-slate-100/50' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/50'}`} placeholder="e.g. Teacher, Homemaker" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !profile}
                                className="w-full sm:w-auto px-6 py-3.5 bg-primary text-white font-bold rounded-xl shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                            >
                                {isSaving ? "Saving..." : <><Save className="w-5 h-5" /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

