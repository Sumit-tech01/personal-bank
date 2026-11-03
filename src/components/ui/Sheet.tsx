"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  dismissible?: boolean;
}

export default function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  dismissible = true,
}: SheetProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
      );
      target?.focus({ preventScroll: true });
    }, 120);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open, dismissible]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] animate-fade-in md:items-center md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-card shadow-sheet animate-sheet-in md:max-h-[88dvh] md:rounded-[28px] ${
          size === "lg" ? "md:max-w-2xl" : "md:max-w-lg"
        }`}
      >
        {(title || subtitle) && (
          <div className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-[13px] leading-5 text-ink-secondary">
                  {subtitle}
                </p>
              )}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                className="icon-button -mr-1 -mt-1 h-10 w-10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {children}
        </div>

        {footer && (
          <div className="safe-bottom border-t border-line bg-white px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
