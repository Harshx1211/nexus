/**
 * @file dashboard/layout.tsx
 * @description Shared layout wrapper for all authenticated dashboard pages.
 *
 * Renders the desktop Sidebar, top navigation Header, and mobile bottom nav.
 * Guards rendering behind `ProtectedRoute` to block unauthenticated access.
 *
 * DESIGN DECISION: This layout renders the shell IMMEDIATELY, even while auth
 * is still resolving. Pages handle their own data-loading skeletons.
 * We never show a full-screen blocking spinner here to keep perceived
 * performance fast on every navigation.
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CONFIG } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";
import { getInitials, timeAgo } from "@/lib/date-utils";
import { Bell, LogOut, Check, MessageSquare, Calendar, UserPlus, WifiOff, CheckSquare, Megaphone } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { profile, displayName, globalData, markNotificationRead, markAllNotificationsRead, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isMessagesPage = pathname === "/dashboard/messages";
    const { confirm, toast } = useToast();

    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOffline(!navigator.onLine);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    const notifications = globalData.notifications || [];
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const notifRef = useRef<HTMLDivElement>(null);

    // Close notifications on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAllRead = async () => {
        await markAllNotificationsRead();
        toast("All marked as read", "success");
    };

    const [isLogoutLoading, setIsLogoutLoading] = useState(false);

    const handleLogout = async () => {
        const ok = await confirm({
            title: "Log Out",
            message: "Are you sure you want to log out of NEXUS? You will need to sign in again to access your dashboard.",
            confirmText: "Log Out",
            cancelText: "Stay",
            variant: "danger"
        });
        if (!ok) return;

        setIsLogoutLoading(true);
        try {
            await signOut();
        } catch {
            window.location.replace("/");
        }
    };

    const initials = getInitials(profile?.full_name || displayName);

    return (
        <div className="flex bg-slate-50 dark:bg-slate-950 h-[100dvh] overflow-hidden relative">
            {/* Ambient Mesh Background - Opacity increased to 20% for visibility */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[140px] mix-blend-multiply" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-500/20 rounded-full blur-[100px] mix-blend-multiply" />
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full relative z-10">
                <Sidebar />
            </div>

            {/* Main content column */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                
                {/* Offline Warning Banner */}
                <AnimatePresence>
                    {isOffline && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-red-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 py-2 px-4 shadow-md z-40"
                        >
                            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
                            <span>You are currently offline. Real-time updates are paused.</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Top Header */}
                <header className="h-16 sm:h-20 glass shrink-0 flex items-center justify-between px-4 sm:px-10 z-30 border-b border-white/20 dark:border-slate-800/50">
                    <div className="flex items-center gap-1.5 overflow-hidden mr-4">
                        {/* NEXUS logo pill - visible on mobile only */}
                        <span className="md:hidden w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {CONFIG.platform.logoText}
                        </span>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
                            <span className="opacity-60 font-semibold truncate max-w-[40px] min-[400px]:max-w-none text-sm min-[400px]:text-base">Hi,</span>
                            <span className="text-primary truncate max-w-[100px] min-[400px]:max-w-[150px] sm:max-w-[240px] capitalize text-base">
                                {!mounted || !profile ? '...' : (() => {
                                    const name = profile.full_name || displayName;
                                    const parts = name.split(' ');
                                    const titles = ['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'ms', 'ms.', 'mrs', 'mrs.'];
                                    if (parts.length > 1 && titles.includes(parts[0].toLowerCase())) {
                                        return `${parts[0]} ${parts[1]}`;
                                    }
                                    return parts[0];
                                })()}
                            </span>
                        </h2>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-4">
                        <div className="flex items-center relative" ref={notifRef}>
                            <button
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className={cn(
                                    "relative p-2.5 rounded-xl transition-all text-xs border",
                                    isNotifOpen
                                        ? "text-primary bg-primary/10 border-primary/20"
                                        : "text-slate-400 hover:text-primary hover:bg-primary/5 border-transparent hover:border-primary/10"
                                )}
                            >
                                <Bell className="w-5 h-5" />
                                {mounted && unreadCount > 0 && (
                                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute -right-24 sm:right-0 top-full mt-3 w-[calc(100vw-32px)] max-w-[360px] sm:w-96 bg-white dark:bg-slate-900 sm:glass sm:bg-slate-50/95 sm:dark:bg-slate-900/95 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] z-50 overflow-hidden"
                                    >
                                        <div className="p-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                Notifications
                                                {unreadCount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                                        {unreadCount} NEW
                                                    </span>
                                                )}
                                            </h3>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={handleMarkAllRead}
                                                    className="text-[10px] font-bold text-primary hover:text-blue-600 transition-colors uppercase tracking-widest"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-[400px] overflow-y-auto overscroll-contain">
                                            {notifications.length === 0 ? (
                                                <div className="p-10 text-center space-y-3">
                                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto">
                                                        <Bell className="w-8 h-8 text-slate-300" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-400">All caught up!</p>
                                                    <p className="text-xs text-slate-500">No new notifications at the moment.</p>
                                                </div>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <button
                                                        key={notif.id}
                                                        onClick={() => {
                                                            markNotificationRead(notif.id);
                                                            if (notif.link) router.push(notif.link);
                                                            setIsNotifOpen(false);
                                                        }}
                                                        className={cn(
                                                            "w-full p-4 flex gap-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-50 dark:border-slate-800/30 last:border-0 relative group",
                                                            !notif.is_read && "bg-primary/5 dark:bg-primary/5"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center",
                                                            notif.type === 'request' ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" :
                                                            notif.type === 'session' ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" :
                                                            notif.type === 'task' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" :
                                                            notif.type === 'announcement' ? "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400" :
                                                            "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                                                        )}>
                                                            {notif.type === 'request' && <UserPlus className="w-5 h-5" />}
                                                            {notif.type === 'session' && <Calendar className="w-5 h-5" />}
                                                            {notif.type === 'task' && <CheckSquare className="w-5 h-5" />}
                                                            {notif.type === 'announcement' && <Megaphone className="w-5 h-5" />}
                                                            {notif.type === 'message' && <MessageSquare className="w-5 h-5" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">{notif.title}</p>
                                                                {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{notif.content}</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                                    {notif.type}
                                                                </p>
                                                                <span className="text-[10px] text-slate-300 dark:text-slate-600">&bull;</span>
                                                                <p className="text-[10px] font-medium text-slate-400">
                                                                    {timeAgo(notif.created_at)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                                                <Check className="w-3.5 h-3.5 text-primary" />
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>

                                        {notifications.length > 0 && (
                                            <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-white/5">
                                                <button
                                                    onClick={() => {
                                                        setIsNotifOpen(false);
                                                        router.push('/dashboard/settings');
                                                    }}
                                                    className="w-full text-center text-xs font-bold text-slate-500 hover:text-primary transition-colors"
                                                >
                                                    Notification Settings
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={handleLogout}
                            disabled={isLogoutLoading}
                            className={cn(
                                "md:hidden w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/30",
                                isLogoutLoading && "opacity-50 cursor-not-allowed"
                            )}
                            aria-label="Logout"
                        >
                            {isLogoutLoading ? (
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <LogOut className="w-5 h-5" />
                            )}
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end">
                                <div className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                                    {!mounted || !profile ? 'Identifying Role...' : profile.role === 'mentor' ? 'Mentor' : profile.role === 'mentee' ? 'Mentee' : 'Member'}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                                <span className="text-primary font-bold text-sm tracking-widest">{mounted ? initials : ''}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content - no blocking here */}
                <main className={cn(
                    "flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 pb-28 sm:pb-10 overscroll-contain",
                    isMessagesPage && "p-0 pb-20 sm:p-0 sm:pb-0"
                )}>
                    <ProtectedRoute>
                        {children}
                    </ProtectedRoute>
                </main>
            </div>

            <MobileNav />
        </div>
    );
}

