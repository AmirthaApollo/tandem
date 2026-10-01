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
import type {
  AppState,
  CareReminder,
  CheckIn,
  Experiment,
  JournalEntry,
  LogEntry,
  LogKind,
  Member,
  Nudge,
  Pet,
  Prefs,
  RoutineMoment,
  VetNote,
  Weather,
} from "../engine/types";
import { createDemoState, createEmptyState } from "../data/demoData";
import { clearState, loadState, saveState } from "./storage";

export type ToastKind = "info" | "success" | "care";
export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface AppContextValue {
  state: AppState;
  pet: Pet | undefined;
  update: (fn: (s: AppState) => AppState) => void;
  toasts: Toast[];
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;

  updateOwner: (patch: Partial<AppState["owner"]>) => void;
  addPet: (pet: Pet) => void;
  updatePet: (id: string, patch: Partial<Pet>) => void;
  setActivePet: (id: string) => void;
  addMember: (name: string) => Member;
  removeMember: (id: string) => void;

  setRoutine: (moments: RoutineMoment[]) => void;
  updateMoment: (id: string, patch: Partial<RoutineMoment>) => void;
  addMoment: (moment: RoutineMoment) => void;
  removeMoment: (id: string) => void;

  logActivity: (kind: LogKind, opts?: Partial<LogEntry>) => LogEntry;
  removeLog: (id: string) => void;
  addCheckIn: (mood: CheckIn["mood"], note?: string) => void;

  addJournal: (entry: Omit<JournalEntry, "id" | "ts">) => void;
  removeJournal: (id: string) => void;

  addCare: (reminder: Omit<CareReminder, "id">) => void;
  updateCare: (id: string, patch: Partial<CareReminder>) => void;
  removeCare: (id: string) => void;

  addVetNote: (text: string) => void;
  toggleVetNote: (id: string) => void;
  removeVetNote: (id: string) => void;

  setPrefs: (patch: Partial<Prefs>) => void;
  setWeather: (w: Weather | undefined) => void;
  setAwayUntil: (iso: string | undefined) => void;

  markNudgesSeen: (nudges: Nudge[]) => void;
  dismissNudgeById: (id: string) => void;

  setExperiment: (exp: Experiment) => void;
  joinExperimentDay: () => void;

  resetDemo: () => void;
  startFresh: () => void;
  exportJSON: () => void;
  markMilestoneSeen: (text: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

let idc = 0;
export function uid(prefix = "id"): string {
  idc += 1;
  return `${prefix}-${Date.now().toString(36)}-${idc}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const storageWarned = useRef(false);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => fn(prev));
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = uid("toast");
    setToasts((t) => [...t, { id, message, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Persist on every change.
  useEffect(() => {
    const res = saveState(state);
    if (!res.ok && !storageWarned.current) {
      storageWarned.current = true;
      toast(res.error ?? "Couldn't save locally.", "care");
    }
  }, [state, toast]);

  const pet = useMemo(
    () => state.pets.find((p) => p.id === state.activePetId) ?? state.pets[0],
    [state.pets, state.activePetId],
  );

  const updateOwner = useCallback((patch: Partial<AppState["owner"]>) => {
    update((s) => ({ ...s, owner: { ...s.owner, ...patch } }));
  }, [update]);

  const addPet = useCallback((p: Pet) => {
    update((s) => ({
      ...s,
      pets: [...s.pets, p],
      activePetId: s.activePetId || p.id,
      routine: s.routine.length ? s.routine : [],
    }));
  }, [update]);

  const updatePet = useCallback((id: string, patch: Partial<Pet>) => {
    update((s) => ({ ...s, pets: s.pets.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, [update]);

  const setActivePet = useCallback((id: string) => update((s) => ({ ...s, activePetId: id })), [update]);

  const addMember = useCallback(
    (name: string) => {
      const m: Member = { id: uid("member"), name, role: "housemate" };
      update((s) => ({ ...s, members: [...s.members, m] }));
      return m;
    },
    [update],
  );

  const removeMember = useCallback((id: string) => {
    update((s) => ({ ...s, members: s.members.filter((m) => m.id !== id) }));
  }, [update]);

  const setRoutine = useCallback((moments: RoutineMoment[]) => update((s) => ({ ...s, routine: moments })), [update]);
  const updateMoment = useCallback((id: string, patch: Partial<RoutineMoment>) => {
    update((s) => ({ ...s, routine: s.routine.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, [update]);
  const addMoment = useCallback((moment: RoutineMoment) => {
    update((s) => ({ ...s, routine: [...s.routine, moment] }));
  }, [update]);
  const removeMoment = useCallback((id: string) => {
    update((s) => ({ ...s, routine: s.routine.filter((m) => m.id !== id) }));
  }, [update]);

  const logActivity = useCallback(
    (kind: LogKind, opts: Partial<LogEntry> = {}) => {
      const entry: LogEntry = {
        id: uid("log"),
        ts: new Date().toISOString(),
        kind,
        petId: opts.petId ?? state.activePetId,
        ...opts,
      };
      update((s) => ({ ...s, logs: [...s.logs, entry] }));
      return entry;
    },
    [update, state.activePetId],
  );

  const removeLog = useCallback((id: string) => {
    update((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) }));
  }, [update]);

  const addCheckIn = useCallback(
    (mood: CheckIn["mood"], note?: string) => {
      const now = new Date();
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      update((s) => ({
        ...s,
        checkIns: [
          ...s.checkIns.filter((c) => c.date !== key),
          { id: uid("checkin"), date: key, ts: now.toISOString(), mood, note },
        ],
      }));
    },
    [update],
  );

  const addJournal = useCallback(
    (entry: Omit<JournalEntry, "id" | "ts">) => {
      update((s) => ({ ...s, journal: [{ ...entry, id: uid("journal"), ts: new Date().toISOString() }, ...s.journal] }));
    },
    [update],
  );

  const removeJournal = useCallback((id: string) => {
    update((s) => ({ ...s, journal: s.journal.filter((j) => j.id !== id) }));
  }, [update]);

  const addCare = useCallback((reminder: Omit<CareReminder, "id">) => {
    update((s) => ({ ...s, care: [...s.care, { ...reminder, id: uid("care") }] }));
  }, [update]);
  const updateCare = useCallback((id: string, patch: Partial<CareReminder>) => {
    update((s) => ({ ...s, care: s.care.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, [update]);
  const removeCare = useCallback((id: string) => {
    update((s) => ({ ...s, care: s.care.filter((c) => c.id !== id) }));
  }, [update]);

  const addVetNote = useCallback((text: string) => {
    const note: VetNote = { id: uid("vet"), text, done: false, createdAt: new Date().toISOString() };
    update((s) => ({ ...s, vetNotes: [...s.vetNotes, note] }));
  }, [update]);
  const toggleVetNote = useCallback((id: string) => {
    update((s) => ({ ...s, vetNotes: s.vetNotes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)) }));
  }, [update]);
  const removeVetNote = useCallback((id: string) => {
    update((s) => ({ ...s, vetNotes: s.vetNotes.filter((n) => n.id !== id) }));
  }, [update]);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
  }, [update]);

  const setWeather = useCallback((w: Weather | undefined) => update((s) => ({ ...s, weather: w })), [update]);
  const setAwayUntil = useCallback((iso: string | undefined) => update((s) => ({ ...s, awayUntil: iso })), [update]);

  const markNudgesSeen = useCallback((nudges: Nudge[]) => {
    if (!nudges.length) return;
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    update((s) => ({
      ...s,
      nudgeState: {
        ...s.nudgeState,
        countByDay: { ...s.nudgeState.countByDay, [key]: (s.nudgeState.countByDay[key] ?? 0) + nudges.length },
        seen: [...s.nudgeState.seen, ...nudges.map((n) => n.id)],
        lastDeliveredTs: now.toISOString(),
      },
    }));
  }, [update]);

  const dismissNudgeById = useCallback((id: string) => {
    update((s) => ({
      ...s,
      nudgeState: {
        ...s.nudgeState,
        dismissed: s.nudgeState.dismissed.includes(id)
          ? s.nudgeState.dismissed
          : [...s.nudgeState.dismissed, id],
      },
    }));
  }, [update]);

  const setExperiment = useCallback((exp: Experiment) => {
    update((s) => ({ ...s, experiments: [...s.experiments.filter((e) => e.id !== exp.id), exp] }));
  }, [update]);

  const joinExperimentDay = useCallback(() => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    update((s) => ({
      ...s,
      experiments: s.experiments.map((e) =>
        e.active && !e.joinedDates.includes(key)
          ? { ...e, joinedDates: [...e.joinedDates, key] }
          : e,
      ),
    }));
  }, [update]);

  const resetDemo = useCallback(() => {
    clearState();
    setState(createDemoState());
    toast("Demo data restored. Luna's day is fresh again.", "success");
  }, [toast]);

  const startFresh = useCallback(() => {
    clearState();
    setState(createEmptyState());
    toast("Starting fresh. Let's meet your pet.", "success");
  }, [toast]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tandem-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Exported your Tandem data.", "success");
  }, [state, toast]);

  const markMilestoneSeen = useCallback((text: string) => {
    update((s) => ({ ...s, milestonesSeen: [...s.milestonesSeen, text] }));
  }, [update]);

  const value: AppContextValue = {
    state,
    pet,
    update,
    toasts,
    toast,
    dismissToast,
    updateOwner,
    addPet,
    updatePet,
    setActivePet,
    addMember,
    removeMember,
    setRoutine,
    updateMoment,
    addMoment,
    removeMoment,
    logActivity,
    removeLog,
    addCheckIn,
    addJournal,
    removeJournal,
    addCare,
    updateCare,
    removeCare,
    addVetNote,
    toggleVetNote,
    removeVetNote,
    setPrefs,
    setWeather,
    setAwayUntil,
    markNudgesSeen,
    dismissNudgeById,
    setExperiment,
    joinExperimentDay,
    resetDemo,
    startFresh,
    exportJSON,
    markMilestoneSeen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}