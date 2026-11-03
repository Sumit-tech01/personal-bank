"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import Sheet from "./Sheet";

interface ConfirmOptions {
  title: string;
  message: string;
  details?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const finish = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Sheet
        open={!!state}
        onClose={() => finish(false)}
        title={state?.options.title}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => finish(false)}
            >
              {state?.options.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              className={state?.options.danger ? "btn-danger" : "btn-primary"}
              onClick={() => finish(true)}
            >
              {state?.options.confirmLabel ?? "Confirm"}
            </button>
          </div>
        }
      >
        <p className="text-[15px] leading-6 text-ink-secondary">
          {state?.options.message}
        </p>
        {state?.options.details && (
          <div className="mt-4 rounded-2xl bg-canvas p-4 text-sm text-ink-secondary">
            {state.options.details}
          </div>
        )}
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue["confirm"] {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside ConfirmProvider");
  return context.confirm;
}
