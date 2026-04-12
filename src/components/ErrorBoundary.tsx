"use client";

import React, { ReactNode, ReactElement } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactElement;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary component for catching and handling React component errors
 * Prevents single component crashes from bringing down entire page
 * Addresses SRS Requirement NFR-10: Fault-tolerant frontend
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(_error: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
                        <div className="max-w-md w-full space-y-6">
                            {/* Error Icon */}
                            <div className="flex justify-center">
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                                    <AlertTriangle className="w-10 h-10 text-red-500" />
                                </div>
                            </div>

                            {/* Error Message */}
                            <div className="space-y-2 text-center">
                                <h1 className="text-2xl font-bold text-white">Oops! Something went wrong</h1>
                                <p className="text-slate-400 text-sm">
                                    We encountered an unexpected error. Don&apos;t worry, our team has been notified.
                                </p>
                            </div>

                            {/* Error Details (Dev Only) */}
                            {process.env.NODE_ENV === "development" && this.state.error && (
                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 font-mono text-xs text-red-400 max-h-40 overflow-auto">
                                    <p className="font-bold mb-2">Error Details:</p>
                                    <p>{this.state.error.message}</p>
                                    {this.state.errorInfo && (
                                        <details className="mt-2 text-slate-300">
                                            <summary className="cursor-pointer hover:text-white">Stack Trace</summary>
                                            <pre className="mt-2 text-[10px] overflow-auto">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </button>
                                <Link
                                    href="/dashboard"
                                    className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-slate-100 font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    Go Home
                                </Link>
                            </div>

                            {/* Support Message */}
                            <p className="text-center text-xs text-slate-500">
                                If this problem persists, please contact{" "}
                                <a href="mailto:support@nexus-mentorship.com" className="text-primary hover:underline">
                                    support@nexus-mentorship.com
                                </a>
                            </p>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
