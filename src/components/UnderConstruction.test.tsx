import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UnderConstruction } from './UnderConstruction';

// Mock next/navigation router
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        back: mockBack,
    }),
}));

describe('UnderConstruction Component', () => {
    it('renders the correct title', () => {
        render(<UnderConstruction title="Analytics" />);
        expect(screen.getByText('Analytics Coming Soon')).toBeInTheDocument();
        expect(screen.getByText(/We're crafting something exceptional for you/i)).toBeInTheDocument();
    });

    it('navigates back when "Go Back" is clicked', () => {
        render(<UnderConstruction title="Settings" />);
        const backButton = screen.getByText(/Go Back/i);
        fireEvent.click(backButton);
        expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('has a link to return home', () => {
        render(<UnderConstruction title="Messages" />);
        const homeLink = screen.getByText('Return Home');
        expect(homeLink.closest('a')).toHaveAttribute('href', '/');
    });
});
