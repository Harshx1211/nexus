/**
 * @file lib/csv-export.ts
 * @description Utility to convert JSON data to CSV and trigger a download in the browser.
 */

import { DbRow } from "@/types/app";

/**
 * Converts an array of objects into a CSV file and triggers a browser download.
 * 
 * @param data     - The array of objects (rows) to export.
 * @param filename - The desired name of the file (e.g. "sessions_export.csv").
 */
export function downloadCSV(data: DbRow[], filename: string): void {
    if (data.length === 0) return;

    // 1. Get headers
    const headers = Object.keys(data[0]);
    
    // 2. Build rows
    const rows = data.map(obj => {
        return headers.map(header => {
            const val = obj[header];
            // Escape quotes and wrap in quotes to handle commas within values
            const escaped = ('' + (val ?? '')).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',');
    });

    // 3. Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // 4. Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
