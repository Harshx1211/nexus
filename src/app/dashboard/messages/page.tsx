/**
 * @file dashboard/messages/page.tsx
 * @description Real-time secure messaging page.
 *
 * Mentors can message any of their assigned mentees.
 * Mentees can message their assigned mentor and peer mentees (rate-limited).
 * Peer-to-peer messages are physically purged from storage after 7 days.
 * Messages are stored in the Supabase `messages` table with real-time
 * subscriptions via Supabase Realtime channels.
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Send, ChevronLeft, X, MessageSquare, Info, GraduationCap, Briefcase, CheckCheck } from "lucide-react";
import { motion } from "framer-motion";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getInitials } from "@/lib/date-utils";
import { useToast } from "@/components/Toast";
import { logger } from "@/lib/logger";
// Removed unused types


type ChatUser = {
    id: string;
    name: string;
    role: string;
    avatar: string;
    isPinnedMentor?: boolean;
    student_id?: string;
};

type Message = {
    id?: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    status?: 'sending' | 'sent' | 'error';
};

export default function MessagesPage() {
    const { user, profile, globalData, loading: authLoading } = useAuth();
    const { toast } = useToast();

    // SWR initialization: If we already have mentees in globalData, use them immediately to prevent skeleton flash
    const [chatUsers, setChatUsers] = useState<ChatUser[]>(() => {
        if (profile?.role === 'mentor' && globalData.myMentees && globalData.myMentees.length > 0) {
            return globalData.myMentees.map((m: { profileId?: string; id: string; name: string; student_id?: string }) => ({
                id: m.profileId || m.id,
                name: m.name,
                role: 'mentee',
                avatar: getInitials(m.name),
                student_id: m.student_id
            }));
        }
        if (profile?.role === 'mentee' && globalData?.myMentor) {
            return [{
                id: globalData.myMentor.id,
                name: globalData.myMentor.name,
                role: globalData.myMentor.role,
                avatar: getInitials(globalData.myMentor.name),
                isPinnedMentor: true
            }];
        }
        return [];
    });
    const [activeChat, setActiveChat] = useState<ChatUser | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredUsers, setFilteredUsers] = useState<ChatUser[]>([]);

    // Local filtering as user types
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(chatUsers);
            return;
        }
        const lowerQuery = searchQuery.toLowerCase();
        const filtered = chatUsers.filter(u =>
            u.name.toLowerCase().includes(lowerQuery) ||
            (u.student_id && u.student_id.toLowerCase().includes(lowerQuery))
        );
        setFilteredUsers(filtered);
    }, [searchQuery, chatUsers]);



    // Messaging State
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [newMessage, setNewMessage] = useState("");

    const [loading, setLoading] = useState(() => {
        // CONTENT-FIRST: If we have cached contacts, don't block the UI.
        const hasCachedMentees = profile?.role === 'mentor' && globalData.myMentees?.length > 0;
        const hasCachedMentor = profile?.role === 'mentee' && globalData.myMentor;
        return !(hasCachedMentees || hasCachedMentor);
    });
    const [showMobileThread, setShowMobileThread] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    // Full profile details for the active chat contact (for the profile strip)
    const [activeChatProfile, setActiveChatProfile] = useState<{
        bio?: string | null;
        student_id?: string | null;
        department?: string | null;
        designation?: string | null;
        employee_id?: string | null;
        email?: string | null;
    } | null>(null);

    // Failsafe: max 10 seconds - matches AuthContext timeout
    useEffect(() => {
        if (!loading) return;
        const timeout = setTimeout(() => {
            logger.warn("MessagesPage", "Failsafe: Loading took too long, forcing resolution.");
            setLoading(false);
        }, 10000);
        return () => clearTimeout(timeout);
    }, [loading]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch full profile details when active chat changes
    useEffect(() => {
        if (!activeChat?.id) { setActiveChatProfile(null); return; }
        const fetchContactProfile = async () => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('bio, student_id, department, designation, employee_id, email')
                    .eq('id', activeChat.id)
                    .single();
                if (data) setActiveChatProfile(data);
            } catch (err) {
                logger.error("MessagesPage", "Error fetching contact profile", err);
            }
        };
        fetchContactProfile();
    }, [activeChat?.id]);
    // EAGER LOAD: Sidebar Users
    useEffect(() => {
        if (!user?.id) return;

        const loadInitialChats = async () => {
            try {
                // Eagerly determine role (prioritize verified profile, fallback to metadata)
                const currentRole = profile?.role || user.user_metadata?.role;
                if (!currentRole) return;

                if (currentRole === 'mentee') {
                    // Try to get mentor info from global cache first
                    if (globalData.myMentor) {
                        const mentorChat: ChatUser = {
                            id: globalData.myMentor.id,
                            name: globalData.myMentor.name,
                            role: globalData.myMentor.role,
                            avatar: getInitials(globalData.myMentor.name),
                            isPinnedMentor: true
                        };
                        setChatUsers(prev => JSON.stringify(prev) === JSON.stringify([mentorChat]) ? prev : [mentorChat]);
                        setLoading(false);
                    }

                    // Background verify mentor assignment
                    const { data: menteeData } = await supabase
                        .from('mentees')
                        .select('assigned_mentor_id')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (menteeData?.assigned_mentor_id) {
                        const { data: mentorProfile } = await supabase
                            .from('profiles')
                            .select('id, full_name, role, email')
                            .eq('id', menteeData.assigned_mentor_id)
                            .single();

                        if (mentorProfile) {
                            const name = mentorProfile.full_name || (mentorProfile.email ? mentorProfile.email.split('@')[0] : 'Mentor');
                            const freshMentor: ChatUser = {
                                id: mentorProfile.id,
                                name: name,
                                role: mentorProfile.role,
                                avatar: getInitials(name),
                                isPinnedMentor: true
                            };

                            // Reconciliation
                            setChatUsers(prev => JSON.stringify(prev) === JSON.stringify([freshMentor]) ? prev : [freshMentor]);
                        }
                    }
                } else if (currentRole === 'mentor') {
                    // Start with cache
                    if (globalData.myMentees?.length > 0) {
                        const cached = globalData.myMentees.map((m: any) => ({
                            id: m.profileId || m.id,
                            name: m.name,
                            role: 'mentee',
                            avatar: getInitials(m.name),
                            student_id: m.student_id
                        }));
                        setChatUsers(prev => JSON.stringify(prev) === JSON.stringify(cached) ? prev : cached);
                        setLoading(false);
                    }

                    // Background refresh
                    const { data: mRows } = await supabase
                        .from('mentees')
                        .select('profiles:profiles!fk_mentee_profile(id, full_name, student_id)')
                        .eq('assigned_mentor_id', user.id);

                    if (mRows) {
                        const freshMentees = (mRows as any[])
                            .filter((m) => m.profiles)
                            .map((m) => {
                                const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                                return {
                                    id: p.id,
                                    name: p.full_name || 'Mentee',
                                    role: 'mentee',
                                    avatar: getInitials(p.full_name || 'Mentee'),
                                    student_id: p.student_id
                                };
                            });

                        // Reconciliation
                        setChatUsers(prev => JSON.stringify(prev) === JSON.stringify(freshMentees) ? prev : freshMentees);
                    }
                }
            } catch (error) {
                logger.error("MessagesPage", "Error loading chats", error);
            } finally {
                setLoading(false);
            }
        };

        loadInitialChats();
    }, [user?.id, profile?.role, globalData.myMentor, globalData.myMentees, user?.user_metadata?.role]);




    // Fetch Messages & Subscribe when Active Chat Changes
    useEffect(() => {
        if (!user?.id || !activeChat?.id) return;

        // Reset state and show loading
        setMessages([]);
        setMessagesLoading(true);

        const userId = user.id;
        const chatId = activeChat.id;
        let channel: ReturnType<typeof supabase.channel> | null = null;
        let cancelled = false;

        const loadMessages = async () => {
            try {
                const { data, error } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .or(`and(sender_id.eq.${userId},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${userId})`)
                    .order('created_at', { ascending: true });

                if (cancelled) return;

                if (error) {
                    logger.error("MessagesPage", "Load error", error);
                    return;
                }

                setMessages(data || []);
                // Scroll to bottom
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
            } catch (err) {
                logger.error("MessagesPage", "Fatal load error", err);
            } finally {
                if (!cancelled) setMessagesLoading(false);
            }
        };

        const setupSubscription = () => {
            const channelId = [userId, chatId].sort().join('_');
            
            channel = supabase
                .channel(`chat_${channelId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages'
                }, (payload) => {
                    if (cancelled) return;
                    const newMsg = payload.new as Message;
                    newMsg.status = 'sent'; // Incoming from Postgres is always 'sent'

                    // Reconciliation: Only add if relevant and not already in state
                    const isRelevant = 
                        (newMsg.sender_id === userId && newMsg.receiver_id === chatId) ||
                        (newMsg.sender_id === chatId && newMsg.receiver_id === userId);

                    if (isRelevant) {
                        setMessages((prev) => {
                            // 1. Precise Deduplication
                            if (newMsg.id && prev.some(m => m.id === newMsg.id)) return prev;
                            
                            // 2. Focused Replacement
                            const optIndex = prev.findIndex(m => 
                                m.status === 'sending' && 
                                m.content === newMsg.content &&
                                m.sender_id === newMsg.sender_id
                            );

                            if (optIndex !== -1) {
                                const next = [...prev];
                                const merged = {
                                    ...newMsg,
                                    status: 'sent' as const
                                };
                                next[optIndex] = merged;
                                return next;
                            }
                            
                            return [...prev, { ...newMsg, status: 'sent' as const }];
                        });
                    }
                })
                .subscribe();
        };

        loadMessages();
        setupSubscription();

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [user?.id, activeChat?.id]); // Stable dependencies

    // Handle Search
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !user || !profile) return;

        // Try to find in existing chats first
        const localMatch = chatUsers.find(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.student_id && c.student_id.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        if (localMatch) {
            setActiveChat(localMatch);
            setSearchQuery("");
            return;
        }

        // If not found locally, search the database by Roll Number for global students
        try {
            let searchResultsData = [];
            
            if (profile?.role === 'mentor') {
                // BUG-31 FIX: Scope student search to only mentees assigned to the logged-in mentor
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, role, student_id, mentees!inner(assigned_mentor_id)')
                    .eq('role', 'mentee')
                    .eq('mentees.assigned_mentor_id', user.id)
                    .ilike('student_id', `%${searchQuery.trim()}%`)
                    .limit(5);
                searchResultsData = data || [];
            } else {
                // If mentee is searching (though generally they only chat with their assigned mentor)
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, role, student_id')
                    .eq('role', 'mentee')
                    .ilike('student_id', `%${searchQuery.trim()}%`)
                    .neq('id', user.id)
                    .limit(5);
                searchResultsData = data || [];
            }

            if (searchResultsData && searchResultsData.length > 0) {
                const newUsers = searchResultsData.map((p: { id: string; full_name: string; student_id: string }) => ({
                    id: p.id,
                    name: p.full_name,
                    role: 'mentee',
                    avatar: p.full_name.substring(0, 2).toUpperCase(),
                    student_id: p.student_id
                }));

                setChatUsers(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = newUsers.filter(n => !existingIds.has(n.id));
                    return [...uniqueNew, ...prev]; // Put new searched users at the top
                });

                // Auto-select the first search result
                setActiveChat(newUsers[0]);
                setSearchQuery("");
            } else {
                toast("No mentee found with that Roll Number.", "warning");
            }
        } catch (error) {
            logger.error("MessagesPage", "Search error", error);

        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !activeChat || !profile) return;

        const content = newMessage.trim();
        const optimisticId = `optimistic_${Date.now()}`;
        setNewMessage(""); // Input cleared immediately for UX

        // 1. SHOW INSTANTLY (Status: sending)
        const optimisticMsg: Message = {
            id: optimisticId,
            sender_id: user.id,
            receiver_id: activeChat.id,
            content,
            created_at: new Date().toISOString(),
            status: 'sending'
        };
        setMessages(prev => [...prev, optimisticMsg]);
        
        // 2. TRUE PERSISTENCE (Strict Await + Safety Race + Signal)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s hard signal

        try {
            const senderId = user.id;
            const receiverId = activeChat.id;
            // Removed console.log for BUG-16
            
            // We use the AbortController signal to ensure the browser frees the socket
            const { data, error } = await supabase
                .from('chat_messages')
                .insert({
                    sender_id: senderId,
                    receiver_id: receiverId,
                    content: content
                })
                .select()
                .abortSignal(controller.signal)
                .single();

            if (error) {
                // Removed console.error for BUG-16
                throw error;
            }

            if (!data) throw new Error("No data returned from database.");

            // 3. UPGRADE TO SENT (Only on true DB confirmation)
            setMessages(prev => prev.map(m => 
                m.id === optimisticId ? { ...data, status: 'sent' as const } : m
            ));
            

        } catch (error: any) {
            // Removed console.error for BUG-16
            const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
            
            // Revert UI to error state
            setMessages(prev => prev.map(m => 
                m.id === optimisticId ? { ...m, status: 'error' as const } : m
            ));
            
            // Return text to input for retry
            setNewMessage(content);
            
            let errorHint = "Connection failed. Please check your internet.";
            if (isTimeout) {
                errorHint = "Database request timed out. The server might be busy.";
            } else if (error.message?.includes('policy')) {
                errorHint = "Security policy blocked this message. Please re-login.";
            } else if (error.message) {
                errorHint = error.message;
            }
            
            toast(errorHint, "error");
        } finally {
            clearTimeout(timeoutId);
        }
    };

    // Auto-scroll when messages change or length updates
    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, activeChat?.id]);



    // ZERO-LATENCY UI: Only block the whole page if we have NO identity info.
    const isBlocking = authLoading && !profile?.role && !user?.user_metadata?.role;

    if (isBlocking) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-7xl mx-auto h-[calc(100vh-160px)] flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 shrink-0">
                    <div className="space-y-3">
                        <div className="h-9 w-56 rounded-2xl bg-slate-200 dark:bg-slate-700 shimmer-skeleton" />
                        <div className="h-4 w-72 rounded-xl bg-slate-100 dark:bg-slate-800 shimmer-skeleton" />
                    </div>
                </div>

                <div className="flex-1 min-h-0 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/50 dark:border-white/5 overflow-hidden flex flex-col md:flex-row shadow-2xl">
                    <div className="w-full md:w-80 lg:w-[400px] flex flex-col shrink-0 h-full border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50">
                        <div className="p-6 pb-2">
                            <div className="h-8 w-40 rounded-xl bg-slate-300 dark:bg-white/15 shimmer-skeleton" />
                        </div>
                        <div className="px-6 mb-4">
                            <div className="h-11 w-full rounded-2xl bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/5 shimmer-skeleton" />
                        </div>
                        <div className="flex-1 px-3 space-y-0.5 overflow-hidden">
                            {[58, 72, 45, 66, 80].map((w, i) => (
                                <div key={i} className="flex items-center gap-4 p-3.5 rounded-2xl">
                                    <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-white/12 shrink-0 shimmer-skeleton" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3.5 rounded-md bg-slate-200 dark:bg-white/12 shimmer-skeleton" style={{ width: `${w}%` }} />
                                        <div className="h-3 w-20 rounded-md bg-slate-100 dark:bg-white/6 shimmer-skeleton" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-950 hidden md:flex">
                        <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6 shimmer-skeleton">
                            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 shimmer-skeleton" />
                        </div>
                        <div className="space-y-3 flex flex-col items-center">
                            <div className="h-6 w-44 rounded-xl bg-slate-200 dark:bg-white/12 shimmer-skeleton" />
                            <div className="h-4 w-64 rounded-lg bg-slate-100 dark:bg-white/6 shimmer-skeleton" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-10 animate-in fade-in duration-500 w-full max-w-7xl mx-auto h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] flex flex-col">
            {/* Standard Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 shrink-0">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-1"
                >
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Messages
                        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-xl font-bold uppercase tracking-widest border border-primary/20 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Live</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-lg">
                        Connect and collaborate with your mentor and mentees in real-time.
                    </p>
                </motion.div>
            </div>

            {/* Chat Interface Container - Boxed Style */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/50 dark:border-white/5 overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
            {/* Sidebar - Chat List */}
            <div className={cn(
                "w-full md:w-80 lg:w-[400px] flex flex-col shrink-0 h-full border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/50 backdrop-blur-md transition-all",
                showMobileThread ? "hidden md:flex" : "flex"
            )}>
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                Inbox
                            </h2>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="px-6 mb-4 shrink-0 group">
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder={profile?.role === 'mentee' ? "Find your mentor..." : "Search mentees..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-transparent focus:border-primary/20 outline-none text-[15px] focus:ring-4 focus:ring-primary/5 transition-all"
                            />
                        </form>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-0.5 px-3 custom-scrollbar">
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <MessageSquare className="w-10 h-10 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                                <p className="font-bold text-slate-400 text-sm">
                                    {searchQuery ? "No results found" : "No conversations"}
                                </p>
                            </div>
                        ) : (
                            filteredUsers.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => {
                                        setActiveChat(chat);
                                        setShowMobileThread(true);
                                    }}
                                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 ${activeChat?.id === chat.id 
                                        ? 'bg-primary text-white shadow-xl shadow-primary/30 active:scale-[0.98]' 
                                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 active:bg-slate-200/50'}`}
                                >
                                    <div className="relative shrink-0">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${activeChat?.id === chat.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                            {chat.avatar}
                                        </div>
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="font-bold text-[15px] truncate">
                                                {chat.name}
                                            </span>
                                            {chat.isPinnedMentor && <span className={cn("text-[8px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-600 font-bold uppercase tracking-wider", activeChat?.id === chat.id && "bg-white/20 text-white")}>Mentor</span>}
                                        </div>
                                        <p className={`text-xs truncate font-medium ${activeChat?.id === chat.id ? 'text-white/80' : 'text-slate-500'}`}>
                                            {chat.student_id ? chat.student_id : 'Tap to chat'}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Main Chat Window */}
            <div className={cn(
                "flex-1 flex flex-col overflow-hidden h-full relative bg-white dark:bg-slate-950",
                !showMobileThread ? "hidden md:flex" : "flex"
            )}>
                {activeChat ? (
                    <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950/20">
                        {/* Chat Header */}
                        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl z-20 shadow-sm">
                            <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden">
                                {/* Back button */}
                                <button
                                    onClick={() => {
                                        setShowMobileThread(false);
                                        setActiveChat(null);
                                        setShowProfile(false);
                                    }}
                                    className="md:hidden flex items-center justify-center w-10 h-10 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-primary active:scale-90 border border-transparent active:border-primary/20"
                                    title="Back to inbox"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold uppercase text-xs sm:text-[14px] shadow-lg shadow-primary/20 shrink-0 border-2 border-white/10">
                                    {activeChat.avatar}
                                </div>
                                <div className="min-w-0 flex flex-col justify-center">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-[15px] sm:text-lg flex items-center gap-2 truncate leading-none mb-1">
                                        {activeChat.name}
                                    </h3>
                                    <span className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider leading-none">
                                        {activeChat.isPinnedMentor || activeChat.role === 'mentor' ? 'Mentor' : 'Mentee'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setShowProfile((p: boolean) => !p)}
                                    className={`p-2 rounded-xl transition-all ${showProfile
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
                                        }`}
                                >
                                    <Info className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Profile Panel */}
                        {showProfile && activeChatProfile && (
                            <div className="absolute inset-0 md:inset-auto md:right-0 md:top-0 h-full w-full md:w-80 z-40 flex flex-col transition-all animate-in slide-in-from-right duration-300">
                                <div className="h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-slate-200 dark:border-white/5 shadow-2xl flex flex-col rounded-none md:rounded-r-[40px] overflow-hidden">
                                    {/* Panel Header */}
                                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Profile</span>
                                        <button
                                            onClick={() => setShowProfile(false)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Avatar + Name */}
                                    <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-slate-100 dark:border-slate-800">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center text-primary font-bold text-2xl shadow-lg border-2 border-primary/20 mb-4">
                                            {activeChat.avatar}
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white text-center leading-snug">
                                            {activeChat.name}
                                        </h3>
                                        <span className={`mt-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${activeChat.isPinnedMentor
                                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                            : 'bg-primary/10 text-primary border border-primary/20'
                                            }`}>
                                            {activeChat.isPinnedMentor ? 'Mentor' : 'Mentee'}
                                        </span>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                                        {/* ID */}
                                        {(activeChatProfile.student_id || activeChatProfile.employee_id) && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                                                    {activeChat.isPinnedMentor ? 'Employee ID' : 'Roll Number'}
                                                </p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                    {activeChat.isPinnedMentor
                                                        ? <Briefcase className="w-4 h-4 text-primary shrink-0" />
                                                        : <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                                                    }
                                                    {activeChatProfile.student_id || activeChatProfile.employee_id}
                                                </p>
                                            </div>
                                        )}
                                        {/* Department */}
                                        {activeChatProfile.department && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Department</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{activeChatProfile.department}</p>
                                            </div>
                                        )}
                                        {/* Designation */}
                                        {activeChatProfile.designation && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Designation</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{activeChatProfile.designation}</p>
                                            </div>
                                        )}
                                        {/* Email */}
                                        {activeChatProfile.email && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Email</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-all">{activeChatProfile.email}</p>
                                            </div>
                                        )}
                                        {/* Bio */}
                                        {activeChatProfile.bio && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">About</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{activeChatProfile.bio}</p>
                                            </div>
                                        )}
                                        {/* Fallback if nothing */}
                                        {!activeChatProfile.bio && !activeChatProfile.student_id && !activeChatProfile.employee_id && !activeChatProfile.department && !activeChatProfile.designation && (
                                            <p className="text-sm text-slate-400 text-center py-8 italic">No additional profile details available.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Message Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-8 pb-4 relative bg-white dark:bg-slate-950">
                            {/* Subtle background doodle effect - desktop only */}
                            <div className="hidden md:block absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />

                            <div className="flex flex-col gap-4 relative z-10">
                                {messagesLoading ? (
                                    <div className="flex flex-col gap-4 py-6 px-2">
                                        {[70, 45, 85, 55, 75].map((w, i) => (
                                            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className="h-10 rounded-[22px] bg-slate-100 dark:bg-slate-800 shimmer-skeleton"
                                                    style={{ width: `${w}%`, maxWidth: '70%' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-slate-400 text-sm italic py-10">
                                        Send a message to start the conversation.
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isMine = msg.sender_id === user?.id;
                                        const msgDate = new Date(msg.created_at);
                                        const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                        const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
                                        const showDateSeparator = !prevDate || prevDate.toDateString() !== msgDate.toDateString();

                                        let dateLabel = "";
                                        if (showDateSeparator) {
                                            const today = new Date();
                                            const yesterday = new Date();
                                            yesterday.setDate(today.getDate() - 1);
                                            dateLabel = msgDate.toDateString() === today.toDateString() ? "Today" :
                                                msgDate.toDateString() === yesterday.toDateString() ? "Yesterday" :
                                                    msgDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                        }

                                        return (
                                            <React.Fragment key={msg.id || idx}>
                                                {showDateSeparator && (
                                                    <div className="flex justify-center my-6">
                                                        <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] font-semibold rounded-full select-none">
                                                            {dateLabel}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className={cn("flex flex-col max-w-[85%] sm:max-w-[70%]", isMine ? "self-end items-end" : "self-start items-start")}>
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        className={cn(
                                                            "relative px-4 py-2.5 shadow-sm transition-all group",
                                                            isMine
                                                                ? cn(
                                                                    "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-[24px] rounded-tr-none shadow-xl shadow-indigo-500/20",
                                                                    msg.status === 'error' && "from-red-500 to-red-600 shadow-red-500/20",
                                                                    msg.status === 'sending' && "opacity-70 grayscale-[0.3]"
                                                                  )
                                                                : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-[24px] rounded-tl-none border border-slate-200/60 dark:border-white/5 shadow-md shadow-slate-200/10 dark:shadow-black/20"
                                                        )}
                                                    >
                                                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                                                        <div className={cn("flex items-center gap-1 mt-1 justify-end opacity-60")}>
                                                            <span className="text-[9px] font-bold tracking-tighter">
                                                                {timeStr}
                                                            </span>
                                                            {isMine && (
                                                                <div className="flex items-center gap-1">
                                                                    {msg.status === 'sending' && <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                                                    {msg.status === 'sent' && <CheckCheck className="w-3 h-3" />}
                                                                    {msg.status === 'error' && <X className="w-3 h-3 text-white" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Message Input - Premium Floating Capsule */}
                        <div className="p-4 sm:p-6 pb-6 md:pb-8 shrink-0 z-20 relative bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-t border-slate-100 dark:border-white/5">
                            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 sm:gap-4 max-w-5xl mx-auto">
                                <div className="flex-1 relative group">
                                    <input
                                        value={newMessage}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (newMessage.trim()) handleSendMessage(e as unknown as React.FormEvent);
                                            }
                                        }}
                                        placeholder="Type a secure message..."
                                        className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 focus:ring-4 focus:ring-primary/10 outline-none text-[15px] font-medium text-slate-800 dark:text-slate-200 shadow-sm transition-all placeholder:text-slate-400/60"
                                    />
                                    <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-focus-within:border-primary/20 pointer-events-none transition-all" />
                                </div>
                                <button
                                    disabled={!newMessage.trim()}
                                    type="submit"
                                    className="w-14 h-14 bg-primary text-white rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:shadow-none disabled:active:scale-100 shrink-0"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>

                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-950/20 relative">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#fff_1px,transparent_1px)]" />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative z-10"
                        >
                            <div className="w-32 h-32 bg-gradient-to-br from-primary/10 to-violet-500/10 dark:from-primary/20 dark:to-violet-500/20 rounded-[40px] flex items-center justify-center mb-8 mx-auto relative group">
                                <div className="absolute inset-0 bg-primary/5 rounded-[40px] animate-pulse" />
                                <MessageSquare className="w-14 h-14 text-primary relative z-10 group-hover:rotate-12 transition-transform duration-500" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Your Messages</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-sm leading-relaxed font-medium mx-auto">
                                Secure end-to-end communication for professional growth. <br/>
                                <span className="text-primary/70 text-sm italic font-bold">Select a contact to start chatting.</span>
                            </p>
                        </motion.div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}

