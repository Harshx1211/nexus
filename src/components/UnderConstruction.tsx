"use client";

import React from "react";
import { motion } from "framer-motion";
import { Construction, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UnderConstruction({ title }: { title: string }) {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 sm:p-12 bg-white/60 dark:bg-slate-900/40 rounded-[40px] border border-slate-200/50 dark:border-white/5 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700" />
            
            <motion.div
                initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-amber-500/20"
            >
                <Construction className="w-10 h-10" />
            </motion.div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                {title} Coming Soon
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-10 text-sm sm:text-base leading-relaxed font-medium">
                We&apos;re crafting something exceptional for you. This module is undergoing professional refinement.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button
                    onClick={() => router.back()}
                    className="px-8 py-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold text-slate-600 dark:text-slate-300"
                >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
                <Link
                    href="/"
                    className="px-8 py-4 rounded-2xl bg-primary text-white font-bold hover:shadow-xl hover:shadow-primary/25 transition-all flex items-center justify-center shadow-lg shadow-primary/10"
                >
                    Return Home
                </Link>
            </div>
        </div>
    );
}
