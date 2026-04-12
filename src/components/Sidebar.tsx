"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Calendar,
    MessageSquare,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    CheckSquare,
    BarChart3,
    FileText,
    Megaphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONFIG } from "@/lib/config";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Mentees", href: "/dashboard/mentees", mentorOnly: true },
    { icon: Calendar, label: "Sessions", href: "/dashboard/sessions" },
    { icon: MessageSquare, label: "Messages", href: "/dashboard/messages" },
    { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
    { icon: FileText, label: "Medical Leaves", href: "/dashboard/leaves" },
    { icon: Megaphone, label: "Announcements", href: "/dashboard/announcements" },
    { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics", mentorOnly: true },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

import { useAuth } from "@/contexts/AuthContext";
import { getInitials } from "@/lib/date-utils";

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const { profile, loading, displayName, signOut } = useAuth();

    const [mounted, setMounted] = React.useState(false);
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            await signOut();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const filteredItems = menuItems.filter(item => {
        if (loading) return !item.mentorOnly;
        if (profile?.role !== 'mentor') return !item.mentorOnly;
        return true;
    });

    const initials = getInitials(profile?.full_name || displayName || '');
    const roleLabel = profile?.role === 'mentor' ? 'Mentor' : profile?.role === 'mentee' ? 'Mentee' : 'Member';

    return (
        <div className={cn(
            "h-full flex flex-col z-40 transition-all duration-300",
            "bg-white dark:bg-slate-900",
            "border-r border-slate-200/70 dark:border-white/5",
            "shadow-[2px_0_20px_rgba(0,0,0,0.04)]",
            isCollapsed ? "w-[72px]" : "w-64"
        )}>
            {/* Logo */}
            <div className={cn(
                "h-[72px] flex items-center shrink-0 border-b border-slate-100 dark:border-slate-800/50",
                isCollapsed ? "justify-center px-0" : "px-5 gap-3"
            )}>
                <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white dark:text-slate-900 font-bold text-base">{CONFIG.platform.logoText}</span>
                </div>
                {!isCollapsed && (
                    <div>
                        <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                            {CONFIG.platform.name}
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto">
                {!mounted || (loading && !profile?.role) ? (
                    <div className="space-y-1 px-1">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl">
                                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-white/10 shimmer-skeleton shrink-0" />
                                <div className="h-4 rounded-md bg-slate-100 dark:bg-white/5 shimmer-skeleton flex-1" />
                            </div>
                        ))}
                    </div>
                ) : (
                    filteredItems.map((item) => {
                        const isActive = item.href === '/dashboard'
                            ? pathname === '/dashboard' || pathname === '/dashboard/'
                            : pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group select-none",
                                    isCollapsed && "justify-center px-0",
                                    isActive
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-[18px] h-[18px] shrink-0 transition-transform duration-200",
                                    isActive ? "text-blue-700 dark:text-blue-400" : "group-hover:text-slate-900 dark:group-hover:text-white"
                                )} />
                                {!isCollapsed && (
                                    <span className={cn(
                                        "font-medium text-sm whitespace-nowrap",
                                        isActive ? "font-semibold" : ""
                                    )}>
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Footer: Profile + Collapse + Logout */}
            <div className="shrink-0 border-t border-slate-100 dark:border-white/5 p-3 space-y-1">
                {/* User profile pill */}
                {mounted && !isCollapsed && profile && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 border-2 border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-primary font-black text-xs">{initials}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {profile.full_name?.split(' ')[0] || displayName}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{roleLabel}</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white transition-all w-full group"
                >
                    {isCollapsed
                        ? <ChevronRight className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
                        : <ChevronLeft className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
                    }
                    {!isCollapsed && <span className="font-semibold text-sm">Collapse</span>}
                </button>

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-all w-full group",
                        isLoggingOut && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {isLoggingOut
                        ? <div className="w-[18px] h-[18px] border-2 border-red-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        : <LogOut className="w-[18px] h-[18px] group-hover:scale-110 transition-transform shrink-0" />
                    }
                    {!isCollapsed && (
                        <span className="font-semibold text-sm">
                            {isLoggingOut ? "Signing out..." : "Sign Out"}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
