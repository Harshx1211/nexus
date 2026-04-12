import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// BUG-39 FIX: Add runtime validation for environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined") {
        console.error("SUPABASE CONFIG ERROR: Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local");
    }
}

// Use standard fetch to avoid conflicting with per-request signals
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
