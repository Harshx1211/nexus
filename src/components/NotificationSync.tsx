"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, AppNotification } from "@/contexts/AuthContext";
import { useToast } from "./Toast";


export function NotificationSync() {
    const { user, addNotification } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user?.id) return;

        const notificationSubscription = supabase
            .channel(`public:notifications:recipient_id=eq.${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${user.id}`
                },
                (payload) => {
                    const newNotif = payload.new as AppNotification;
                    
                    // Update global state
                    addNotification(newNotif);
                    
                    // Trigger professional toast
                    toast(
                        `${newNotif.title}: ${newNotif.content}`,
                        newNotif.type === 'request' ? 'warning' : 'info'
                    );
                }
            )
            .subscribe();

        return () => {
            notificationSubscription.unsubscribe();
        };
    }, [user?.id, toast, addNotification]);

    return null;
}
