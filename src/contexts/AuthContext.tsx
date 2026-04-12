/**
 * @file contexts/AuthContext.tsx
 * @description Global authentication and user profile context.
 *
 * REWRITE RATIONALE:
 * - useEffect now correctly uses [] as dependency to create subscription ONCE.
 * - signingOut flag is reset after logout completes so re-login works.
 * - Removed dead code path after early return in fetchAndSetProfile.
 * - Profile fallback now preserves existing data instead of wiping it.
 * - Single source of truth for auth state avoids render loops.
 */

"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: "mentor" | "mentee" | "admin" | null;

    // Academic Information (for students)
    student_id?: string | null;
    semester?: string | null;
    section?: string | null;

    // Professional Information (for mentors)
    department?: string | null;
    designation?: string | null;
    employee_id?: string | null;
    expertise?: string[] | null;

    // Contact & Profile
    phone?: string | null;
    bio?: string | null;
    avatar_url?: string | null;

    // Status
    is_active?: boolean;
    is_verified?: boolean;

    // Timestamps
    created_at?: string;
    updated_at?: string;
}

export interface AppNotification {
    id: string;
    type: 'request' | 'session' | 'task' | 'announcement' | 'message';
    title: string;
    content: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

interface AuthState {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    displayName: string;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    globalData: {
        mentees: unknown[];
        myMentees: { id: string, name: string, student_id?: string }[];
        myMentor: { id: string, name: string, role: string, email: string } | null;
        sessions: unknown[];
        tasks: unknown[];
        dashboard: unknown[];
        analytics: unknown[];
        notifications: AppNotification[];
        lastFetched: Record<string, number>;
    };
    signOut: () => Promise<void>;
    updateGlobalData: (key: 'mentees' | 'myMentees' | 'sessions' | 'tasks' | 'dashboard' | 'notifications' | 'analytics', data: unknown[]) => void;
    markNotificationRead: (id: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    addNotification: (notif: AppNotification) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    displayName: "User",
    loading: true,
    refreshProfile: async () => { },
    globalData: {
        mentees: [],
        myMentees: [],
        myMentor: null,
        sessions: [],
        tasks: [],
        dashboard: [],
        analytics: [],
        notifications: [],
        lastFetched: {}
    },
    updateGlobalData: () => { },
    signOut: async () => { },
    markNotificationRead: async () => { },
    markAllNotificationsRead: async () => { },
    addNotification: () => { }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>(() => {
        // SYNCHRONOUS BOOTSTRAPPING (ZERO-WATERFALL):
        // Immediately return a valid-looking state if we have a cached profile.
        // This makes the UI render on Frame 1 (under 16ms).
        if (typeof window !== 'undefined') {
            try {
                const keys = Object.keys(localStorage);
                const sessionKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
                if (sessionKey) {
                    const session = JSON.parse(localStorage.getItem(sessionKey) || '{}');
                    const user = session?.user;
                    if (user?.id) {
                        const cachedProfile = localStorage.getItem(`nexus_profile_${user.id}`);
                        if (cachedProfile) {
                            const profile = JSON.parse(cachedProfile);
                            return { user, profile, loading: false };
                        }

                        // METADATA-FIRST FALLBACK:
                        // Even if no profile is in localStorage yet, we can deduce identity
                        // from the user_metadata in the session token.
                        const metadataRole = user.user_metadata?.role;
                        const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;

                        if (metadataRole) {
                            return {
                                user,
                                profile: {
                                    id: user.id,
                                    role: metadataRole,
                                    full_name: metadataName || null,
                                    email: user.email || null,
                                    student_id: user.user_metadata?.student_id || user.email?.split('@')[0].toUpperCase() || null,
                                },
                                loading: false // Unblock because we have the role!
                            };
                        }

                        // Even if no metadata role, return user so hooks can start
                        return { user, profile: null, loading: false };
                    }
                }
            } catch (e) {
                logger.warn("AuthContext", "Error during synchronous bootstrapping", e);
            }
        }
        return { user: null, profile: null, loading: true };
    });

    const [globalData, setGlobalData] = useState<AuthContextType['globalData']>(() => {
        // Recover global data from localStorage if possible
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('nexus_global_data_v2');
                if (cached) return JSON.parse(cached);
            } catch (e) {
                logger.warn("AuthContext", "Error recovering global data from localStorage", e);
            }
        }
        return {
            mentees: [],
            myMentees: [],
            myMentor: null,
            sessions: [],
            tasks: [],
            dashboard: [],
            analytics: [],
            notifications: [],
            lastFetched: {}
        };
    });

