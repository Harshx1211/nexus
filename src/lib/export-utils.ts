/**
 * @file lib/export-utils.ts
 * @description Utility for exporting task data to CSV with flattened subject mapping.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportTasksToCSV = (taskTitle: string, assignments: any[]) => {
    if (!assignments || assignments.length === 0) {
        console.warn("No assignments to export.");
        return;
    }

    // 1. Identify all unique subject codes across all assignments
    const subjectCodes = new Set<string>();
    assignments.forEach(a => {
        const formData = a.form_data || {};
        if (formData.subjects && Array.isArray(formData.subjects)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formData.subjects.forEach((s: any) => {
                if (s.code) subjectCodes.add(s.code.toUpperCase().trim());
            });
        }
    });

    const sortedCodes = Array.from(subjectCodes).sort();

    // 2. Define standard headers
    const headers = [
        "Mentee Name",
        "Student ID",
        "Status",
        "Submitted At",
        ...sortedCodes.flatMap(code => [`Sub: ${code} (Marks)`, `Sub: ${code} (Grade)`]),
        "CGPA",
        "SGPA",
        "Company",
        "Role",
        "Package (LPA)",
        "Remarks"
    ];

    // 3. Generate Rows
    const rows = assignments.map(a => {
        const formData = a.form_data || {};
        const subjects = formData.subjects || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subMap: Record<string, any> = {};
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subjects.forEach((s: any) => {
            if (s.code) subMap[s.code.toUpperCase().trim()] = s;
        });

        const row = [
            a.mentee?.full_name || "N/A",
            a.mentee?.student_id || "N/A",
            a.status,
            a.updated_at ? new Date(a.updated_at).toLocaleString("en-IN") : "N/A",
            ...sortedCodes.flatMap(code => {
                const s = subMap[code];
                return [s?.marks || "", s?.grade || ""];
            }),
            formData.cgpa || "",
            formData.sgpa || "",
            formData.company || "",
            formData.role || "",
            formData.package || "",
            formData.remarks || ""
        ];

        return row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",");
    });

    // 4. Combine and Trigger Download
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const fileName = `${taskTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
