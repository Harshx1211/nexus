export const CONFIG = {
    platform: {
        name: "NEXUS",
        tagline: "Empowering Next-Gen Mentorship",
        logoText: "N",
    },
    user: {
        firstName: "Harsh", // Default for demo
        fullName: "Dr. Harsh Vardhan",
        role: "Senior Mentor",
        institution: "Nexus Academic Council",
    },
    university: {
        name: "Independent Mentor Group",
        shortName: "NEXUS",
    },
    contact: {
        email: "support@nexus-mentorship.com",
    },
    TIMEOUTS: {
        AUTH_RESOLUTION: 10000,
        DATA_FETCH_FAILSAFE: 10000,
        SUPABASE_REQUEST: 12000,
    },
    LIMITS: {
        RECENT_ACTIVITY: 4,
        UPCOMING_SESSIONS: 5,
    }
};