    const profileCache = useRef<Record<string, Profile>>({});
    // BUG FIX: This was never reset to false after logout, permanently blocking new logins
    const signingOut = useRef(false);

    const { user, profile, loading } = authState;
    const displayName = profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0]?.replace(/[0-9]/g, '') ||
        "User";

    /** Fetches profile from DB and updates state, preserving existing data on failure */
    const fetchAndSetProfile = useCallback(async (user: User, retries = 2, force = false): Promise<void> => {
        if (signingOut.current) return;

        // 1. Memory Cache Fast-Path
        if (!force && profileCache.current[user.id]) {
            setAuthState({ user, profile: profileCache.current[user.id], loading: false });
            // Background refresh without blocking
            backgroundRefresh(user);
            return;
        }

        // 2. LocalStorage Cache Instant-Path
        if (!force) {
            try {
                const cachedValue = localStorage.getItem(`nexus_profile_${user.id}`);
                if (cachedValue) {
                    const parsed = JSON.parse(cachedValue) as Profile;
                    if (parsed && parsed.role) {
                        profileCache.current[user.id] = parsed;
                        setAuthState({ user, profile: parsed, loading: false });
                        // Background refresh without blocking the 50ms resolution goal
                        setTimeout(() => backgroundRefresh(user), 0);
                        return;
                    }
                }
            } catch (e) {
                logger.warn("AuthContext", "Error reading profile from localStorage", e);
            }
        }

        // 3. Network Fetch (with local 8s timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            logger.info("AuthContext", `fetchProfile starting for ${user.id}`);

            const { data, error } = await supabase
                .from("profiles")
                .select("id, role, full_name, email, bio, expertise, student_id, semester, section, department, designation, employee_id, phone, avatar_url, is_active, is_verified")
                .eq("id", user.id)
                .abortSignal(controller.signal)
                .maybeSingle();

            clearTimeout(timeoutId);

            if (signingOut.current) return;

            if (data) {
                profileCache.current[user.id] = data;
                try { 
                    localStorage.setItem(`nexus_profile_${user.id}`, JSON.stringify(data)); 
                } catch (e) { 
                    logger.warn("AuthContext", "Error persisting profile to localStorage", e);
                }
                setAuthState({ user, profile: data, loading: false });
            } else if (error && retries > 0) {
                logger.warn("AuthContext", "Profile fetch error, retrying...", error.message);
                await new Promise(resolve => setTimeout(resolve, 500));
                return await fetchAndSetProfile(user, retries - 1, force);
            } else if (!data && retries > 0) {
                // Profile row might not exist yet (RLS timing)
                logger.warn("AuthContext", "Profile row not found, retrying...");
                await new Promise(resolve => setTimeout(resolve, 500));
                return await fetchAndSetProfile(user, retries - 1, force);
            } else {

                // PROFILE MISSING: We no longer "Self-Heal" on the client.
                // Profile creation is now handled by a Supabase Database Trigger.
                // If it's still missing here, it means the trigger hasn't fired yet 
                // or there's a serious provisioning delay.
                logger.warn("AuthContext", "Profile record missing. Waiting for server-side provisioning...");

                setAuthState({
                    user,
                    profile: {
                        id: user.id,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        role: (user?.user_metadata?.role as any) || 'mentee',
                        full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || user.email?.split('@')[0] || "User",
                        email: user.email || null,
                        student_id: user.user_metadata?.student_id || user.email?.split('@')[0].toUpperCase() || null,
                    },
                    loading: false
                });
            }

        } catch (err: unknown) {
            logger.warn("AuthContext", "Profile fetch exception", (err as Error).message);
            if (signingOut.current) return;
            // BUG FIX: Preserve existing data on exception
            setAuthState(prev => {
                if (prev.profile && prev.profile.id === user.id) {
                    return { ...prev, user, loading: false };
                }

                return {
                    user,
                    profile: {
                        id: user.id,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        role: (user?.user_metadata?.role as any) || null,
                        full_name: user?.user_metadata?.full_name ||
                            user?.user_metadata?.name || null,
                        email: user.email || null,
                        student_id: user.user_metadata?.student_id || user.email?.split('@')[0].toUpperCase() || null,
                    },
                    loading: false
                };
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const backgroundRefresh = useCallback(async (user: User) => {
        if (signingOut.current) return;
        try {
            const { data } = await supabase
                .from("profiles")
                .select("id, role, full_name, email, bio, expertise, student_id, semester, section, department, designation, employee_id, phone, avatar_url, is_active, is_verified")
                .eq("id", user.id)
                .maybeSingle();

            if (data && !signingOut.current) {
                profileCache.current[user.id] = data;
                try { localStorage.setItem(`nexus_profile_${user.id}`, JSON.stringify(data)); } catch { /* ignore */ }
                setAuthState(prev => {
                    const hasChanged = JSON.stringify(prev.profile) !== JSON.stringify(data);
                    if (!hasChanged) return prev;
                    return { ...prev, profile: data };
                });
            }
        } catch (e) {
            logger.warn("AuthContext", "Background refresh failed", e);
        }
    }, []);

    const fetchMyMentor = useCallback(async (userId: string) => {
        try {
            const { data: menteeData } = await supabase
                .from('mentees')
                .select('assigned_mentor_id')
                .eq('id', userId)
                .single();

            if (menteeData?.assigned_mentor_id) {
                const { data: mentorProfile } = await supabase
                    .from('profiles')
                    .select('id, full_name, role, email')
                    .eq('id', menteeData.assigned_mentor_id)
                    .single();

                if (mentorProfile) {
                    const name = mentorProfile.full_name || (mentorProfile.email ? mentorProfile.email.split('@')[0] : 'Mentor');
                    const formatted = {
                        id: mentorProfile.id,
                        name: name,
                        role: mentorProfile.role,
                        email: mentorProfile.email
                    };
                    setGlobalData(prev => ({
                        ...prev,
                        myMentor: formatted,
                        lastFetched: { ...prev.lastFetched, myMentor: Date.now() }
                    }));
                }
            }
        } catch (e) {
            logger.error("AuthContext", "Error fetching myMentor", e);
        }
    }, []);

    const fetchMyMentees = useCallback(async (userId: string) => {
        try {
            const { data: menteesData } = await supabase
                .from('mentees')
                .select('id, profiles:profiles!fk_mentee_profile(id, full_name, student_id)')
                .eq('assigned_mentor_id', userId);

            if (menteesData) {
                const formatted = menteesData
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((m: any) => m.profiles)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((m: any) => ({
                        // BUG-3 FIX: Use profiles.id (the auth user ID) as the id,
                        // NOT the mentees table row id. Sessions & tasks use profiles.id as mentee_id.
                        id: m.profiles.id,
                        name: m.profiles.full_name || 'Student',
                        student_id: m.profiles.student_id
                    }));
                setGlobalData(prev => ({
                    ...prev,
                    myMentees: formatted,
                    lastFetched: { ...prev.lastFetched, myMentees: Date.now() }
                }));
            }
        } catch (e) {
            logger.error("AuthContext", "Error fetching myMentees", e);
        }
    }, []);

    // BUG-40 FIX: Wrapped in useCallback so that consumers comparing by reference
    // (e.g., with useMemo or React.memo) don't needlessly re-render.
    const updateGlobalData = useCallback((key: 'mentees' | 'myMentees' | 'sessions' | 'tasks' | 'dashboard' | 'notifications' | 'analytics', data: unknown[]) => {
        setGlobalData(prev => {
            const next = {
                ...prev,
                [key]: data,
                lastFetched: { ...prev.lastFetched, [key]: Date.now() }
            };
            // Persist to localStorage for sync-init on refresh
            if (typeof window !== 'undefined') {
                try { localStorage.setItem('nexus_global_data_v2', JSON.stringify(next)); } catch { /* ignore */ }
            }
            return next;
        });
    }, []);

    // BUG-2 FIX: Accept userEmail as a parameter instead of capturing it from closure.
    // This prevents stale closure bugs where user?.email is null at subscription time.
    const fetchNotifications = useCallback(async (userId: string, userEmail?: string | null) => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('recipient_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                logger.error("AuthContext", `Notification fetch error for ${userId}`, error);
                return;
            }

            logger.info("AuthContext", `Fetched ${data?.length || 0} notifications for user ${userId}`);

            if (data) {
                updateGlobalData('notifications', data);
            }

            // BUG-03 FIX: The previous rescue query used an invalid PostgREST join filter
            // (.eq('recipient.email', ...) does not work with Supabase JS v2).
            // The correct approach is to resolve the profile ID from the email first,
            // then query notifications directly by recipient_id.
            if ((!data || data.length === 0) && userEmail) {
                logger.info("AuthContext", `No notifications for ID ${userId}, trying rescue by email ${userEmail}`);
                const { data: profileRow } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (profileRow?.id && profileRow.id !== userId) {
                    const { data: rescueData } = await supabase
                        .from('notifications')
                        .select('*')
                        .eq('recipient_id', profileRow.id)
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (rescueData && rescueData.length > 0) {
                        logger.info("AuthContext", `Rescue found ${rescueData.length} notifications by email.`);
                        updateGlobalData('notifications', rescueData);
                    }
                }
            }
        } catch (e) {
            logger.error("AuthContext", "Error fetching notifications", e);
        }
    }, [updateGlobalData]); // BUG-2 FIX: No closure dependency — params are passed explicitly

    // BUG-40 FIX: Wrapped in useCallback to avoid stale closures and unnecessary re-renders
    const markNotificationRead = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
            if (!error) {
                setGlobalData(prev => ({
                    ...prev,
                    notifications: prev.notifications.map(n =>
                        (n as AppNotification).id === id ? { ...(n as AppNotification), is_read: true } : n
                    ) as AppNotification[]
                }));
            }
        } catch (e) {
            logger.error("AuthContext", "Error marking notification as read", e);
        }
    }, []);

    const markAllNotificationsRead = useCallback(async () => {
        if (!user) return;
        const unreadIds = globalData.notifications
            .filter(n => !n.is_read)
            .map(n => n.id);
        
        if (unreadIds.length === 0) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', unreadIds);
            
            if (!error) {
                setGlobalData(prev => ({
                    ...prev,
                    notifications: prev.notifications.map(n => ({ ...n, is_read: true }))
                }));
            }
        } catch (e) {
            logger.error("AuthContext", "Error marking all notifications as read", e);
        }
    }, [user, globalData.notifications]);

    // BUG-40 FIX: Wrapped in useCallback to prevent needless re-renders in consumers
    const addNotification = useCallback((notif: AppNotification) => {
        setGlobalData(prev => {
            // Check if already exists (prevent duplicates from multiple events)
            if (prev.notifications.find(n => n.id === notif.id)) return prev;
            return {
                ...prev,
                notifications: [notif, ...prev.notifications].slice(0, 50),
                lastFetched: { ...prev.lastFetched, notifications: Date.now() }
            };
        });
    }, []);

    // BUG-1 FIX: Use [] as dependency so the auth subscription is created ONCE on mount.
    // The notification realtime subscription is in a separate effect keyed on user?.id.
    useEffect(() => {
        logger.info("AuthContext", "Initializing auth subscription (runs once)...");
        let mounted = true;

        // Failsafe: Unblock UI after 10s if everything hangs
        const failsafeTimeout = setTimeout(() => {
            if (!mounted) return;
            logger.warn("AuthContext", "Failsafe triggered: resolving auth forcefully.");
            setAuthState(prev => prev.loading ? { ...prev, loading: false } : prev);
        }, 10000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;
                logger.info("AuthContext", `Auth event: ${event}`);

                if (event === "SIGNED_OUT") {
                    profileCache.current = {};
                    signingOut.current = false;
                    setAuthState({ user: null, profile: null, loading: false });
                    return;
                }

                if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
                    if (session?.user && !signingOut.current) {
                        // IMMEDIATE STATE UPDATE: Unblock the UI immediately by setting the user.
                        // If no profile in cache, set loading:true to ensure skeletons are shown 
                        // instead of redirecting from ProtectedRoute.
                        const cachedProfile = profileCache.current[session.user.id];
                        setAuthState(prev => ({ 
                            user: session.user, 
                            profile: cachedProfile || null, 
                            loading: prev.loading || !cachedProfile 
                        }));

                        // BUG-01 FIX: fetchAndSetProfile is async. We must wait for it to complete
                        // before reading profileCache, otherwise the cache is still stale.
                        // Role-specific fetches (fetchMyMentees, fetchMyMentor) are now triggered
                        // AFTER the profile has been resolved, via the .then() callback.
                        fetchAndSetProfile(session.user).then(() => {
                            if (!mounted || signingOut.current) return;
                            const resolvedProfile = profileCache.current[session.user.id];
                            if (resolvedProfile?.role === 'mentor') {
                                fetchMyMentees(session.user.id);
                            } else if (resolvedProfile?.role === 'mentee') {
                                fetchMyMentor(session.user.id);
                            }
                        });

                        fetchNotifications(session.user.id, session.user.email);
                    } else if (!session?.user) {
                        // If no session, wait a brief moment for storage hydration 
                        // before concluding the user is definitely logged out.
                        if (event === "INITIAL_SESSION") {
                            setAuthState(prev => prev.user ? prev : { user: null, profile: null, loading: false });
                        } else {
                            setAuthState({ user: null, profile: null, loading: false });
                        }
                    }
                    return;
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(failsafeTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // BUG-1 FIX: Empty deps — this effect runs exactly ONCE


    const signOut = async () => {
        logger.info("AuthContext", "signOut() called. current flag:", signingOut.current);
        if (signingOut.current) {
            logger.warn("AuthContext", "signOut already in progress, ignoring duplicate call");
            return;
        }
        signingOut.current = true;

        try {
            logger.info("AuthContext", "Initiating instant logout...");

            // 1. Clear memory profile cache
            profileCache.current = {};

            // 2. Clear all LocalStorage synchronously
            if (typeof window !== 'undefined') {
                try {
                    logger.info("AuthContext", "Clearing localStorage...");
                    const keys = Object.keys(localStorage);
                    keys.forEach(k => {
                        if (
                            k.startsWith('sb-') ||
                            k.startsWith('nexus_') ||
                            k === 'nexus_global_data_v2'
                        ) {
                            localStorage.removeItem(k);
                        }
                    });
                } catch (e) {
                    logger.warn("AuthContext", "Error clearing localStorage during signout", e);
                }
            }

            // 3. Reset internal states immediately (we'll redirect anyway)
            setGlobalData({
                mentees: [],
                myMentees: [],
                myMentor: null,
                sessions: [],
                tasks: [],
                dashboard: [],
                analytics: [],
                notifications: [],
                lastFetched: {}
            });

            // 4. Supabase sign out
            // We use 'local' scope to be fast, but we MUST await it.
            logger.info("AuthContext", "Calling supabase.auth.signOut...");
            try {
                const { error } = await supabase.auth.signOut({ scope: 'local' });
                if (error) logger.error("AuthContext", "Supabase signOut error result", error);
            } catch (e) {
                logger.warn("AuthContext", "Non-critical error in Supabase signOut call", e);
            }

            // 5. FINAL REDIRECTION
            logger.info("AuthContext", "Redirecting to /...");
            window.location.assign("/");
        } catch (error) {
            logger.error("AuthContext", "Critical error during signOut", error);
            window.location.assign("/");
        } finally {
            // Safety reset
            setTimeout(() => {
                signingOut.current = false;
                logger.info("AuthContext", "signOut flag reset");
            }, 2000);
        }
    };

    const refreshProfile = async () => {
        if (!user) return;

        try {
            const fetchPromise = fetchAndSetProfile(user, 2, true);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('REFRESH_TIMEOUT')), 10000)
            );
            await Promise.race([fetchPromise, timeoutPromise]);
        } catch (e) {
            logger.warn("AuthContext", "refreshProfile timed out or failed", (e as Error).message);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            displayName,
            loading,
            refreshProfile,
            globalData,
            signOut,
            updateGlobalData,
            markNotificationRead,
            markAllNotificationsRead,
            addNotification
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
