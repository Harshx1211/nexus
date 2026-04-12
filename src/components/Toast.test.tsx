import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider, useToast } from './Toast';

// Dummy component to trigger hooks
const TestComponent = () => {
    const { toast, confirm, prompt } = useToast();

    return (
        <div>
            <button onClick={() => toast('Standard Information', 'info')}>Trigger Info</button>
            <button onClick={() => toast('Success Operation', 'success')}>Trigger Success</button>
            <button onClick={() => toast('Failed Attempt', 'error')}>Trigger Error</button>
            
            <button onClick={async () => {
                const res = await confirm({ title: 'Delete?', message: 'Are you sure?', variant: 'danger' });
                toast(`Confirmed: ${res}`, 'info');
            }}>Trigger Confirm</button>

            <button onClick={async () => {
                const res = await prompt({ title: 'Name?', message: 'Enter your name' });
                toast(`Prompt: ${res}`, 'info');
            }}>Trigger Prompt</button>
        </div>
    );
};

describe('ToastProvider Integration - System Response Validation', () => {
    // ─── Component Rendering ───
    it('CR1: Renders children correctly within the provider context', () => {
        render(
            <ToastProvider>
                <div data-testid="child-element">Hello Nexus</div>
            </ToastProvider>
        );
        expect(screen.getByTestId('child-element')).toBeInTheDocument();
    });

    // ─── Equivalence Partitions: Toast Variants ───
    it('EP1: Successfully spawns and renders info toast notification', () => {
        render(
            <ToastProvider><TestComponent /></ToastProvider>
        );
        
        fireEvent.click(screen.getByText('Trigger Info'));
        expect(screen.getByText('Standard Information')).toBeInTheDocument();
    });

    it('EP2: Successfully spawns and renders success toast notification', () => {
        render(
            <ToastProvider><TestComponent /></ToastProvider>
        );
        
        fireEvent.click(screen.getByText('Trigger Success'));
        expect(screen.getByText('Success Operation')).toBeInTheDocument();
    });

    // ─── Interaction Behavior & DOM Mocks ───
    it('IB1: Dialog workflow handles Confirm interaction securely', async () => {
        render(
            <ToastProvider><TestComponent /></ToastProvider>
        );
        
        // 1. Spawns modal
        fireEvent.click(screen.getByText('Trigger Confirm'));
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        
        // 2. User confirms execution
        fireEvent.click(screen.getByText('Confirm'));
        
        // 3. System responds by verifying modal closed and state updated (toast response)
        await waitFor(() => {
            expect(screen.getByText('Confirmed: true')).toBeInTheDocument();
        });
    });

    it('IB2: Dialog workflow handles Cancel interaction securely in Prompt', async () => {
         render(
            <ToastProvider><TestComponent /></ToastProvider>
        );
        
        // 1. Spawns input modal
        fireEvent.click(screen.getByText('Trigger Prompt'));
        expect(screen.getByText('Enter your name')).toBeInTheDocument();
        
        // 2. User cancels execution
        fireEvent.click(screen.getByText('Cancel'));
        
        // 3. System responds by verifying cancellation state (Prompt: null)
        await waitFor(() => {
            expect(screen.queryByText('Prompt: null')).toBeInTheDocument();
        });
    });
});
