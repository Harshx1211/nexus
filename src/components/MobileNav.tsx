"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Calendar, 
    MessageSquare, 
    CheckSquare, 
    Settings, 
    Users, 
    BarChart3, 
    MoreHorizontal, 
    FileText, 
    Megaphone,
    LogOut,
    X,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export function MobileNav() {
    const pathname = usePathname();
    const { user, profile, loading, signOut } = useAuth();
    const [mounted, setMounted] = React.useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    // Cache role in localStorage so nav renders correctly on reload without waiting for profile
    const [cachedRole, setCachedRole] = React.useState<string | null>(null);

    React.useEffect(() => {
        setMounted(true);
        // Try to read cached role from localStorage (Supabase stores session data here)
        if (typeof window !== 'undefined') {
            try {
                // Try common Supabase localStorage key patterns
                const keys = Object.keys(localStorage);
                for (const k of keys) {
                    const val = localStorage.getItem(k);
                    if (val && val.includes('"role"')) {
                        const parsed = JSON.parse(val);
                        const role = parsed?.role || parsed?.user_metadata?.role;
                        if (role) { setCachedRole(role); break; }
                    }
                }
            } catch { /* ignore */ }
        }
    }, []);

    // Update cached role when profile or user metadata loads
    React.useEffect(() => {
        const role = profile?.role ?? user?.user_metadata?.role;
        if (role) setCachedRole(role);
    }, [profile?.role, user?.user_metadata?.role]);

    // Use profile role → user_metadata role → cached role (for instant render on reload)
    const isMentor = (profile?.role ?? user?.user_metadata?.role ?? cachedRole) === 'mentor';

    const MAIN_ITEMS = [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
        ...(isMentor ? [
            { icon: Users, label: "Mentees", href: "/dashboard/mentees" },
            { icon: Calendar, label: "Sessions", href: "/dashboard/sessions" },
            { icon: MessageSquare, label: "Messages", href: "/dashboard/messages" },
        ] : [
            { icon: Calendar, label: "Sessions", href: "/dashboard/sessions" },
            { icon: MessageSquare, label: "Messages", href: "/dashboard/messages" },
            { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
        ])
    ];

    const MORE_ITEMS = [
        ...(isMentor ? [
            { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
        ] : []),
        { icon: FileText, label: "Medical Leaves", href: "/dashboard/leaves" },
        { icon: Megaphone, label: "Announcements", href: "/dashboard/announcements" },
        ...(isMentor ? [
            { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" }
        ] : []),
        { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[150] safe-area-bottom">
            <AnimatePresence>
                {isMoreOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMoreOpen(false)}
                            className="fixed inset-0 bg-slate-900/60 z-[140]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 rounded-t-[32px] border-t border-slate-200/60 dark:border-white/10 p-6 pb-[max(6rem,env(safe-area-inset-bottom)+5rem)] z-[150] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.25)]"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Full Menu</h3>
                                <button 
                                    onClick={() => setIsMoreOpen(false)}
                                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {MORE_ITEMS.map((item) => {
                                    const isActive = item.href === '/dashboard' 
                                        ? pathname === '/dashboard' || pathname === '/dashboard/'
                                        : pathname === item.href || pathname.startsWith(item.href + '/');
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMoreOpen(false)}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-2xl transition-all",
                                                isActive 
                                                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                                    : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                    isActive ? "bg-white/20 text-white" : "bg-white dark:bg-slate-800 shadow-sm"
                                                )}>
                                                    <item.icon className="w-5 h-5" />
                                                </div>
                                                <span className="font-medium">{item.label}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 opacity-30" />
                                        </Link>
                                    );
                                })}
                                <button
                                    onClick={async () => {
                                        try {
                                            setIsLoggingOut(true);
                                            await signOut();
                                            setIsMoreOpen(false);
                                        } catch (error) {
                                            console.error("Logout failed:", error);
                                        } finally {
                                            setIsLoggingOut(false);
                                        }
                                    }}
                                    disabled={isLoggingOut}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-2xl text-red-500 bg-red-50 dark:bg-red-500/10 mt-2 transition-all border border-transparent active:scale-95 w-full text-left",
                                        isLoggingOut && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                                        {isLoggingOut ? (
                                            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <LogOut className="w-5 h-5" />
                                        )}
                                    </div>
                                    <span className="font-medium">{isLoggingOut ? "Logging out..." : "Logout"}</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="bg-white/90 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-slate-200/60 dark:border-white/10 shadow-[0_-8px_40px_-4px_rgba(0,0,0,0.15)] dark:shadow-[0_-8px_40px_-4px_rgba(0,0,0,0.5)]">
                <div className="flex w-full items-center justify-between px-2 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom)+0.5rem)]">
                {!mounted || (loading && !profile?.role && !user?.user_metadata?.role && !cachedRole) ? (
                         // Skeleton during auth resolution
                         [1, 2, 3, 4, 5].map(i => (
                             <div key={i} className="flex-1 flex flex-col items-center justify-center gap-1 py-1">
                                 <div className="w-10 h-10 rounded-[14px] bg-slate-100 dark:bg-slate-800/50 shimmer-skeleton" />
                                 <div className="h-2 w-8 bg-slate-100 dark:bg-slate-800/50 shimmer-skeleton rounded" />
                             </div>
                         ))
                    ) : (
                        <>
                            {MAIN_ITEMS.map((item) => {
                                const isActive = item.href === '/dashboard' 
                                    ? pathname === '/dashboard' || pathname === '/dashboard/'
                                    : pathname === item.href || pathname.startsWith(item.href + '/');
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-200 min-w-[3.5rem] active:scale-90",
                                            isActive
                                                ? "text-primary"
                                                : "text-slate-400 dark:text-slate-500"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                                            isActive
                                                ? "bg-primary/15 dark:bg-primary/20 shadow-sm"
                                                : "bg-transparent"
                                        )}>
                                            <item.icon className={cn("w-5 h-5 transition-all", isActive ? "stroke-[2.5]" : "stroke-[1.75]")} />
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-semibold tracking-tight leading-none transition-all",
                                            isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"
                                        )}>
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}
                            <button
                                onClick={() => setIsMoreOpen(!isMoreOpen)}
                                className={cn(
                                    "flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-200 min-w-[3.5rem] active:scale-90",
                                    (isMoreOpen || MORE_ITEMS.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) ? "text-primary" : "text-slate-400 dark:text-slate-500"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                                    (isMoreOpen || MORE_ITEMS.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) ? "bg-primary/15 dark:bg-primary/20 shadow-sm" : "bg-transparent"
                                )}>
                                    <MoreHorizontal className={cn("w-5 h-5 transition-all", (isMoreOpen || MORE_ITEMS.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) ? "stroke-[2.5]" : "stroke-[1.75]")} />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-semibold tracking-tight leading-none transition-all",
                                    (isMoreOpen || MORE_ITEMS.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) ? "text-primary" : "text-slate-400 dark:text-slate-500"
                                )}>
                                    More
                                </span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
