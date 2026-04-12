"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, ArrowRight, CheckCircle2, Briefcase, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CONFIG } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { CustomDropdown } from "@/components/CustomDropdown";

const STEPS = ["Your Info", "Mentor Details"];

const DEPARTMENTS = [
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Communication",
    "Civil Engineering",
    "Mechanical Engineering",
    "Chemical Engineering",
    "Mathematics",
    "Physics",
    "Other",
];

export default function MentorJoinPage() {
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Step 1 fields
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [facultyId, setFacultyId] = useState("");
    const [department, setDepartment] = useState(DEPARTMENTS[0]);
    const [bio, setBio] = useState("");
    const [expertise, setExpertise] = useState("");

    // --- Step 1: Validate and advance ---
    const handleStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!fullName.trim()) {
            setError("Please enter your full name.");
            return;
        }
        if (!email.trim() || !email.includes("@")) {
            setError("Please enter a valid email address.");
            return;
        }

        // Enforce department-specific subdomain (e.g., @sot.pdpu.ac.in)
        if (!email.toLowerCase().endsWith(".pdpu.ac.in")) {
            setError("🚨 ACCESS DENIED: Only university department emails are permitted. Root domain or external emails are blocked.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setStep(2);
    };

    // --- Step 2: Submit — create account + profile ---
    const handleStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!facultyId.trim()) {
            setError("Please enter your Faculty / Employee ID.");
            return;
        }

        setLoading(true);

        // 1. Create Supabase Auth user with TIMEOUT protection
        const signUpPromise = supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: {
                    full_name: fullName.trim(),
                    role: "mentor",
                },
            },
        });

        // 30 second timeout for registration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) =>
            setTimeout(() => reject(new Error("The registration process timed out. This is usually due to a slow network connection. Please check your internet and try again.")), 30000)
        );

        let signUpData, signUpError;
        try {
            const result = await Promise.race([signUpPromise, timeoutPromise]);
            signUpData = result.data;
            signUpError = result.error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during registration.");
            setLoading(false);
            return;
        }

        if (signUpError) {
            const msg = signUpError.message?.toLowerCase() || "";
            if (msg.includes("already registered") || msg.includes("already exists")) {
                setError("Account exists. Attempting to log you in...");
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password
                });
                
                if (!signInError) {
                    setError("✅ Login successful! Redirecting to dashboard...");
                    setTimeout(() => router.push("/dashboard"), 1500);
                    return;
                } else {
                    setError("User already registered. Redirecting to login...");
                    setLoading(false);
                    setTimeout(() => router.push("/login"), 2500);
                    return;
                }
            }
            setError(signUpError.message || "Could not create account. Please try again.");
            setLoading(false);
            return;
        }

        // If session is null → email confirmation is ON → we cannot write to DB easily with RLS, BUT we can try
        const userId = signUpData.user!.id;
        const expertiseArray = expertise.split(',').map(e => e.trim()).filter(Boolean);
        const finalExpertise = expertiseArray.length > 0 ? expertiseArray : [department];

        // 2. Parallelize profile and mentor metadata writes
        try {
            const profilePromise = supabase.from("profiles").upsert({
                id: userId,
                email: email.trim(),
                full_name: fullName.trim(),
                role: "mentor",
                department: department,
                employee_id: facultyId.trim(),
                bio: bio.trim(),
                expertise: finalExpertise,
                created_at: new Date().toISOString(),
            });

            const mentorPromise = supabase.from("mentors").upsert({
                id: userId,
                rating: 5.0,
                is_accepting_mentees: true,
                max_mentees: 5
            });

            // Run in parallel for max performance
            const [profileRes, mentorRes] = await Promise.all([profilePromise, mentorPromise]);

            if (profileRes.error) console.warn("Profile upsert failed:", profileRes.error.message);
            if (mentorRes.error) console.warn("Mentor upsert failed:", mentorRes.error.message);
        } catch (err) {
            console.warn("Parallel profile creation failed:", err);
        }

        // 4. Redirect based on session
        setLoading(false);
        if (!signUpData.session) {
            setError("✅ Account created! Please confirm your email, then sign in.");
            setTimeout(() => router.push("/login"), 3000);
        } else {
            setError("✅ Enrollment Complete! Redirecting to dashboard...");
            setTimeout(() => router.push("/dashboard"), 1500);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
            {/* Background decor */}
            <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl glass p-6 sm:p-10 rounded-[40px] shadow-2xl border border-white/40 z-10"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <span className="text-white font-bold">{CONFIG.platform.logoText}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">{CONFIG.platform.name}</h2>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Mentor Portal</p>
                        </div>
                    </div>
                    {/* Progress dots */}
                    <div className="flex gap-2">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-8 rounded-full transition-all duration-500 ${i + 1 <= step
                                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                    : "bg-slate-200 dark:bg-slate-800"
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {/* ====================== */}
                    {/* STEP 1 — Personal Info */}
                    {/* ====================== */}
                    {step === 1 && (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleStep1}
                            className="space-y-5"
                        >
                            <div>
                                <p className="text-2xl font-bold dark:text-white">Join as a Mentor</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                    Create your mentor account to start guiding mentees.
                                </p>
                            </div>

                            {/* Full Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                    Full Name
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        required
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="e.g. Dr. Priya Sharma"
                                        className="w-full pl-10 pr-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 transition-all text-sm dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                    University Email
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        required
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="mentor@pdpu.ac.in"
                                        className="w-full pl-10 pr-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 transition-all text-sm dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                        Password
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            required
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min. 6 chars"
                                            className="w-full pl-10 pr-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 transition-all text-sm dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                        Confirm
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            required
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat password"
                                            className="w-full pl-10 pr-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 transition-all text-sm dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-500/25 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                >
                                    Continue <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2">
                                Already have an account?{" "}
                                <Link href="/login" className="text-emerald-600 font-bold hover:underline">
                                    Sign In
                                </Link>
                            </p>
                        </motion.form>
                    )}

                    {/* ======================== */}
                    {/* STEP 2 — Faculty Details */}
                    {/* ======================== */}
                    {step === 2 && (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleStep2}
                            className="space-y-5"
                        >
                            <div>
                                <p className="text-2xl font-bold dark:text-white">Mentor Details</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                    Your professional profile information.
                                </p>
                            </div>

                            {/* Grid for ID and Department */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Faculty ID */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                        Employee ID
                                    </label>
                                    <div className="relative group">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            required
                                            type="text"
                                            value={facultyId}
                                            onChange={(e) => setFacultyId(e.target.value)}
                                            placeholder="MEN-2024"
                                            className="w-full pl-10 pr-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 transition-all text-sm dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Department */}
                                <CustomDropdown
                                    label="Department"
                                    options={DEPARTMENTS}
                                    value={department}
                                    onChange={(val) => setDepartment(val)}
                                    icon={<Briefcase className="w-4 h-4" />}
                                />
                            </div>

                            {/* Expertise */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                    Areas of Expertise
                                </label>
                                <input
                                    type="text"
                                    value={expertise}
                                    onChange={(e) => setExpertise(e.target.value)}
                                    placeholder="e.g. Machine Learning, Web Dev, Algorithms (comma separated)"
                                    className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 transition-all text-sm dark:text-white"
                                />
                            </div>

                            {/* Bio */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                    Professional Bio
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Brief background about yourself to help mentees know you better..."
                                    className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 transition-all text-sm dark:text-white resize-none"
                                />
                            </div>

                            {/* Action row */}
                            <div className="pt-2 flex items-center justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setError(""); }}
                                    className="text-slate-500 font-bold hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-500/25 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                                >
                                    {loading ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <>Complete Registration <ArrowRight className="w-5 h-5" /></>
                                    )}
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-800 pt-6">
                    <p className="text-slate-500 text-sm italic flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Professional-grade security enabled
                    </p>
                </div>
            </motion.div>
        </div >
    );
}
