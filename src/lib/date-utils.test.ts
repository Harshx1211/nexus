import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, getDeadlineStatus, getInitials, timeAgo } from './date-utils';

describe('date-utils', () => {
    beforeEach(() => {
        // Tells vitest to use fake time
        vi.useFakeTimers();
        // Set the system time to a fixed date so tests are predictable
        // Let's set it to 2026-03-23T12:00:00.000Z
        vi.setSystemTime(new Date('2026-03-23T12:00:00.000Z'));
    });

    afterEach(() => {
        // Restore real time after each test
        vi.useRealTimers();
    });

    describe('formatDate', () => {
        it('returns "No Deadline" for null', () => {
            expect(formatDate(null)).toBe('No Deadline');
        });

        it('returns "Today" for today\'s date', () => {
            expect(formatDate('2026-03-23T15:00:00.000Z')).toBe('Today');
        });

        it('returns "Tomorrow" for tomorrow\'s date', () => {
            expect(formatDate('2026-03-24T12:00:00.000Z')).toBe('Tomorrow');
        });

        it('returns "Yesterday" for yesterday\'s date', () => {
            expect(formatDate('2026-03-22T12:00:00.000Z')).toBe('Yesterday');
        });

        it('returns formatted date for current year', () => {
            expect(formatDate('2026-10-15T12:00:00.000Z')).toBe('15-Oct');
        });

        it('returns formatted date without year for different year', () => {
            expect(formatDate('2027-10-15T12:00:00.000Z')).toBe('15-Oct');
        });
    });

    describe('getDeadlineStatus', () => {
        it('returns "normal" for null', () => {
            expect(getDeadlineStatus(null)).toBe('normal');
        });

        it('returns "overdue" for a past date', () => {
            expect(getDeadlineStatus('2026-03-20T12:00:00.000Z')).toBe('overdue');
        });

        it('returns "today" for today', () => {
            expect(getDeadlineStatus('2026-03-23T12:00:00.000Z')).toBe('today');
        });

        it('returns "upcoming" for tomorrow', () => {
            expect(getDeadlineStatus('2026-03-24T12:00:00.000Z')).toBe('upcoming');
        });

        it('returns "normal" for date far in future', () => {
            expect(getDeadlineStatus('2026-05-01T12:00:00.000Z')).toBe('normal');
        });
    });

    describe('getInitials', () => {
        it('returns "??" for empty name string', () => {
            expect(getInitials('')).toBe('??');
        });

        it('returns first two letters capitalized for single word', () => {
            expect(getInitials('harsh')).toBe('HA');
        });

        it('returns first letters of first and last word capitalized', () => {
            expect(getInitials('John Doe')).toBe('JD');
        });
        
        it('ignores extra spaces', () => {
            expect(getInitials('  John   Doe  ')).toBe('JD');
        });
    });

    describe('timeAgo', () => {
        it('returns Just now for recent seconds', () => {
            expect(timeAgo('2026-03-23T11:59:30.000Z')).toBe('Just now');
        });

        it('returns minutes ago', () => {
            expect(timeAgo('2026-03-23T11:50:00.000Z')).toBe('10m ago');
        });

        it('returns hours ago', () => {
            expect(timeAgo('2026-03-23T08:00:00.000Z')).toBe('4h ago');
        });

        it('returns days ago', () => {
            expect(timeAgo('2026-03-21T12:00:00.000Z')).toBe('2d ago');
        });
    });
});
