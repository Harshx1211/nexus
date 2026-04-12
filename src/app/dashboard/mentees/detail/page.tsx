"use client";

import { useSearchParams } from "next/navigation";
import MenteeDetailClient from "./MenteeDetailClient";
import React, { Suspense } from "react";

function MenteeDetailWithParams() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    if (!id) {
        return (
            <div className="p-10 text-center">
                <p className="text-slate-500 font-bold">No Mentee ID provided.</p>
            </div>
        );
    }

    return <MenteeDetailClient id={id} />;
}

export default function MenteeDetailPage() {
    return (
        <Suspense fallback={<div className="p-10 shimmer-skeleton h-60 rounded-2xl" />}>
            <MenteeDetailWithParams />
        </Suspense>
    );
}
