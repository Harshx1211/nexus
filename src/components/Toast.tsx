"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "primary";
}

interface PromptOptions {
    title: string;
    message: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    defaultValue?: string;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    prompt: (options: PromptOptions) => Promise<string | null>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType>({
    toast: () => {},
    confirm: async () => false,
    prompt: async () => null,
});

export const useToast = () => useContext(ToastContext);

// ─── Config ──────────────────────────────────────────────────────────────────

const config: Record<ToastType, {
    icon: React.ReactNode;
    accentClass: string;
    iconBg: string;
}> = {
    success: {
        icon: <CheckCircle2 className="w-5 h-5" />,
        accentClass: "text-emerald-600",
        iconBg: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    error: {
        icon: <XCircle className="w-5 h-5" />,
        accentClass: "text-rose-600",
        iconBg: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    warning: {
        icon: <AlertTriangle className="w-5 h-5" />,
        accentClass: "text-amber-600",
        iconBg: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    info: {
        icon: <Info className="w-5 h-5" />,
        accentClass: "text-blue-600",
        iconBg: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        options: ConfirmOptions;
        resolve: (v: boolean) => void;
    } | null>(null);
    const [promptState, setPromptState] = useState<{
        open: boolean;
        options: PromptOptions;
        resolve: (v: string | null) => void;
        value: string;
    } | null>(null);

    const toast = useCallback((message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise(resolve => {
            setConfirmState({ open: true, options, resolve });
        });
    }, []);

    const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
        return new Promise(resolve => {
            setPromptState({ open: true, options, resolve, value: options.defaultValue || "" });
        });
    }, []);

    const handleConfirm = (result: boolean) => {
        if (confirmState) {
            confirmState.resolve(result);
            setConfirmState(null);
        }
    };

    const handlePrompt = (result: string | null) => {
        if (promptState) {
            promptState.resolve(result);
            setPromptState(null);
        }
    };

    return (
        <ToastContext.Provider value={{ toast, confirm, prompt }}>
            {children}

            {/* ── Toast Stack ── */}
            <div className="fixed bottom-24 md:bottom-6 right-4 sm:right-5 z-[9999] flex flex-col gap-2.5 w-80 sm:w-96 pointer-events-none">
                <AnimatePresence initial={false}>
                    {toasts.map(t => {
                        const { icon, iconBg } = config[t.type];
                        return (
                            <motion.div
                                key={t.id}
                                layout
                                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 40, scale: 0.94 }}
                                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                                className="pointer-events-auto flex items-start gap-3 p-3.5 pr-3 rounded-3xl
                                    bg-white dark:bg-[#1e1e1e]
                                    border border-slate-200 dark:border-slate-700/80
                                    shadow-[0_4px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
                            >
                                {/* Colored icon pill */}
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                                    {icon}
                                </div>

                                {/* Message */}
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 leading-relaxed pt-1">
                                    {t.message}
                                </p>

                                {/* Dismiss */}
                                <button
                                    onClick={() => dismiss(t.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center
                                        text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                                        hover:bg-slate-100 dark:hover:bg-slate-700/60
                                        transition-colors shrink-0 mt-0.5"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* ── Confirm Dialog ── */}
            <AnimatePresence>
                {confirmState?.open && (
                    <motion.div
                        key="confirm-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
                        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 12 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white dark:bg-[#1e1e1e] rounded-[40px] w-full max-w-sm overflow-hidden
                                border border-slate-200 dark:border-slate-700/80
                                shadow-[0_24px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                        >
                            {/* Icon + Content */}
                            <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center gap-3">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                                    confirmState.options.variant === "danger"
                                        ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500"
                                        : "bg-blue-50 dark:bg-blue-500/10 text-blue-500"
                                }`}>
                                    {confirmState.options.variant === "danger"
                                        ? <AlertTriangle className="w-7 h-7" />
                                        : <Info className="w-7 h-7" />
                                    }
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {confirmState.options.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-1.5 max-w-xs">
                                        {confirmState.options.message}
                                    </p>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => handleConfirm(false)}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold
                                        border border-slate-200 dark:border-slate-700
                                        text-slate-600 dark:text-slate-300
                                        bg-slate-50 dark:bg-slate-800/60
                                        hover:bg-slate-100 dark:hover:bg-slate-800
                                        transition-colors"
                                >
                                    {confirmState.options.cancelText || "Cancel"}
                                </button>
                                <button
                                    onClick={() => handleConfirm(true)}
                                    className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all ${
                                        confirmState.options.variant === "danger"
                                            ? "bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20"
                                            : "bg-primary hover:bg-blue-700 shadow-lg shadow-primary/25"
                                    }`}
                                >
                                    {confirmState.options.confirmText || "Confirm"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* ── Prompt Dialog ── */}
            <AnimatePresence>
                {promptState?.open && (
                    <motion.div
                        key="prompt-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-[#1e1e1e] rounded-[40px] w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl"
                        >
                            <div className="p-8 pb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{promptState.options.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{promptState.options.message}</p>
                                
                                <div className="relative group">
                                    <textarea
                                        autoFocus
                                        rows={3}
                                        value={promptState.value}
                                        onChange={(e) => setPromptState(prev => prev ? { ...prev, value: e.target.value } : null)}
                                        placeholder={promptState.options.placeholder || "Type here..."}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium resize-none"
                                    />
                                    <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-focus-within:border-primary/20 pointer-events-none transition-all" />
                                </div>
                            </div>

                            <div className="px-8 pb-8 flex gap-3">
                                <button
                                    onClick={() => handlePrompt(null)}
                                    className="flex-1 py-4 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-slate-50 dark:bg-slate-800/40"
                                >
                                    {promptState.options.cancelText || "Cancel"}
                                </button>
                                <button
                                    onClick={() => handlePrompt(promptState.value)}
                                    className="flex-1 py-4 rounded-2xl text-sm font-bold text-white bg-primary hover:bg-blue-600 shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                >
                                    {promptState.options.confirmText || "Submit"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </ToastContext.Provider>
    );
}
