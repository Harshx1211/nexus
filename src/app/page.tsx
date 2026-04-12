"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Users, Calendar, MessageSquare, CheckCircle2, TrendingUp, Menu, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CONFIG } from "@/lib/config";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // 1. Handle scroll styles
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[0%] right-[-15%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[50%] left-[30%] w-[30%] h-[30%] bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      {/* ===== NAVIGATION ===== */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-slate-950/90 backdrop-blur-2xl border-b border-white/10 shadow-2xl shadow-black/20" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-white font-black text-lg sm:text-xl">{CONFIG.platform.logoText}</span>
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white">{CONFIG.platform.name}</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#about" className="hover:text-white transition-colors">About</Link>
            <Link href="/login" className="px-6 py-2.5 rounded-full bg-primary hover:bg-blue-500 transition-all shadow-lg shadow-primary/30 font-bold text-white">Login</Link>
          </div>

          {/* Mobile Menu Toggle */}
          <motion.button
            className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 border border-white/10 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileMenuOpen
                ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5" /></motion.span>
                : <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="w-5 h-5" /></motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </div>
      </nav>

      {/* ===== MOBILE DRAWER ===== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[70] md:hidden bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }}
              className="fixed top-0 right-0 bottom-0 z-[80] md:hidden w-[80vw] max-w-xs bg-slate-900 shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
            >
              {/* Glow accent */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/4" />

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-black text-sm">{CONFIG.platform.logoText}</span>
                  </div>
                  <span className="text-white font-black text-lg tracking-tight">{CONFIG.platform.name}</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav Links */}
              <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto relative z-10">
                {[
                  { label: "Features", href: "#features", emoji: "✦" },
                  { label: "About", href: "#about", emoji: "◈" },
                  { label: "Login", href: "/login", emoji: "→" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.06, duration: 0.3 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between w-full px-4 py-4 rounded-2xl text-slate-300 hover:text-white hover:bg-white/8 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-primary text-xs font-black w-4">{item.emoji}</span>
                        <span className="font-semibold text-base">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Footer CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="px-4 pb-8 pt-4 border-t border-white/8 relative z-10 space-y-3"
              >
                <p className="text-center text-slate-600 text-[11px] font-medium pt-2">
                  500+ mentees already on NEXUS
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== HERO SECTION ===== */}
      <section className="pt-32 sm:pt-44 pb-16 sm:pb-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs sm:text-sm font-bold mb-6 sm:mb-8 tracking-widest uppercase">
              ✦ Next-Gen Mentorship Platform
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white mb-6 sm:mb-10 leading-[1.1] tracking-tight">
              Empower Your Future<br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-primary to-indigo-400">
                {" "}with Expert Guidance
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-xl text-slate-400 mb-8 sm:mb-14 leading-relaxed px-4 sm:px-0">
              NEXUS bridges the gap between ambition and achievement — a structured platform for seamless mentor-mentee interactions, session management, and real-time progress tracking.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
              <Link
                href="/register?role=mentee"
                className="w-full sm:w-auto px-8 py-4 sm:py-5 rounded-2xl bg-primary text-white font-black text-base sm:text-lg hover:bg-blue-500 shadow-2xl shadow-primary/40 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Join as Mentee <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                href="/register?role=mentor"
                className="w-full sm:w-auto px-8 py-4 sm:py-5 rounded-2xl bg-white/10 border border-white/20 text-white font-black text-base sm:text-lg hover:bg-white/20 hover:border-white/40 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Join as Mentor
              </Link>
            </div>


          </motion.div>

          {/* App Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.9, ease: "easeOut" }}
            className="mt-16 sm:mt-24 relative px-0 sm:px-0"
          >
            <div className="absolute inset-0 bg-primary/15 rounded-3xl blur-3xl -z-10 scale-110" />
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50 bg-slate-900/80 backdrop-blur-sm">
              {/* Window Controls */}
              <div className="flex gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-slate-900/90 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              </div>

              {/* Mock Dashboard UI — purely illustrative, no real data */}
              <div className="flex flex-col md:flex-row min-h-[280px] sm:min-h-[360px]">
                {/* Mock Sidebar – hidden on mobile */}
                <div className="hidden md:flex w-56 bg-slate-950/60 border-r border-white/5 p-5 flex-col gap-5">
                  <div className="flex items-center gap-2.5 px-1">
                    <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">N</div>
                    <span className="font-bold text-white text-sm">NEXUS</span>
                  </div>
                  <div className="space-y-1 pt-2">
                    {[
                      { icon: <TrendingUp className="w-4 h-4" />, label: "Dashboard", active: true },
                      { icon: <Users className="w-4 h-4" />, label: "Mentees", active: false },
                      { icon: <Calendar className="w-4 h-4" />, label: "Sessions", active: false },
                      { icon: <MessageSquare className="w-4 h-4" />, label: "Messages", active: false },
                    ].map((item, i) => (
                      <div key={i} className={`flex gap-3 items-center px-3 py-2.5 rounded-xl transition-colors ${item.active ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500"}`}>
                        {item.icon}
                        <span className="text-sm font-semibold">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock Main Content */}
                <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">Good Morning, Mentor</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Your platform is live and ready.</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary font-black text-sm">👤</div>
                  </div>

                  {/* Stats — with question marks to indicate they're live/dynamic */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { color: "bg-blue-500", label: "Mentees", value: "—" },
                      { color: "bg-purple-500", label: "Sessions", value: "—" },
                      { color: "bg-emerald-500", label: "Tasks", value: "—" },
                      { color: "bg-amber-500", label: "Progress", value: "—" },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/5 p-3 sm:p-4 rounded-xl border border-white/5">
                        <div className={`w-2 h-2 rounded-full ${s.color} mb-2`} />
                        <div className="font-black text-lg sm:text-xl text-white/30">{s.value}</div>
                        <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl border border-white/5 p-3 sm:p-4">
                      <p className="text-xs font-bold text-slate-400 mb-3">Upcoming Sessions</p>
                      <div className="space-y-2.5">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center gap-2.5 animate-pulse">
                            <div className="w-7 h-7 rounded-lg bg-white/10 shrink-0" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="h-2.5 w-24 bg-white/10 rounded-full" />
                            </div>
                            <div className="h-2.5 w-12 bg-white/10 rounded-full shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Animated bar chart — illustrative */}
                    <div className="bg-white/5 rounded-xl border border-white/5 p-3 sm:p-4 flex items-end gap-1">
                      {[40, 70, 50, 90, 65, 85, 100].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-md overflow-hidden" style={{ height: "80px" }}>
                          <div className="w-full bg-primary/40 rounded-t-md" style={{ height: `${h}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Fade overlay */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent rounded-b-3xl pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-20 sm:py-28 px-5 sm:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black uppercase tracking-widest mb-4">Platform Features</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Everything You Need to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Succeed</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              A complete suite of tools to make every mentor-mentee relationship impactful and measurable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: <Calendar className="w-6 h-6" />, title: "Smart Scheduling", desc: "Intuitive session booking with real-time availability and automated reminders.", color: "text-blue-400", bg: "bg-blue-500/10" },
              { icon: <MessageSquare className="w-6 h-6" />, title: "Real-time Chat", desc: "Secure, instant messaging between mentors and mentees for continuous support.", color: "text-purple-400", bg: "bg-purple-500/10" },
              { icon: <TrendingUp className="w-6 h-6" />, title: "Progress Tracking", desc: "Visual dashboards and structured reports to monitor growth milestones.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { icon: <Users className="w-6 h-6" />, title: "Role-based Access", desc: "Tailored dashboards for Admins, Mentors, and Mentees with role-specific tools.", color: "text-amber-400", bg: "bg-amber-500/10" },
              { icon: <CheckCircle2 className="w-6 h-6" />, title: "Task Management", desc: "Assign, track, and review assignments to ensure learning objectives are met.", color: "text-rose-400", bg: "bg-rose-500/10" },
              { icon: <ArrowRight className="w-6 h-6" />, title: "Structured Feedback", desc: "Two-way review system to maintain high quality of every interaction.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.07 }}
                whileHover={{ y: -4 }}
                className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition-all group"
              >
                <div className={`w-12 h-12 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-5`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT / SIGN IN SECTION ===== */}
      <section id="about" className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative p-8 sm:p-16 rounded-3xl sm:rounded-[40px] bg-gradient-to-br from-primary/20 via-indigo-600/10 to-transparent border border-primary/30 text-center overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 sm:mb-5 tracking-tight relative z-10">
              Built for {CONFIG.university.name}
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-8 sm:mb-10 text-sm sm:text-base relative z-10">
              NEXUS is purpose-built for the {CONFIG.university.name} ecosystem — designed to make every mentor-mentee relationship structured, trackable, and impactful.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
              {[
                { emoji: "🎓", title: "Mentees", desc: "Get matched with the right mentor" },
                { emoji: "🏫", title: "Mentors", desc: "Guide mentees with structured tools" },
                { emoji: "📊", title: "Admins", desc: "Track progress across the program" },
              ].map((r, i) => (
                <div key={i} className="flex flex-row sm:flex-col items-center sm:items-center gap-3 sm:gap-2 text-left sm:text-center">
                  <div className="text-3xl">{r.emoji}</div>
                  <div>
                    <div className="font-bold text-white text-sm">{r.title}</div>
                    <div className="text-slate-400 text-xs">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-5 sm:px-8 border-t border-white/10 text-center">
        <p className="text-slate-500 text-sm">© 2025 {CONFIG.platform.name} · {CONFIG.university.name}</p>
      </footer>
    </div>
  );
}
