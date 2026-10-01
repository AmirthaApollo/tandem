import type {
  AppState,
  CheckIn,
  Experiment,
  LogEntry,
  Nudge,
  NudgeState,
  Owner,
  Pet,
  RoutineMoment,
  ScheduledMoment,
  Weather,
} from "./types";

/* ------------------------------------------------------------------ *
 * Time helpers (all local-time, no timezone math beyond Date)        *
 * ------------------------------------------------------------------ */

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${pad(m)}${ampm}`;
}

export function dateAt(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
}

/** "20 minutes", "1 hour 5 minutes", "now" */
export function humanizeDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins <= 0) return "now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hPart = `${h} hour${h === 1 ? "" : "s"}`;
  return m ? `${hPart} ${m} minute${m === 1 ? "" : "s"}` : hPart;
}

export function humanizeCountdown(ms: number): string {
  if (ms <= 60000) return "due now";
  return `due in ${humanizeDuration(ms)}`;
}

/* ------------------------------------------------------------------ *
 * Schedule building                                                  *
 * ------------------------------------------------------------------ */

const DUE_SOON_MS = 45 * 60 * 1000;
const MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

export function momentsForDay(
  routine: RoutineMoment[],
  date: Date,
  petId: string,
): RoutineMoment[] {
  const dow = date.getDay();
  return routine
    .filter((m) => m.days.includes(dow))
    .filter((m) => m.petId === "all" || m.petId === petId)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

/**
 * Build today's schedule and resolve each moment's state by matching
 * logged activity. One log is consumed by at most one moment.
 */
export function buildDaySchedule(
  routine: RoutineMoment[],
  logs: LogEntry[],
  date: Date,
  petId: string,
  now: Date = new Date(),
): ScheduledMoment[] {
  const moments = momentsForDay(routine, date, petId);
  const key = dayKey(date);
  const dayLogs = logs
    .filter((l) => l.petId === petId && dayKey(new Date(l.ts)) === key)
    .sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
  const used = new Set<string>();

  return moments.map((moment) => {
    const at = dateAt(date, moment.time);
    const candidates = dayLogs.filter(
      (l) =>
        !used.has(l.id) &&
        l.kind === moment.kind &&
        Math.abs(+new Date(l.ts) - +at) <= MATCH_WINDOW_MS,
    );
    let log: LogEntry | undefined;
    if (candidates.length) {
      candidates.sort(
        (a, b) => Math.abs(+new Date(a.ts) - +at) - Math.abs(+new Date(b.ts) - +at),
      );
      log = candidates[0];
      used.add(log.id);
    }

    const delta = +at - +now;
    let state: ScheduledMoment["state"];
    if (log) state = "done";
    else if (delta <= DUE_SOON_MS) state = "due";
    else state = "upcoming";

    return {
      moment,
      date: key,
      at,
      state,
      log,
      countdownMs: delta,
      overdue: !log && delta < -30 * 60 * 1000,
    };
  });
}

export function getNextDueMoment(schedule: ScheduledMoment[]): ScheduledMoment | undefined {
  return schedule.find((s) => s.state === "due") ?? schedule.find((s) => s.state === "upcoming");
}

export function completedCount(schedule: ScheduledMoment[]): number {
  return schedule.filter((s) => s.state === "done").length;
}

/* ------------------------------------------------------------------ *
 * Nudges + kindness filter                                           *
 * ------------------------------------------------------------------ */

export interface NudgeContext {
  now: Date;
  owner: Owner;
  pet: Pet;
  schedule: ScheduledMoment[];
  logs: LogEntry[];
  checkIns: CheckIn[];
  nudgeState: NudgeState;
  weather?: Weather;
  awayUntil?: string;
  weatherEnabled: boolean;
  lastCheckInTs?: string;
}

const NIGHT_START = 21 * 60; // 9pm
const NIGHT_END = 7 * 60; // 7am
const MIN_GAP_MS = 3 * 60 * 60 * 1000;

function minutesNow(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

function lastOutdoorTs(logs: LogEntry[], now: Date): number | undefined {
  const today = dayKey(now);
  const outdoors = logs
    .filter(
      (l) =>
        (l.kind === "walk" || l.kind === "outdoor") &&
        dayKey(new Date(l.ts)) === today,
    )
    .map((l) => +new Date(l.ts));
  return outdoors.length ? Math.max(...outdoors) : undefined;
}

/** Generate candidate nudges before filtering, in priority order. */
export function candidateNudges(ctx: NudgeContext): Nudge[] {
  const { now, pet, schedule, logs, weatherEnabled, weather, awayUntil } = ctx;
  const today = dayKey(now);
  const out: Nudge[] = [];
  const mins = minutesNow(now);
  const daytime = mins >= NIGHT_END && mins < NIGHT_START;

  const outdoor = lastOutdoorTs(logs, now);
  const nextWalk = schedule.find((s) => s.moment.kind === "walk" && s.state !== "done");

  // Alone-time awareness takes priority when the owner is out.
  if (awayUntil && +new Date(awayUntil) > +now && daytime) {
    out.push({
      id: `away:${today}`,
      tone: "care",
      priority: 0,
      text: `You're out for a bit. If it runs long, a midday check-in or a sitter handoff keeps ${pet.name} comfortable.`,
    });
  }

  if (!outdoor && daytime) {
    if (nextWalk) {
      const due = Math.max(0, nextWalk.countdownMs);
      const when = due <= 0 ? "right about now" : `in ${humanizeDuration(due)}`;
      out.push({
        id: `daylight:${today}`,
        tone: "daylight",
        priority: 1,
        text: `You haven't been outside today. ${pet.name}'s walk is ${when}. A good moment for you to get some air too.`,
      });
    } else {
      out.push({
        id: `daylight:${today}`,
        tone: "daylight",
        priority: 1,
        text: `No time outside yet today. Even ten minutes of daylight lifts most people — and ${pet.name} won't argue.`,
      });
    }
  }

  const lastAny = logs.length ? Math.max(...logs.map((l) => +new Date(l.ts))) : undefined;
  const sinceActivity = lastAny ? +now - lastAny : Infinity;
  if (daytime && mins >= 11 * 60 && sinceActivity > 3 * 60 * 60 * 1000) {
    out.push({
      id: `movement:${today}`,
      tone: "movement",
      priority: 2,
      text: `It's been a few hours at your desk. ${pet.name} would love a short play break, and so would you.`,
    });
  }

  if (
    weatherEnabled &&
    weather &&
    !weather.isRain &&
    mins >= 17 * 60 &&
    mins < 20 * 60 &&
    outdoor
  ) {
    out.push({
      id: `evening:${today}`,
      tone: "evening",
      priority: 3,
      text: `It's a beautiful evening for a slow walk. Dry and mild in ${weather.city}.`,
    });
  }

  if (daytime && mins >= 14 * 60 && !ctx.lastCheckInTs) {
    out.push({
      id: `checkin:${today}`,
      tone: "care",
      priority: 4,
      text: `How's your day going? A ten-second check-in helps Tandem notice what's working for you.`,
    });
  }

  return out;
}

