"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * @file dashboard/loading.tsx
 * @description Global loading state for the dashboard routes.
 * 
 * This provides a consistent "circling" transition between page navigations.
 */
export default function DashboardLoading() {
    return (
        <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500 py-20 px-4">
            {/* Premium Loader */}
            <div className="relative group">
                {/* Glossy background element */}

                
                {/* Outer decorative ring */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-100 dark:border-white/5 relative z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-2xl" />
                
                {/* Spinning primary element */}
                <motion.div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                    <div className="w-full h-full rounded-2xl border-2 border-t-primary border-r-transparent border-b-primary/20 border-l-transparent shadow-[0_0_15px_rgba(37,99,235,0.2)]" />
                </motion.div>
                
                {/* Inner pulsing pulse */}
                <motion.div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/50"
                    animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>
            
            <div className="text-center space-y-3 relative z-10">
                <p className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-[0.3em] opacity-80">Loading Experience</p>
                <div className="flex items-center gap-1.5 justify-center">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                            animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

