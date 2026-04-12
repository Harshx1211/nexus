"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Mail, Lock, ArrowRight, ArrowLeft,
    Hash, Briefcase, Building2,
    ShieldCheck, GraduationCap, BookOpen, Users
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CONFIG } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { CustomDropdown } from "@/components/CustomDropdown";

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const roleParam = searchParams.get("role") as "mentee" | "mentor" | null;
    const [role, setRole] = useState<"mentee" | "mentor">(roleParam === "mentor" ? "mentor" : "mentee");
    const roleIsFixed = !!roleParam; // Hide the toggle if role came from landing page

    useEffect(() => {
        if (roleParam === "mentor" || roleParam === "mentee") {
            setRole(roleParam);
        }
    }, [roleParam]);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Mentee fields
    const [studentId, setStudentId] = useState("");
    const [semester, setSemester] = useState("Semester 1");
    const [section, setSection] = useState("");
    const [fatherName, setFatherName] = useState("");
    const [motherName, setMotherName] = useState("");
    const [fatherMobile, setFatherMobile] = useState("");
    const [motherMobile, setMotherMobile] = useState("");
    const [fatherOccupation, setFatherOccupation] = useState("");
    const [motherOccupation, setMotherOccupation] = useState("");

    // Mentor fields
    const [employeeId, setEmployeeId] = useState("");
    const [designation, setDesignation] = useState("");
    const [department, setDepartment] = useState("");

    const totalSteps = role === "mentee" ? 3 : 2;

    const handleStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!fullName.trim()) { setError("Please enter your full name."); return; }
        if (!/^[a-zA-Z\s]+$/.test(fullName.trim())) {
            setError("Name must contain only alphabets.");
            return;
        }
        if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email address."); return; }
        if (!email.toLowerCase().endsWith(".pdpu.ac.in")) {
            setError("Only university emails (@*.pdpu.ac.in) are permitted.");
            return;
        }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        setStep(2);
    };

    const handleStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (role === "mentee") {
            if (!studentId.trim()) { setError("Roll number is required."); return; }
            if (!section.trim()) { setError("Section is required."); return; }
            setStep(3);
        } else {
            if (!employeeId.trim()) { setError("Mentor ID is required."); return; }
            if (!designation.trim()) { setError("Designation is required."); return; }
            if (!department.trim()) { setError("Department is required."); return; }
            await handleFinalSubmit();
        }
    };

    const handleStep3 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!fatherName.trim() || !motherName.trim() || !fatherMobile.trim() || !motherMobile.trim() || !fatherOccupation.trim() || !motherOccupation.trim()) {
            setError("All parent details including occupations are required.");
            return;
        }
        if (!/^[a-zA-Z\s]+$/.test(fatherName.trim()) || !/^[a-zA-Z\s]+$/.test(motherName.trim())) {
            setError("Parent names must contain only alphabets.");
            return;
        }
        if (!/^[0-9]{10}$/.test(fatherMobile.trim()) || !/^[0-9]{10}$/.test(motherMobile.trim())) {
            setError("Mobile numbers must be exactly 10 digits.");
            return;
        }
        await handleFinalSubmit();
    };

    const handleFinalSubmit = async () => {
        setLoading(true);
        setError("");
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const signupData: any = { full_name: fullName.trim(), role };
            if (role === "mentee") {
                Object.assign(signupData, {
                    student_id: studentId.trim(),
                    semester,
                    section: section.trim(),
                    father_name: fatherName.trim(),
                    mother_name: motherName.trim(),
                    father_mobile: fatherMobile.trim(),
                    mother_mobile: motherMobile.trim(),
                    father_occupation: fatherOccupation.trim(),
                    mother_occupation: motherOccupation.trim(),
                });
            } else {
                Object.assign(signupData, {
                    employee_id: employeeId.trim(),
                    designation: designation.trim(),
                    department: department.trim(),
                });
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: signupData },
            });

            if (signUpError) {
                const msg = signUpError.message?.toLowerCase() || "";
                if (msg.includes("already registered") || msg.includes("already exists")) {
                    const { error: siError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                    if (!siError) { router.push("/dashboard"); return; }
                }
                setError(signUpError.message || "Failed to create account.");
                setLoading(false);
                return;
            }

            router.push("/dashboard");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError("An unexpected error occurred. Please try again.");
            setLoading(false);
        }
    };

    const inp = "w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm text-slate-900 dark:text-white placeholder:text-slate-400";
    const lbl = "block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="text-white font-black text-lg">{CONFIG.platform.logoText}</span>
                        </div>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{CONFIG.platform.name}</span>
                    </Link>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Create your account to get started</p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/60 border border-slate-200/80 dark:border-white/5 overflow-hidden">

                    {/* Top Bar: Role Toggle + Progress */}
                    <div className="px-7 pt-7 pb-5 border-b border-slate-100 dark:border-white/5">
                        {/* Role Toggle — only shown when role is NOT pre-set from landing page */}
                        <div className="flex items-center justify-between mb-5">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Account Type</p>
                            {roleIsFixed ? (
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                                    role === "mentee"
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                }`}>
                                    {role === "mentee" ? <GraduationCap className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                                    {role === "mentee" ? "Mentee Registration" : "Mentor Registration"}
                                </div>
                            ) : (
                                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => { setRole("mentee"); setStep(1); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            role === "mentee"
                                                ? "bg-primary text-white shadow-md shadow-primary/30"
                                                : "text-slate-500 hover:text-slate-700"}`}
                                    >
                                        <GraduationCap className="w-3.5 h-3.5" /> Mentee
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setRole("mentor"); setStep(1); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            role === "mentor"
                                                ? "bg-primary text-white shadow-md shadow-primary/30"
                                                : "text-slate-500 hover:text-slate-700"}`}
                                    >
                                        <Briefcase className="w-3.5 h-3.5" /> Mentor
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Step Progress */}
                        <div className="flex items-center gap-2">
                            {Array.from({ length: totalSteps }).map((_, i) => (
                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i + 1 <= step ? "bg-primary shadow-sm shadow-primary/40" : "bg-slate-200 dark:bg-slate-700"}`} />
                            ))}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            Step {step} of {totalSteps} — {step === 1 ? "Account Info" : step === 2 ? (role === "mentee" ? "Academic Details" : "Mentor Details") : "Parent Information"}
                        </p>
                    </div>

                    {/* Form Area */}
                    <div className="px-7 py-6">
                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            {/* ── STEP 1: Account Info ─────────────────────── */}
                            {step === 1 && (
                                <motion.form
                                    key="s1"
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 16 }}
                                    onSubmit={handleStep1}
                                    className="space-y-4"
                                >
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                            {role === "mentee" ? "Mentee Registration" : "Mentor Registration"}
                                        </h2>
                                        <p className="text-sm text-slate-500 mt-0.5">Enter your basic account details below.</p>
                                    </div>

                                    <div className="space-y-4 pt-1">
                                        <div>
                                            <label className={lbl}>Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Harsh Patel" className={inp} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={lbl}>{role === "mentee" ? "University Email" : "Mentor Email"}</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    required type="email" value={email}
                                                    onChange={(e) => {
                                                        setEmail(e.target.value);
                                                        if (role === "mentee" && e.target.value.includes("@")) {
                                                            setStudentId(e.target.value.split("@")[0].toUpperCase());
                                                        }
                                                    }}
                                                    placeholder="example@sot.pdpu.ac.in"
                                                    className={inp}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={lbl}>Password</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 chars" className={inp} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={lbl}>Confirm</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat" className={inp} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" className="w-full py-3.5 mt-2 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm">
                                        Continue <ArrowRight className="w-4 h-4" />
                                    </button>
                                    <p className="text-center text-sm text-slate-500">
                                        Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Sign In</Link>
                                    </p>
                                </motion.form>
                            )}

                            {/* ── STEP 2: Academic / Mentor Details ──────── */}
                            {step === 2 && (
                                <motion.form
                                    key="s2"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    onSubmit={handleStep2}
                                    className="space-y-4"
                                >
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                            {role === "mentee" ? "Academic Details" : "Mentor Details"}
                                        </h2>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                            {role === "mentee" ? "Your academic information for records." : "Your professional information."}
                                        </p>
                                    </div>

                                    {role === "mentee" ? (
                                        <div className="space-y-4 pt-1">
                                            <div>
                                                <label className={lbl}>Roll Number (Auto-detected)</label>
                                                <div className="relative">
                                                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                                    <input readOnly type="text" value={studentId} className={inp + " cursor-not-allowed opacity-70 font-bold text-primary"} />
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Derived automatically from your email prefix.</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className={lbl}>Semester</label>
                                                    <CustomDropdown
                                                        label="Semester"
                                                        options={[1, 2, 3, 4, 5, 6, 7, 8].map((s) => `Semester ${s}`)}
                                                        value={semester}
                                                        onChange={setSemester}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={lbl}>Section</label>
                                                    <div className="relative">
                                                        <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input required type="text" value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} placeholder="e.g. A, B, C1" className={inp} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 pt-1">
                                            <div>
                                                <label className={lbl}>Mentor ID</label>
                                                <div className="relative">
                                                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input required type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value.toUpperCase())} placeholder="e.g. EMP12345" className={inp} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={lbl}>Designation</label>
                                                <div className="relative">
                                                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input required type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Associate Professor" className={inp} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={lbl}>Department</label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input required type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science (SOT)" className={inp} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-1">
                                        <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-3.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm">
                                            <ArrowLeft className="w-4 h-4" />
                                        </button>
                                        <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-60">
                                            {loading ? "Processing..." : role === "mentee" ? "Continue" : "Create Account"}
                                        </button>
                                    </div>
                                </motion.form>
                            )}

                            {/* ── STEP 3: Parent Info (Mentee only) ───────── */}
                            {step === 3 && (
                                <motion.form
                                    key="s3"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    onSubmit={handleStep3}
                                    className="space-y-4"
                                >
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Parent / Guardian Info</h2>
                                        <p className="text-sm text-slate-500 mt-0.5">Required for mentee records. Stored securely.</p>
                                    </div>

                                    <div className="space-y-4 pt-1">
                                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Users className="w-4 h-4 text-primary" />
                                                <p className="text-xs font-black text-primary uppercase tracking-widest">Father&apos;s Details</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input required type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} placeholder="Father's Full Name" className={inp} />
                                                <input required type="tel" value={fatherMobile} onChange={(e) => setFatherMobile(e.target.value)} placeholder="Father's Mobile" className={inp} />
                                                <input required type="text" value={fatherOccupation} onChange={(e) => setFatherOccupation(e.target.value)} placeholder="Occupation" className={inp + " col-span-2"} />
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Users className="w-4 h-4 text-purple-500" />
                                                <p className="text-xs font-black text-purple-500 uppercase tracking-widest">Mother&apos;s Details</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input required type="text" value={motherName} onChange={(e) => setMotherName(e.target.value)} placeholder="Mother's Full Name" className={inp} />
                                                <input required type="tel" value={motherMobile} onChange={(e) => setMotherMobile(e.target.value)} placeholder="Mother's Mobile" className={inp} />
                                                <input required type="text" value={motherOccupation} onChange={(e) => setMotherOccupation(e.target.value)} placeholder="Occupation" className={inp + " col-span-2"} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-1">
                                        <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1 px-4 py-3.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm">
                                            <ArrowLeft className="w-4 h-4" />
                                        </button>
                                        <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-60">
                                            {loading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Creating Account...
                                                </span>
                                            ) : "Complete Registration"}
                                        </button>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    © {new Date().getFullYear()} {CONFIG.platform.name} · {CONFIG.university.name}
                </p>
            </motion.div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
