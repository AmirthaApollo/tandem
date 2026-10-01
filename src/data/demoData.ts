import type { AppState, CheckIn, JournalEntry, LogEntry, RoutineMoment } from "../engine/types";
import { dayKey } from "../engine/connectionEngine";

function iso(dayOffset: number, h: number, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function dateKey(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return dayKey(d);
}

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];

export function starterRoutine(petId: string, species: string): RoutineMoment[] {
  const id = (s: string) => `${petId}-${s}`;
  if (species === "cat") {
    return [
      { id: id("m1"), kind: "meal", label: "Breakfast", time: "07:45", days: ALL_DAYS, reminder: true, forWhom: "pet", benefit: "a pause to eat something too", petId },
      { id: id("p1"), kind: "play", label: "Morning play", time: "09:00", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a few minutes of movement", petId },
      { id: id("q1"), kind: "quiet", label: "Quiet window", time: "13:00", days: ALL_DAYS, reminder: false, forWhom: "pet", benefit: "a screen break for you too", petId },
      { id: id("p2"), kind: "play", label: "Evening play", time: "18:00", days: ALL_DAYS, reminder: true, forWhom: "both", benefit: "a few minutes of movement", petId },
      { id: id("m2"), kind: "meal", label: "Dinner", time: "19:00", days: ALL_DAYS, reminder: true, forWhom: "pet", benefit: "time to slow down", petId },
      { id: id("w1"), kind: "winddown", label: "Evening wind-down", time: "21:00", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a calmer evening", petId },
    ];
  }
  if (species === "small") {
    return [
      { id: id("m1"), kind: "meal", label: "Breakfast", time: "08:00", days: ALL_DAYS, reminder: true, forWhom: "pet", benefit: "a pause to eat something too", petId },
      { id: id("p1"), kind: "play", label: "Play & tidy", time: "10:00", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a few minutes of movement", petId },
      { id: id("o1"), kind: "outdoor", label: "Daylight break", time: "14:00", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "your daylight for the day", petId },
      { id: id("m2"), kind: "meal", label: "Dinner", time: "18:30", days: ALL_DAYS, reminder: true, forWhom: "pet", benefit: "time to slow down", petId },
      { id: id("w1"), kind: "winddown", label: "Evening wind-down", time: "20:30", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a calmer evening", petId },
    ];
  }
  // dog + other
  return [
    { id: id("w1"), kind: "walk", label: "Morning walk", time: "07:30", days: ALL_DAYS, reminder: true, forWhom: "both", benefit: "your daylight for the day", petId },
    { id: id("m1"), kind: "meal", label: "Breakfast", time: "08:15", days: ALL_DAYS, reminder: true, forWhom: "pet", benefit: "a pause to eat something too", petId },
    { id: id("b1"), kind: "break", label: "Midday break", time: "12:30", days: ALL_DAYS, reminder: true, forWhom: "both", benefit: "a screen break for you too", petId },
    { id: id("p1"), kind: "play", label: "Play", time: "15:00", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a few minutes of movement", petId },
    { id: id("w2"), kind: "walk", label: "Afternoon walk", time: "17:30", days: ALL_DAYS, reminder: true, forWhom: "both", benefit: "an afternoon reset", petId },
    { id: id("m2"), kind: "meal", label: "Dinner", time: "18:30", days: ALL_DAYS, reminder: true, forWhom: "pet", benefit: "time to slow down", petId },
    { id: id("w3"), kind: "winddown", label: "Evening wind-down", time: "20:30", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a calmer evening", petId },
  ];
}

function demoLogs(): LogEntry[] {
  const logs: LogEntry[] = [];
  let n = 0;
  const add = (dayOffset: number, kind: LogEntry["kind"], h: number, m: number, extra: Partial<LogEntry> = {}) => {
    logs.push({ id: `demo-${n++}`, ts: iso(dayOffset, h, m), kind, petId: "luna", ...extra });
  };

  // -6: great day
  add(-6, "walk", 7, 34, { durationMin: 24, byMemberId: "amirtha", business: true });
  add(-6, "meal", 8, 18, { byMemberId: "amirtha" });
  add(-6, "break", 12, 40, { byMemberId: "amirtha" });
  add(-6, "play", 15, 10, { byMemberId: "maya", durationMin: 12 });
  add(-6, "walk", 17, 36, { durationMin: 31, byMemberId: "amirtha" });
  add(-6, "meal", 18, 34, { byMemberId: "maya" });
  add(-6, "winddown", 20, 35, { byMemberId: "amirtha" });

  // -5: great
  add(-5, "walk", 7, 28, { durationMin: 22, byMemberId: "amirtha" });
  add(-5, "meal", 8, 20, { byMemberId: "amirtha" });
  add(-5, "break", 12, 35, { byMemberId: "amirtha" });
  add(-5, "play", 15, 5, { byMemberId: "amirtha" });
  add(-5, "walk", 17, 45, { durationMin: 28, byMemberId: "maya" });
  add(-5, "meal", 18, 40, { byMemberId: "amirtha" });

  // -4: rainy short walk
  add(-4, "walk", 8, 5, { durationMin: 9, byMemberId: "amirtha", note: "Quick one between showers" });
  add(-4, "meal", 8, 25, { byMemberId: "amirtha" });
  add(-4, "break", 12, 50, { byMemberId: "amirtha" });
  add(-4, "play", 15, 30, { byMemberId: "maya", durationMin: 18 });
  add(-4, "meal", 18, 35, { byMemberId: "amirtha" });

  // -3: slow day, no walk
  add(-3, "meal", 9, 10, { byMemberId: "amirtha" });
  add(-3, "play", 16, 0, { byMemberId: "amirtha" });
  add(-3, "meal", 19, 0, { byMemberId: "maya" });

  // -2: good
  add(-2, "walk", 7, 40, { durationMin: 26, byMemberId: "amirtha", business: true });
  add(-2, "meal", 8, 20, { byMemberId: "amirtha" });
  add(-2, "break", 12, 45, { byMemberId: "amirtha" });
  add(-2, "play", 15, 0, { byMemberId: "amirtha" });
  add(-2, "walk", 17, 30, { durationMin: 24, byMemberId: "maya" });
  add(-2, "meal", 18, 30, { byMemberId: "amirtha" });

  // -1: good
  add(-1, "walk", 7, 25, { durationMin: 30, byMemberId: "amirtha" });
  add(-1, "meal", 8, 15, { byMemberId: "maya" });
  add(-1, "break", 12, 30, { byMemberId: "amirtha" });
  add(-1, "play", 15, 15, { byMemberId: "amirtha", durationMin: 15 });
  add(-1, "walk", 17, 40, { durationMin: 35, byMemberId: "amirtha" });
  add(-1, "meal", 18, 45, { byMemberId: "amirtha" });

  // 0 (today): morning done, rest ahead
  const nowH = new Date().getHours();
  if (nowH >= 8) add(0, "walk", 7, 32, { durationMin: 23, byMemberId: "amirtha", business: true });
  if (nowH >= 9) add(0, "meal", 8, 18, { byMemberId: "amirtha" });

  return logs;
}

function demoCheckIns(): CheckIn[] {
  const moods: [number, number, CheckIn["mood"]][] = [
    [-6, 20, 5],
    [-5, 20, 4],
    [-4, 21, 3],
    [-3, 22, 2],
    [-2, 20, 4],
    [-1, 20, 5],
  ];
  return moods.map(([off, h, mood], i) => ({
    id: `ci-${i}`,
    date: dateKey(off),
    ts: iso(off, h),
    mood,
  }));
}

function demoJournal(): JournalEntry[] {
  return [
    {
      id: "j1",
      date: dateKey(-6),
      ts: iso(-6, 21),
      petId: "luna",
      favorite: "She carried her ball the whole walk and refused to put it down at the door.",
      notice: "She checked back on me more than usual. Maybe she could tell it was a slow week.",
    },
    {
      id: "j2",
      date: dateKey(-4),
      ts: iso(-4, 21, 30),
      petId: "luna",
      favorite: "Nine minutes between rain showers, but she was so happy to be out.",
    },
    {
      id: "j3",
      date: dateKey(-2),
      ts: iso(-2, 22),
      petId: "luna",
      favorite: "Maya took the afternoon walk and Luna came back with a new stick friend.",
      notice: "She loves Maya's routes. Different smells, same joy.",
    },
    {
      id: "j4",
      date: dateKey(-1),
      ts: iso(-1, 21),
      petId: "luna",
      favorite: "We just sat on the step for ten minutes doing nothing. Best part of the day.",
    },
    {
      id: "j5",
      date: dateKey(-9),
      ts: iso(-9, 20, 30),
      petId: "luna",
      favorite: "First proper long walk after a busy week. She remembered every tree.",
    },
  ];
}

export function createDemoState(): AppState {
  return {
    version: 1,
    onboarded: true,
    owner: {
      name: "Amirtha",
      workPattern: "home",
      outsideTime: "little",
      goals: ["More daylight", "More movement", "Time away from screens"],
    },
    pets: [
      {
        id: "luna",
        name: "Luna",
        species: "dog",
        ageRange: "3 years",
        hue: 24,
        food: { brand: "Open Farm", amount: "1 cup, twice daily" },
        quirks: "Carries a ball on every walk. Hates the vacuum. Loves the step outside the front door.",
        vet: { name: "Dr. Okafor, Riverbend Vet", phone: "555-0142" },
        weightLog: [{ date: dateKey(-30), kg: 21.4 }, { date: dateKey(-2), kg: 21.6 }],
      },
    ],
    activePetId: "luna",
    members: [
      { id: "amirtha", name: "Amirtha", role: "owner" },
      { id: "maya", name: "Maya", role: "housemate" },
    ],
    routine: starterRoutine("luna", "dog"),
    logs: demoLogs(),
    checkIns: demoCheckIns(),
    journal: demoJournal(),
    care: [
      {
        id: "c1",
        title: "Flea & tick treatment",
        type: "flea",
        date: dateKey(5),
        repeatDays: 30,
        petId: "luna",
      },
      {
        id: "c2",
        title: "Annual check-up",
        type: "vet",
        date: dateKey(-40),
        repeatDays: 365,
        petId: "luna",
        notes: "Ask about the occasional limp after long walks.",
      },
    ],
    vetNotes: [
      { id: "v1", text: "Mention the occasional limp after very long walks.", done: false, createdAt: iso(-3, 10) },
    ],
    experiments: [],
    prefs: { weatherEnabled: false, weatherCity: "", remindersInApp: true },
    nudgeState: { countByDay: {}, seen: [], dismissed: [] },
    milestonesSeen: [],
    streakStart: dateKey(-6),
  };
}

export interface RoutineAnswers {
  walks: "0-1" | "2" | "3+";
  meals: "1" | "2" | "3";
  play: "little" | "some" | "lots";
}

export function buildRoutine(petId: string, species: string, a: RoutineAnswers): RoutineMoment[] {
  const id = (s: string) => `${petId}-${s}`;
  const out: RoutineMoment[] = [];
  const walkTimes = ["07:30", "12:30", "17:30"];
  const walkCount = a.walks === "0-1" ? 1 : a.walks === "2" ? 2 : 3;
  const mealTimes = ["08:15", "12:45", "18:30"];
  const mealCount = Number(a.meals);
  const playTimes = a.play === "little" ? ["15:30"] : a.play === "some" ? ["15:00"] : ["10:00", "16:30"];
  const playCount = a.play === "little" ? 1 : a.play === "some" ? 1 : 2;

  if (species === "cat") {
    for (let i = 0; i < mealCount; i++) {
      out.push({ id: id(`m${i}`), kind: "meal", label: i === 0 ? "Breakfast" : i === mealCount - 1 ? "Dinner" : "Lunch", time: mealTimes[i], days: ALL_DAYS, reminder: true, forWhom: "pet", benefit: "a pause to eat something too", petId });
    }
    for (let i = 0; i < playCount; i++) {
      out.push({ id: id(`p${i}`), kind: "play", label: i === 0 ? "Play session" : "Evening play", time: playTimes[i], days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a few minutes of movement", petId });
    }
    out.push({ id: id("q1"), kind: "quiet", label: "Quiet window", time: "13:30", days: ALL_DAYS, reminder: false, forWhom: "pet", benefit: "a screen break for you too", petId });
    out.push({ id: id("wd"), kind: "winddown", label: "Evening wind-down", time: "21:00", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a calmer evening", petId });
  } else if (species === "small") {
    for (let i = 0; i < mealCount; i++) {
      out.push({ id: id(`m${i}`), kind: "meal", label: i === 0 ? "Breakfast" : "Dinner", time: mealTimes[i], days: ALL_DAYS, reminder: true, forWhom: "pet", benefit: "a pause to eat something too", petId });
    }
    for (let i = 0; i < playCount; i++) {
      out.push({ id: id(`p${i}`), kind: "play", label: i === 0 ? "Play & tidy" : "Evening play", time: playTimes[i], days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a few minutes of movement", petId });
    }
    out.push({ id: id("o1"), kind: "outdoor", label: "Daylight break", time: "14:00", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "your daylight for the day", petId });
    out.push({ id: id("wd"), kind: "winddown", label: "Evening wind-down", time: "20:30", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a calmer evening", petId });
  } else {
    for (let i = 0; i < walkCount; i++) {
      out.push({ id: id(`w${i}`), kind: "walk", label: i === 0 ? "Morning walk" : i === walkCount - 1 ? "Afternoon walk" : "Midday walk", time: walkTimes[i], days: ALL_DAYS, reminder: true, forWhom: "both", benefit: i === 0 ? "your daylight for the day" : "an afternoon reset", petId });
    }
    for (let i = 0; i < mealCount; i++) {
      out.push({ id: id(`m${i}`), kind: "meal", label: i === 0 ? "Breakfast" : i === mealCount - 1 ? "Dinner" : "Lunch", time: mealTimes[i], days: ALL_DAYS, reminder: true, forWhom: "pet", benefit: "a pause to eat something too", petId });
    }
    for (let i = 0; i < playCount; i++) {
      out.push({ id: id(`p${i}`), kind: "play", label: i === 0 ? "Play" : "Evening play", time: playTimes[i], days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a few minutes of movement", petId });
    }
    out.push({ id: id("b1"), kind: "break", label: "Midday break", time: "12:30", days: ALL_DAYS, reminder: true, forWhom: "both", benefit: "a screen break for you too", petId });
    out.push({ id: id("wd"), kind: "winddown", label: "Evening wind-down", time: "20:30", days: ALL_DAYS, reminder: false, forWhom: "both", benefit: "a calmer evening", petId });
  }

  return out.sort((x, y) => x.time.localeCompare(y.time));
}

export function createEmptyState(): AppState {
  return {
    version: 1,
    onboarded: false,
    owner: { name: "" },
    pets: [],
    activePetId: "",
    members: [],
    routine: [],
    logs: [],
    checkIns: [],
    journal: [],
    care: [],
    vetNotes: [],
    experiments: [],
    prefs: { weatherEnabled: false, weatherCity: "", remindersInApp: true },
    nudgeState: { countByDay: {}, seen: [], dismissed: [] },
    milestonesSeen: [],
  };
}