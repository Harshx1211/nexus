"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, AlertCircle, Users, Briefcase, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRoleSelection, setShowRoleSelection] = useState(false);

    // Track whether Supabase has been pre-warmed
    const warmed = useRef(false);
    const [isWarming, setIsWarming] = useState(false);

    useEffect(() => {
        // 1. Check if user is already logged in — redirect immediately if so
        const checkExistingSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    window.location.replace("/dashboard");
                    return;
                }
            } catch (error) {
                logger.warn("LoginPage", "Error checking existing session", error);
            }
            // 2. Pre-warm Supabase silently so the server is ready when user clicks Sign In
            if (warmed.current) return;
            warmed.current = true;
            setIsWarming(true);
            try {
                await supabase.auth.getSession();
            } catch (error) {
                logger.debug("LoginPage", "Supabase pre-warm encountered error (expected sometimes)", error);
            } finally {
                setIsWarming(false);
            }
        };
        checkExistingSession();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                const msg = signInError.message.toLowerCase();
                if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
                    setError("Incorrect email or password. Please check and try again.");
                } else if (msg.includes("email not confirmed")) {
                    setError("Your email is not confirmed. Please check your inbox for a verification link.");
                } else if (msg.includes("timed out") || msg.includes("abort") || msg.includes("network")) {
                    setError("Connection issue — server is slow. Please wait a moment and try again.");
                } else if (msg.includes("too many requests")) {
                    setError("Too many login attempts. Please wait a minute and try again.");
                } else {
                    setError(signInError.message);
                }
                return;
            }

            if (data?.session) {
                router.push("/dashboard");
                return;
            }

            setError("Something went wrong. Please try again.");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const msg = (error.message || "").toLowerCase();
            if (msg.includes("timed out") || msg.includes("abort")) {
                setError("Connection timed out. The server may be slow — please try again in a few seconds.");
            } else if (msg.includes("failed to fetch")) {
                setError("Unable to reach the server. Please check your internet connection OR verify if your Supabase project is active (not paused).");
            } else {
                setError(error.message || "An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950">
            {/* Left decorative panel — desktop only */}
            <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-primary/20 via-slate-900 to-slate-950 border-r border-white/5 p-16 flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[100px]" />
                </div>
                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-3 mb-16">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-black text-xl">{CONFIG.platform.logoText}</span>
                        </div>
                        <span className="text-white font-black text-2xl">{CONFIG.platform.name}</span>
                    </Link>
                    <h2 className="text-4xl font-black text-white leading-tight mb-4">
                        Your Mentorship<br />Journey Awaits
                    </h2>
                    <p className="text-slate-400 leading-relaxed max-w-sm">
                        Connect with expert mentors, track your academic progress, and unlock your full potential at {CONFIG.university.name}.
                    </p>
                </div>
                <div className="relative z-10 space-y-4">
                    {["Smart Scheduling", "Real-time Chat", "Progress Tracking"].map((f) => (
                        <div key={f} className="flex items-center gap-3 text-slate-300">
                            <div className="w-5 h-5 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center shrink-0">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                            <span className="text-sm font-semibold">{f}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: form */}
            <div className="flex-1 flex items-center justify-center p-5 sm:p-10 relative min-h-screen lg:min-h-0">
                {/* Mobile background blobs */}
                <div className="lg:hidden absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="lg:hidden absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Role Selection Modal */}
                <AnimatePresence>
                    {showRoleSelection && (
                        <motion.div
                            key="role-modal"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl"
                            >
                                <h2 className="text-2xl font-bold text-white mb-2 text-center">Join {CONFIG.platform.name}</h2>
                                <p className="text-slate-400 mb-8 text-center text-sm">Select your role to continue</p>
                                <div className="space-y-4">
                                    <Link href="/register" className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4 group">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors text-primary shrink-0">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-white">I am a Mentee</h3>
                                            <p className="text-xs text-slate-500">Sign up with your student email</p>
                                        </div>
                                    </Link>
                                    <Link href="/mentor-join" className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center gap-4 group">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors text-emerald-400 shrink-0">
                                            <Briefcase className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-white">I am a Mentor</h3>
                                            <p className="text-xs text-slate-500">Join as a university faculty member</p>
                                        </div>
                                    </Link>
                                </div>
                                <button onClick={() => setShowRoleSelection(false)} className="mt-6 w-full py-3 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all text-sm">
                                    Cancel
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md bg-slate-900/80 border border-white/10 p-7 sm:p-10 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-black/50 relative z-10"
                >
                    {/* Logo on mobile */}
                    <div className="text-center mb-7 sm:mb-8">
                        <Link href="/" className="inline-flex items-center gap-2.5 mb-4 lg:hidden">
                            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                                <span className="text-white font-bold text-lg">{CONFIG.platform.logoText}</span>
                            </div>
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-black text-white">Welcome Back</h1>
                        <p className="text-slate-400 text-sm mt-1.5">Sign in to access {CONFIG.platform.name}</p>
                    </div>

                    {/* Server warming indicator */}
                    {isWarming && (
                        <div className="mb-4 p-3 rounded-2xl bg-blue-900/20 border border-blue-500/20 text-blue-400 text-xs font-medium flex items-center gap-2">
                            <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                            Connecting to server… (this only happens once)
                        </div>
                    )}

                    {/* Error banner */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-5 p-4 rounded-2xl bg-red-900/20 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.form
                        key="login"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleLogin}
                        className="space-y-5"
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="24bcp102@sot.pdpu.ac.in"
                                    autoComplete="email"
                                    className="w-full pl-10 pr-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-primary transition-all text-sm text-white placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-sm font-bold text-slate-300">Password</label>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full pl-10 pr-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-primary transition-all text-sm text-white placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/25 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span>Signing in…</span>
                                </>
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>

                        <div className="text-center pt-4 border-t border-white/10">
                            <p className="text-sm text-slate-400">
                                Don&apos;t have an account?{" "}
                                <button type="button" onClick={() => setShowRoleSelection(true)} className="text-primary font-bold hover:underline outline-none">
                                    Sign Up
                                </button>
                            </p>
                        </div>
                    </motion.form>
                </motion.div>
            </div>
        </div>
    );
}
