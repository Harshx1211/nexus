"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("GlobalError", "Uncaught app error", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 mb-8">
        <AlertCircle className="w-10 h-10" />
      </div>
      
      <h2 className="text-3xl font-bold text-white tracking-tight">Something went wrong</h2>
      <p className="mt-4 text-slate-400 max-w-md mx-auto leading-relaxed">
        An unexpected error occurred while processing your request. Our team has been notified.
      </p>
      
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all active:scale-95"
        >
          <RefreshCw className="w-5 h-5" /> Try Again
        </button>
        <Link 
          href="/dashboard"
          className="flex items-center gap-2 px-8 py-4 bg-white/5 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <Home className="w-5 h-5" /> Go Home
        </Link>
      </div>

      <div className="mt-12 p-4 rounded-2xl bg-slate-900 border border-white/5 text-left max-w-lg w-full">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Error Details</p>
        <p className="text-sm font-mono text-rose-400/80 break-all">{error.message || "Unknown error"}</p>
        {error.digest && <p className="text-[10px] font-mono text-slate-600 mt-2">Digest: {error.digest}</p>}
      </div>
    </div>
  );
}
