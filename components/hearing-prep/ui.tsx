"use client";

// Shared UI primitives for the Hearing Prep workspace: the Material Symbols
// icon component and the app-level UI context (current view, toast, evidence
// slide-over). Kept in its own module so every view can import the hook without
// a circular dependency on the shell.

import { createContext, useContext, type CSSProperties } from "react";
import type { ViewKey } from "@/lib/store/types";

export function Icon({
  name,
  fill = false,
  size = 22,
  color,
  style,
}: {
  name: string;
  fill?: boolean;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={fill ? "msr fill" : "msr"}
      style={{ fontSize: size, color, ...style }}
      aria-hidden
    >
      {name}
    </span>
  );
}

export interface ToastData {
  msg: string;
  icon?: string;
}

export interface UICtx {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  showToast: (msg: string, icon?: string) => void;
  /** Open the evidence detail slide-over (works from any view). */
  openEvidence: (id: string) => void;
}

const Ctx = createContext<UICtx | null>(null);

export const UIProvider = Ctx.Provider;

export function useUI(): UICtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUI must be used within the app shell");
  return ctx;
}
