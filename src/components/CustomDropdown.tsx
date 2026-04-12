"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomDropdownProps {
    label?: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    icon?: React.ReactNode;
    placeholder?: string;
    className?: string;
}

export function CustomDropdown({
    label,
    options,
    value,
    onChange,
    icon,
    placeholder = "Select an option",
    className
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={cn("space-y-2 relative", className)} ref={containerRef}>
            {label && (
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                    {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary dark:focus:border-emerald-500 transition-all text-sm dark:text-white group",
                    isOpen && "border-primary dark:border-emerald-500 ring-4 ring-primary/10 dark:ring-emerald-500/10"
                )}
            >
                <div className="flex items-center gap-3">
                    {icon && <div className={cn("transition-colors", isOpen ? "text-primary dark:text-emerald-500" : "text-slate-400")}>{icon}</div>}
                    <span className={cn(!value && "text-slate-400")}>{value || placeholder}</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isOpen && "rotate-180 text-primary dark:text-emerald-500")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-[100] w-full mt-2 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
                    >
                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            {options.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all text-left",
                                        value === option
                                            ? "bg-primary/10 dark:bg-emerald-500/10 text-primary dark:text-emerald-400 font-bold"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                                    )}
                                >
                                    <span>{option}</span>
                                    {value === option && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
