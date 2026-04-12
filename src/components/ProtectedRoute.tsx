"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [hasLocalSession, setHasLocalSession] = React.useState<boolean | null>(null);
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
        setMounted(true);
        // Fast-path: Check for a valid session token in localStorage immediately
        try {
            const keys = Object.keys(localStorage);
            const sessionKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
            if (sessionKey) {
                const stored = JSON.parse(localStorage.getItem(sessionKey) || '{}');
                const expiresAt = stored?.expires_at || 0;
                if (expiresAt * 1000 > Date.now()) {
                    setHasLocalSession(true);
                    return;
                }
            }
        } catch (e) {
            logger.warn("ProtectedRoute", "Error checking local session", e);
        }
        setHasLocalSession(false);
    }, []);

    useEffect(() => {
        // Only redirect if:
        // 1. Component is mounted (to avoid hydration mismatch)
        // 2. We are absolutely sure loading has finished from AuthContext (!loading)
        // 3. We absolutely have no user (!user)
        // We removed the aggressive hasLocalSession check from the redirect condition to prevent race conditions during mobile login where localStorage might be delayed.
        if (mounted && !loading && !user) {
            // BUG-08 FIX: Use router.replace instead of window.location.href to preserve SPA navigation
            router.replace("/");
        }
    }, [user, loading, mounted, router]);

    // If AuthContext already resolved (sync-init), show children immediately.
    // Otherwise, if we're truly loading and have no cached session, show the skeleton.
    // HYDRATION: Always show skeleton until mounted to match server structure.
    if (!mounted || (loading && !user && hasLocalSession !== true)) {
        return (
            <div className="flex-1 bg-slate-950 duration-700 min-h-screen" />
        );
    }

    return <>{children}</>;
}