export interface KindnessResult {
  nudges: Nudge[];
  state: NudgeState;
}

/**
 * Kindness filter:
 *  - never late at night
 *  - never repeat a nudge already shown
 *  - never repeat one the user dismissed
 *  - at most 2 a day
 *  - at least 3 hours between nudges
 */
export function applyKindnessFilter(
  candidates: Nudge[],
  now: Date,
  state: NudgeState,
): KindnessResult {
  const today = dayKey(now);
  const mins = minutesNow(now);
  const nextState: NudgeState = {
    ...state,
    countByDay: { ...state.countByDay },
    seen: [...state.seen],
    dismissed: [...state.dismissed],
  };

  if (mins >= NIGHT_START || mins < NIGHT_END) {
    return { nudges: [], state: nextState };
  }

  const usedToday = state.countByDay[today] ?? 0;
  let remaining = Math.max(0, 2 - usedToday);
  if (remaining === 0) return { nudges: [], state: nextState };

  if (state.lastDeliveredTs && +now - +new Date(state.lastDeliveredTs) < MIN_GAP_MS) {
    return { nudges: [], state: nextState };
  }

  const picked: Nudge[] = [];
  for (const n of [...candidates].sort((a, b) => a.priority - b.priority)) {
    if (remaining <= 0) break;
    if (state.seen.includes(n.id) || state.dismissed.includes(n.id)) continue;
    picked.push(n);
    remaining -= 1;
  }

  if (picked.length) {
    nextState.countByDay[today] = usedToday + picked.length;
    nextState.seen = [...nextState.seen, ...picked.map((n) => n.id)];
    nextState.lastDeliveredTs = now.toISOString();
  }

  return { nudges: picked, state: nextState };
}

export function dismissNudge(id: string, state: NudgeState): NudgeState {
  if (state.dismissed.includes(id)) return state;
  return { ...state, dismissed: [...state.dismissed, id] };
}

