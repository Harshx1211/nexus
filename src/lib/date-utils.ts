/**
 * @file lib/date-utils.ts
 * @description Standard Date Utility for NEXUS.
 * Handles year display, deadline calculations, and name initials consistently.
 */

export const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'No Deadline';
    const date = new Date(dateStr);
    const now = new Date();
    
    // Normalize to compare dates without time
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((dDate.getTime() - dNow.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    
    // Always omit year — sessions/tasks/leaves are always near-future or recent.
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/ /g, '-');
};

export type DeadlineStatus = 'overdue' | 'today' | 'upcoming' | 'normal';

export const getDeadlineStatus = (due_date: string | null | undefined): DeadlineStatus => {
    if (!due_date) return 'normal';
    const dateObj = new Date(due_date);
    const now = new Date();
    
    // Normalize dates to midnight for day-based comparison
    const dDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dDate < dNow) return 'overdue';
    if (dDate.getTime() === dNow.getTime()) return 'today'; // Due today
    
    const diff = dDate.getTime() - dNow.getTime();
    // Less than 3 days remaining
    if (diff <= 3 * 24 * 60 * 60 * 1000) return 'upcoming';
    
    return 'normal';
};


export const getInitials = (name: string | null | undefined): string => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase(); // "Harsh" -> "HA"
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(); // "Harsh R" -> "HR"
};

/**
 * Groups an array of items by a specific date field.
 */
export function groupItemsByDate<T>(items: T[], dateGetter: (item: T) => string): Record<string, T[]> {
    return items.reduce((groups, item) => {
        const date = dateGetter(item);
        const groupDate = formatDate(date); // Decides "Today", "Yesterday", or "Mar 18"
        if (!groups[groupDate]) {
            groups[groupDate] = [];
        }
        groups[groupDate].push(item);
        return groups;
    }, {} as Record<string, T[]>);
}

export const timeAgo = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
