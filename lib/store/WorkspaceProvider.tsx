"use client";

// React context wrapping the workspace store. Hydrates from localStorage on
// mount (SSR-safe), persists on every change, and exposes typed actions + the
// active case to the whole app via the useWorkspace() hook.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CaseData, Preferences, WorkspaceState } from "./types";
import {
  createCase as createCaseFn,
  deleteCase as deleteCaseFn,
  loadWorkspace,
  saveWorkspace,
  updateCase,
  DEFAULT_PREFS,
} from "./store";
import { seedCases } from "./demo";

interface WorkspaceCtx {
  ready: boolean;
  cases: CaseData[];
  activeCase: CaseData;
  prefs: Preferences;
  setActiveCase: (id: string) => void;
  createCase: (title: string) => void;
  removeCase: (id: string) => void;
  /** Update the active case immutably. */
  updateActive: (fn: (c: CaseData) => CaseData) => void;
  setPref: (patch: Partial<Preferences>) => void;
  toggleDark: () => void;
  /** Wipe all local data and reseed (Settings → Data & privacy). */
  resetAll: () => void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

function initialState(): WorkspaceState {
  const cases = seedCases();
  return { cases, activeCaseId: cases[0].meta.id, prefs: { ...DEFAULT_PREFS } };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // Hydrate once on mount.
  useEffect(() => {
    setState(loadWorkspace());
    hydrated.current = true;
    setReady(true);
  }, []);

  // Persist after hydration (never clobber storage with the pre-hydration seed).
  useEffect(() => {
    if (hydrated.current) saveWorkspace(state);
  }, [state]);

  const setActiveCase = useCallback((id: string) => {
    setState((s) => ({ ...s, activeCaseId: id }));
  }, []);

  const createCase = useCallback((title: string) => {
    setState((s) => createCaseFn(s, title));
  }, []);

  const removeCase = useCallback((id: string) => {
    setState((s) => deleteCaseFn(s, id));
  }, []);

  const updateActive = useCallback((fn: (c: CaseData) => CaseData) => {
    setState((s) => updateCase(s, s.activeCaseId, fn));
  }, []);

  const setPref = useCallback((patch: Partial<Preferences>) => {
    setState((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
  }, []);

  const toggleDark = useCallback(() => {
    setState((s) => ({ ...s, prefs: { ...s.prefs, dark: !s.prefs.dark } }));
  }, []);

  const resetAll = useCallback(() => {
    setState(initialState());
  }, []);

  const activeCase = useMemo(
    () =>
      state.cases.find((c) => c.meta.id === state.activeCaseId) ?? state.cases[0],
    [state.cases, state.activeCaseId],
  );

  const value = useMemo<WorkspaceCtx>(
    () => ({
      ready,
      cases: state.cases,
      activeCase,
      prefs: state.prefs,
      setActiveCase,
      createCase,
      removeCase,
      updateActive,
      setPref,
      toggleDark,
      resetAll,
    }),
    [
      ready,
      state.cases,
      state.prefs,
      activeCase,
      setActiveCase,
      createCase,
      removeCase,
      updateActive,
      setPref,
      toggleDark,
      resetAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used within <WorkspaceProvider>");
  return ctx;
}