/* ------------------------------------------------------------------ *
 * Weekly insights                                                    *
 * ------------------------------------------------------------------ */

export interface DayStat {
  date: string;
  walks: number;
  meals: number;
  plays: number;
  outdoorMin: number;
  mood?: number;
  morningOutdoor: boolean;
  routineMoments: number;
  doneMoments: number;
}

export function lastNDays(now: Date, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

export function buildWeekStats(
  logs: LogEntry[],
  checkIns: CheckIn[],
  routine: RoutineMoment[],
  petId: string,
  now: Date,
  days = 7,
): DayStat[] {
  return lastNDays(now, days).map((key) => {
    const dayLogs = logs.filter((l) => l.petId === petId && dayKey(new Date(l.ts)) === key);
    const date = parseDayKey(key);
    const scheduled = momentsForDay(routine, date, petId);
    const outdoorLogs = dayLogs.filter((l) => l.kind === "walk" || l.kind === "outdoor");
    const check = checkIns.find((c) => c.date === key);
    const schedule = buildDaySchedule(routine, logs, date, petId, new Date(+date + 12 * 3600e3));
    return {
      date: key,
      walks: dayLogs.filter((l) => l.kind === "walk").length,
      meals: dayLogs.filter((l) => l.kind === "meal").length,
      plays: dayLogs.filter((l) => l.kind === "play").length,
      outdoorMin: outdoorLogs.reduce((a, l) => a + (l.durationMin ?? (l.kind === "walk" ? 20 : 0)), 0),
      mood: check?.mood,
      morningOutdoor: outdoorLogs.some((l) => new Date(l.ts).getHours() < 12),
      routineMoments: scheduled.length,
      doneMoments: schedule.filter((s) => s.state === "done").length,
    };
  });
}

export interface Observation {
  id: string;
  text: string;
  kind: "outdoor" | "mood" | "consistency" | "sparse";
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function computeObservations(
  stats: DayStat[],
  petName: string,
): Observation[] {
  const out: Observation[] = [];
  const withMood = stats.filter((s) => s.mood !== undefined);
  const loggedDays = stats.filter((s) => s.walks + s.meals + s.plays > 0);

  if (loggedDays.length < 4) {
    out.push({
      id: "sparse",
      kind: "sparse",
      text: `Only ${loggedDays.length} day${loggedDays.length === 1 ? "" : "s"} of data so far. A few more logs and Tandem will start noticing patterns for you and ${petName}.`,
    });
    return out;
  }

  const twoWalkDays = stats.filter((s) => s.walks >= 2);
  const fewerWalkDays = stats.filter((s) => s.walks < 2);
  if (twoWalkDays.length >= 2 && fewerWalkDays.length >= 2) {
    const diff = Math.round(avg(twoWalkDays.map((s) => s.outdoorMin)) - avg(fewerWalkDays.map((s) => s.outdoorMin)));
    if (diff > 5) {
      out.push({
        id: "outdoor",
        kind: "outdoor",
        text: `In your logs this week, on days ${petName} got two walks you spent about ${diff} more minutes outside.`,
      });
    }
  }

  const morningMood = withMood.filter((s) => s.morningOutdoor).map((s) => s.mood!);
  const laterMood = withMood.filter((s) => !s.morningOutdoor).map((s) => s.mood!);
  if (morningMood.length >= 2 && laterMood.length >= 1) {
    const diff = avg(morningMood) - avg(laterMood);
    if (diff > 0.3) {
      out.push({
        id: "mood",
        kind: "mood",
        text: `In your check-ins this week, your mood tended to be a little higher on days you got outside before noon.`,
      });
    } else if (diff < -0.3) {
      out.push({
        id: "mood",
        kind: "mood",
        text: `Your check-ins this week were steady — no clear link between morning outdoor time and mood yet.`,
      });
    }
  }

  const steady = stats.filter((s) => s.routineMoments > 0 && s.doneMoments / s.routineMoments >= 0.6).length;
  if (steady >= 4) {
    out.push({
      id: "consistency",
      kind: "consistency",
      text: `${steady} of 7 days had a morning routine this week. That steadiness is the part that tends to stick.`,
    });
  } else if (steady > 0) {
    out.push({
      id: "consistency",
      kind: "consistency",
      text: `${steady} of 7 days had a full morning routine. Slow days are part of it — tomorrow's a new loop around the block.`,
    });
  }

  return out;
}

export function pickExperiment(stats: DayStat[], petName: string, existing: Experiment[]): Experiment {
  if (existing.some((e) => e.active)) {
    return existing.find((e) => e.active)!;
  }
  const withMood = stats.filter((s) => s.mood !== undefined);
  const lowAfternoon =
    withMood.length >= 3 && avg(withMood.map((s) => s.mood!)) <= 3.5;
  const littleMorning = stats.filter((s) => s.morningOutdoor).length < 3;

  let detail =
    "Try a 10-minute walk after lunch for three days and see how your afternoons feel.";
  if (littleMorning) {
    detail = `Try taking ${petName}'s morning moment outside before you open anything else for three days. Notice how the rest of the morning feels.`;
  } else if (lowAfternoon) {
    detail = "Try a short daylight break before 3pm for three days. Just notice your check-ins afterward.";
  }

  return {
    id: `exp-${Date.now()}`,
    title: "This week's gentle experiment",
    detail,
    startDate: dayKey(new Date()),
    days: 3,
    active: true,
    joinedDates: [],
  };
}

/* ------------------------------------------------------------------ *
 * Wellbeing signals — gentle, never diagnostic                       *
 * ------------------------------------------------------------------ */

export interface WellbeingSignal {
  kind: "pet" | "owner";
  text: string;
}

/**
 * Looks for repeated quiet days to softly suggest checking with a vet —
 * never diagnosing, never naming conditions or treatments.
 */
export function wellbeingSignals(
  stats: DayStat[],
  checkIns: CheckIn[],
  petName: string,
): WellbeingSignal[] {
  const out: WellbeingSignal[] = [];
  const last3 = stats.slice(-3);
  if (
    last3.length === 3 &&
    last3.every((s) => s.routineMoments > 0 && s.doneMoments <= 1)
  ) {
    out.push({
      kind: "pet",
      text: `It's been a quiet few days for ${petName}. If something feels off, a vet is the best person to ask — Tandem only tracks routine, it can't tell you how they're doing.`,
    });
  }

  const recent = [...checkIns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const lowDays = recent.filter((c) => c.mood <= 2).length;
  if (recent.length >= 2 && lowDays >= 2) {
    out.push({
      kind: "owner",
      text: "A few low check-ins in a row. You don't have to carry that quietly — it can help to reach out to someone you trust or a qualified professional. If you're ever in immediate danger, contact your local emergency services.",
    });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Milestones                                                         *
 * ------------------------------------------------------------------ */

export function computeMilestones(state: AppState, now: Date): string[] {
  const out: string[] = [];
  const walks = state.logs.filter((l) => l.kind === "walk").length;
  const pet = state.pets.find((p) => p.id === state.activePetId);
  const name = pet?.name ?? "your pet";
  if (walks >= 50) out.push(`Your 50th walk with ${name}.`);
  else if (walks >= 25) out.push(`25 walks together. Quietly impressive.`);
  else if (walks >= 10) out.push(`10 walks with ${name}. The good kind of routine.`);
  const mornings = state.logs.filter(
    (l) => (l.kind === "walk" || l.kind === "outdoor") && new Date(l.ts).getHours() < 10,
  ).length;
  if (mornings >= 14) out.push(`A month of mornings, together.`);
  void now;
  return out;
}

/* ------------------------------------------------------------------ *
 * Weather helpers                                                    *
 * ------------------------------------------------------------------ */

export function describeWeatherCode(code: number): { label: string; rain: boolean } {
  if (code === 0) return { label: "Clear", rain: false };
  if (code <= 2) return { label: "Mostly clear", rain: false };
  if (code === 3) return { label: "Overcast", rain: false };
  if (code >= 45 && code <= 48) return { label: "Foggy", rain: false };
  if (code >= 51 && code <= 67) return { label: "Rainy", rain: true };
  if (code >= 71 && code <= 77) return { label: "Snowy", rain: true };
  if (code >= 80 && code <= 82) return { label: "Showers", rain: true };
  if (code >= 95) return { label: "Stormy", rain: true };
  return { label: "Mixed", rain: false };
}

export function cozyLine(weather: Weather | undefined, petName: string): string {
  if (!weather) return `A slow walk suits today. ${petName} won't mind a shorter one.`;
  if (weather.isRain) return `Cozy weather. A shorter loop, or a longer indoor play, works just as well.`;
  if (weather.tempC <= 4) return `Cold out. A brisk short walk, then warm up together.`;
  if (weather.tempC >= 28) return `Warm day. Early or late is kinder on both of you.`;
  return `Mild and easy out there. A good day for the longer loop.`;
}