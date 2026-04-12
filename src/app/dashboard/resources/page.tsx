"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, Video, Link as LinkIcon, Download, Search, Sparkles } from "lucide-react";

const CATEGORIES = [
    { id: 'guides', name: 'Career Guides', icon: FileText, count: 12, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'video', name: 'Video Tutorials', icon: Video, count: 8, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'templates', name: 'Resume Templates', icon: LinkIcon, count: 15, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const RECENT_RESOURCES = [
    { title: "Effective Communication in Tech", type: "Guide", date: "2 days ago", size: "1.2 MB" },
    { title: "Mastering System Design", type: "Video", date: "1 week ago", size: "450 MB" },
    { title: "Graduate Internship Roadmap", type: "PDF", date: "3 days ago", size: "2.4 MB" },
];

export default function ResourcesPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Resources Library
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">Curated learning materials for your professional growth.</p>
                </div>
                <div className="relative group w-full lg:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search resources..." 
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 backdrop-blur-md outline-none focus:border-primary/50 transition-all font-medium text-sm"
                    />
                </div>
            </div>

            {/* Categories Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {CATEGORIES.map((cat, i) => (
                    <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass p-6 rounded-2xl border border-white/40 dark:border-slate-800/50 hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer group"
                    >
                        <div className={`w-12 h-12 rounded-2xl ${cat.bg} flex items-center justify-center mb-6 border border-white dark:border-slate-700/50 group-hover:scale-110 transition-transform`}>
                            <cat.icon className={`w-6 h-6 ${cat.color}`} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{cat.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{cat.count} curated items</p>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Recommended for You</h2>
                        <button className="text-sm font-bold text-primary hover:underline">View all</button>
                    </div>

                    <div className="space-y-4">
                        {RECENT_RESOURCES.map((res, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (i * 0.1) }}
                                className="group p-5 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-4 hover:border-primary/30 transition-all cursor-pointer overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-primary/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white truncate">{res.title}</h4>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-medium">
                                            <span>{res.type}</span>
                                            <span className="opacity-30">•</span>
                                            <span>{res.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary group-hover:text-white transition-all relative z-10">
                                    <Download className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Stats Area */}
                <div className="space-y-6">
                    <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-white/10 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 group-hover:bg-primary/30 transition-colors" />
                        <h3 className="text-xl font-bold mb-4 relative z-10">Storage Ready</h3>
                        <p className="text-sm text-slate-400 relative z-10 leading-relaxed font-bold uppercase tracking-widest opacity-60 mb-6">Coming Soon</p>
                        <div className="space-y-4 relative z-10">
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: '45%' }} 
                                    className="h-full bg-primary"
                                />
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-300">
                                <span>2.4 GB Used</span>
                                <span>5.0 GB Total</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/10 flex flex-col items-center text-center">
                        <Sparkles className="w-8 h-8 text-primary mb-4 animate-bounce" />
                        <h4 className="font-bold text-slate-900 dark:text-white mb-2">Request Resource</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Can&apos;t find what you need? Ask your mentor to upload it.</p>
                        <button className="w-full py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-sm font-bold text-slate-800 dark:text-white shadow-sm hover:shadow-md transition-all">
                            Send Request
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

