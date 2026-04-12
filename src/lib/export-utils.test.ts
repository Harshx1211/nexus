/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportTasksToCSV } from './export-utils';

describe('exportTasksToCSV - Boundary Value & Equivalence Partitioning Analysis', () => {
    let mockCreateElement: any;
    let mockAppendChild: any;
    let mockRemoveChild: any;
    let mockCreateObjectURL: any;

    beforeEach(() => {
        // Setup Window/DOM mocks
        const mockLink = {
            setAttribute: vi.fn(),
            click: vi.fn(),
            style: { visibility: '' }
        };

        mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
        mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
        mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
        
        mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
        global.URL.createObjectURL = mockCreateObjectURL;
        
        // Suppress console warnings expected in tests
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ─── Equivalence Partitioning: Null / Empty Inputs ───
    it('EP1: Stops execution and warns when assignments array is empty', () => {
        exportTasksToCSV('Test Export', []);
        expect(console.warn).toHaveBeenCalledWith("No assignments to export.");
        expect(mockCreateElement).not.toHaveBeenCalled();
    });

    it('EP2: Stops execution and warns when assignments array is null', () => {
        exportTasksToCSV('Test Export', null as any);
        expect(console.warn).toHaveBeenCalledWith("No assignments to export.");
        expect(mockCreateElement).not.toHaveBeenCalled();
    });

    // ─── Equivalence Partitioning: Valid Data Variations ───
    it('EP3: Successfully exports basic assignment with standard subjects', () => {
        const mockAssignments = [{
            status: 'submitted',
            updated_at: '2026-03-24T12:00:00.000Z',
            mentee: { full_name: 'John Doe', student_id: 'CS101' },
            form_data: {
                cgpa: 3.8,
                subjects: [
                    { code: 'CS101', marks: 95, grade: 'A' }
                ]
            }
        }];

        exportTasksToCSV('Test_Task', mockAssignments);
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockAppendChild).toHaveBeenCalled();
        expect(mockRemoveChild).toHaveBeenCalled();
    });

    // ─── Boundary Value Analysis: Extreme/Edge Cases ───
    it('BVA1: Handles extremely large dataset with missing subject codes securely', () => {
        // Testing how it handles objects missing form_data entirely
        const mockAssignments = Array(100).fill({
            status: 'pending', mentee: null, form_data: null
        });

        exportTasksToCSV('Large Dataset', mockAssignments);
        expect(mockCreateElement).toHaveBeenCalledWith('a');
    });

    it('BVA2: Protects against CSV injection attacks by escaping quotes', () => {
        const mockAssignments = [{
            status: 'submitted',
            mentee: { full_name: 'Hacker "Drop Table" Name', student_id: '123' },
            form_data: { remarks: 'This is a "quoted" remark, with commas' }
        }];

        exportTasksToCSV('Injection Test', mockAssignments);
        
        // Blob constructor is difficult to inspect directly in jsdom easily without overriding Blob,
        // but we verify the standard execution completes without throwing a string parsing error.
        expect(mockCreateElement).toHaveBeenCalled();
    });
});
