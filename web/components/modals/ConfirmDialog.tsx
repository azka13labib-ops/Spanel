"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button by default to prevent accidental trigger
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
      iconBg: "bg-rose-50 border-rose-100",
      confirmBtn:
        "bg-rose-600 hover:bg-rose-700 text-white focus-visible:ring-rose-500",
    },
    warning: {
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      iconBg: "bg-amber-50 border-amber-100",
      confirmBtn:
        "bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-500",
    },
    info: {
      icon: <Info className="w-5 h-5 text-indigo-600" />,
      iconBg: "bg-indigo-50 border-indigo-100",
      confirmBtn:
        "bg-indigo-600 hover:bg-indigo-700 text-white focus-visible:ring-indigo-500",
    },
  }[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden p-6 space-y-4">
        {/* Header with icon */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${variantStyles.iconBg}`}
          >
            {variantStyles.icon}
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold text-gray-900 tracking-tight"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="text-xs text-gray-600 mt-1.5 leading-relaxed"
            >
              {description}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-gray-400 outline-none cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs focus-visible:ring-2 outline-none cursor-pointer disabled:opacity-50 ${variantStyles.confirmBtn}`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
