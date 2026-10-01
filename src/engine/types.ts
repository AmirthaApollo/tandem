export type Species = "dog" | "cat" | "small" | "other";

export type MomentKind =
  | "walk"
  | "meal"
  | "play"
  | "outdoor"
  | "quiet"
  | "break"
  | "winddown";

export type ForWhom = "pet" | "you" | "both";

export interface Pet {
  id: string;
  name: string;
  species: Species;
  ageRange: string;
  energy?: "calm" | "balanced" | "energetic";
  photo?: string;
  hue: number;
  weightLog?: { date: string; kg: number }[];
  food?: { brand: string; amount: string; note?: string };
  quirks?: string;
  vet?: { name?: string; phone?: string };
}

export interface Member {
  id: string;
  name: string;
  role: "owner" | "housemate";
}

export interface Owner {
  name: string;
  workPattern?: "home" | "hybrid" | "out";
  outsideTime?: "little" | "some" | "plenty";
  goals?: string[];
}

export interface RoutineMoment {
  id: string;
  kind: MomentKind;
  label: string;
  time: string; // "HH:mm"
  days: number[]; // 0=Sun..6=Sat
  reminder: boolean;
  forWhom: ForWhom;
  benefit: string; // owner-side line
  petId: string | "all";
}

export type LogKind = MomentKind;

export interface LogEntry {
  id: string;
  ts: string; // ISO
  kind: LogKind;
  petId: string;
  durationMin?: number;
  byMemberId?: string;
  business?: boolean;
  long?: boolean;
  note?: string;
  manual?: boolean;
}

export interface CheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  ts: string;
  mood: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  ts: string;
  favorite: string;
  notice?: string;
  photo?: string;
  petId: string;
}

export type CareType = "vaccination" | "flea" | "vet" | "grooming" | "other";

export interface CareReminder {
  id: string;
  title: string;
  type: CareType;
  date: string; // YYYY-MM-DD
  repeatDays?: number;
  notes?: string;
  petId: string;
}

export interface Experiment {
  id: string;
  title: string;
  detail: string;
  startDate: string;
  days: number;
  active: boolean;
  joinedDates: string[];
  notes?: string;
}

export interface VetNote {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface Weather {
  city: string;
  tempC: number;
  code: number;
  isRain: boolean;
  fetchedAt: string;
  hours?: { time: string; tempC: number; precip: number }[];
}

export interface Prefs {
  weatherEnabled: boolean;
  weatherCity: string;
  remindersInApp: boolean;
  reducedMotion?: boolean;
}

export interface NudgeState {
  /** YYYY-MM-DD -> number of nudges delivered that day */
  countByDay: Record<string, number>;
  /** ids of nudges already shown, so we never repeat */
  seen: string[];
  /** ids dismissed by the user, never show again */
  dismissed: string[];
  lastDeliveredTs?: string;
}

export interface AppState {
  version: number;
  onboarded: boolean;
  owner: Owner;
  pets: Pet[];
  activePetId: string;
  members: Member[];
  routine: RoutineMoment[];
  logs: LogEntry[];
  checkIns: CheckIn[];
  journal: JournalEntry[];
  care: CareReminder[];
  vetNotes: VetNote[];
  experiments: Experiment[];
  prefs: Prefs;
  nudgeState: NudgeState;
  weather?: Weather;
  awayUntil?: string; // ISO, alone-time awareness
  streakStart?: string;
  milestonesSeen: string[];
}

export interface Nudge {
  id: string;
  text: string;
  tone: "daylight" | "movement" | "break" | "evening" | "care";
  priority: number;
}

export interface ScheduledMoment {
  moment: RoutineMoment;
  date: string;
  at: Date;
  state: "done" | "due" | "upcoming";
  log?: LogEntry;
  countdownMs: number;
  overdue: boolean;
}