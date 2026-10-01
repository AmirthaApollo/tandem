import { describe, expect, it } from "vitest";
import {
  applyKindnessFilter,
  buildDaySchedule,
  buildWeekStats,
  computeMilestones,
  computeObservations,
  describeWeatherCode,
  getNextDueMoment,
  humanizeCountdown,
  humanizeDuration,
  momentsForDay,
  pickExperiment,
  wellbeingSignals,
} from "./connectionEngine";
import type { AppState, LogEntry, RoutineMoment } from "./types";

const walk: RoutineMoment = {
  id: "w1",
  kind: "walk",
  label: "Morning walk",
  time: "08:00",
  days: [1, 2, 3, 4, 5],
  reminder: true,
  forWhom: "both",
  benefit: "your daylight for the day",
  petId: "luna",
};

const walk2: RoutineMoment = { ...walk, id: "w2", label: "Afternoon walk", time: "17:30" };

function log(kind: LogEntry["kind"], iso: string, extra: Partial<LogEntry> = {}): LogEntry {
  return { id: `${kind}-${iso}`, ts: iso, kind, petId: "luna", ...extra };
}

describe("time helpers", () => {
  it("humanizes durations", () => {
    expect(humanizeDuration(0)).toBe("now");
    expect(humanizeDuration(20 * 60000)).toBe("20 minutes");
    expect(humanizeDuration(65 * 60000)).toBe("1 hour 5 minutes");
    expect(humanizeCountdown(20 * 60000)).toBe("due in 20 minutes");
  });
});

describe("momentsForDay", () => {
  it("filters by weekday and pet", () => {
    const monday = new Date(2026, 0, 5); // Monday
    const sunday = new Date(2026, 0, 4);
    expect(momentsForDay([walk, walk2], monday, "luna").length).toBe(2);
    expect(momentsForDay([walk, walk2], sunday, "luna").length).toBe(0);
  });
});

describe("buildDaySchedule", () => {
  const monday = new Date(2026, 0, 5);
  it("marks a moment done when a matching log exists nearby", () => {
    const schedule = buildDaySchedule(
      [walk],
      [log("walk", new Date(2026, 0, 5, 8, 5).toISOString(), { durationMin: 22 })],
      monday,
      "luna",
      new Date(2026, 0, 5, 9, 0),
    );
    expect(schedule[0].state).toBe("done");
    expect(schedule[0].log?.durationMin).toBe(22);
  });

  it("marks a moment due within the due-soon window", () => {
    const schedule = buildDaySchedule([walk], [], monday, "luna", new Date(2026, 0, 5, 7, 30));
    expect(schedule[0].state).toBe("due");
    expect(schedule[0].countdownMs).toBe(30 * 60000);
  });

  it("marks later moments upcoming", () => {
    const schedule = buildDaySchedule([walk, walk2], [], monday, "luna", new Date(2026, 0, 5, 6, 0));
    expect(schedule[0].state).toBe("upcoming");
    expect(schedule[1].state).toBe("upcoming");
  });

  it("consumes one log per moment (two walks need two logs)", () => {
    const schedule = buildDaySchedule(
      [walk, walk2],
      [log("walk", new Date(2026, 0, 5, 8, 0).toISOString())],
      monday,
      "luna",
      new Date(2026, 0, 5, 18, 0),
    );
    expect(schedule.filter((s) => s.state === "done").length).toBe(1);
  });
});

describe("getNextDueMoment", () => {
  it("prefers the due moment over upcoming ones", () => {
    const monday = new Date(2026, 0, 5);
    const schedule = buildDaySchedule([walk, walk2], [], monday, "luna", new Date(2026, 0, 5, 7, 40));
    expect(getNextDueMoment(schedule)?.moment.id).toBe("w1");
  });
});

describe("applyKindnessFilter", () => {
  const baseState = { countByDay: {}, seen: [], dismissed: [] };
  const candidates = [
    { id: "daylight:2026-01-05", text: "a", tone: "daylight" as const, priority: 1 },
    { id: "movement:2026-01-05", text: "b", tone: "movement" as const, priority: 2 },
    { id: "evening:2026-01-05", text: "c", tone: "evening" as const, priority: 3 },
  ];

  it("caps at two nudges per day", () => {
    const res = applyKindnessFilter(candidates, new Date(2026, 0, 5, 12, 0), baseState);
    expect(res.nudges.length).toBe(2);
    expect(res.state.countByDay["2026-01-05"]).toBe(2);
  });

  it("is silent at night", () => {
    const res = applyKindnessFilter(candidates, new Date(2026, 0, 5, 22, 0), baseState);
    expect(res.nudges.length).toBe(0);
  });

  it("never repeats a dismissed nudge", () => {
    const res = applyKindnessFilter(candidates, new Date(2026, 0, 5, 12, 0), {
      ...baseState,
      dismissed: ["daylight:2026-01-05"],
    });
    expect(res.nudges.map((n) => n.id)).not.toContain("daylight:2026-01-05");
  });

  it("never repeats a seen nudge", () => {
    const res = applyKindnessFilter(candidates, new Date(2026, 0, 5, 12, 0), {
      ...baseState,
      seen: ["daylight:2026-01-05", "movement:2026-01-05"],
    });
    expect(res.nudges.length).toBe(1);
  });

  it("respects the minimum gap between nudges", () => {
    const res = applyKindnessFilter(candidates, new Date(2026, 0, 5, 12, 0), {
      ...baseState,
      lastDeliveredTs: new Date(2026, 0, 5, 11, 0).toISOString(),
    });
    expect(res.nudges.length).toBe(0);
  });
});

describe("buildWeekStats + observations", () => {
  it("reports sparse data honestly", () => {
    const stats = buildWeekStats([], [], [walk], "luna", new Date(2026, 0, 5));
    const obs = computeObservations(stats, "Luna");
    expect(obs[0].kind).toBe("sparse");
    expect(obs[0].text).not.toMatch(/proves|causes/i);
  });

  it("counts walks and outdoor minutes", () => {
    const now = new Date(2026, 0, 5, 20, 0);
    const logs: LogEntry[] = [
      log("walk", new Date(2026, 0, 5, 8, 0).toISOString(), { durationMin: 25 }),
      log("walk", new Date(2026, 0, 5, 18, 0).toISOString(), { durationMin: 30 }),
      log("meal", new Date(2026, 0, 5, 9, 0).toISOString()),
    ];
    const stats = buildWeekStats(logs, [], [walk], "luna", now);
    const today = stats[stats.length - 1];
    expect(today.walks).toBe(2);
    expect(today.meals).toBe(1);
    expect(today.outdoorMin).toBe(55);
    expect(today.morningOutdoor).toBe(true);
  });
});

describe("pickExperiment", () => {
  it("returns the active experiment if one exists", () => {
    const active = {
      id: "e1",
      title: "t",
      detail: "d",
      startDate: "2026-01-01",
      days: 3,
      active: true,
      joinedDates: [],
    };
    expect(pickExperiment([], "Luna", [active]).id).toBe("e1");
  });

  it("creates a modest experiment with no clinical claims", () => {
    const exp = pickExperiment([], "Luna", []);
    expect(exp.active).toBe(true);
    expect(exp.detail).not.toMatch(/diagnos|treat|medicat/i);
  });
});

describe("milestones", () => {
  it("stays soft and non-gamified", () => {
    const state = {
      logs: Array.from({ length: 50 }, (_, i) =>
        log("walk", new Date(2026, 0, 5, 8, 0).toISOString(), { id: `w${i}` } as Partial<LogEntry>),
      ),
      pets: [{ id: "luna", name: "Luna" }],
      activePetId: "luna",
    } as unknown as AppState;
    const m = computeMilestones(state, new Date());
    expect(m.join(" ")).toContain("50th walk");
    expect(m.join(" ")).not.toMatch(/badge|leaderboard|points/i);
  });
});

describe("wellbeing signals", () => {
  it("suggests a vet gently after repeated quiet days, without diagnosing", () => {
    const stats = [0, 1, 2].map((i) => ({
      date: `2026-01-0${i + 1}`,
      walks: 0,
      meals: 0,
      plays: 0,
      outdoorMin: 0,
      mood: undefined,
      morningOutdoor: false,
      routineMoments: 5,
      doneMoments: 0,
    }));
    const signals = wellbeingSignals(stats, [], "Luna");
    expect(signals.some((s) => s.kind === "pet")).toBe(true);
    const text = signals.map((s) => s.text).join(" ");
    expect(text).toContain("vet");
    expect(text).not.toMatch(/diagnos|medication|dose|limp/i);
  });

  it("offers owner support after repeated low check-ins", () => {
    const checkIns = [
      { id: "a", date: "2026-01-03", ts: "", mood: 1 as const },
      { id: "b", date: "2026-01-02", ts: "", mood: 2 as const },
    ];
    const signals = wellbeingSignals([], checkIns, "Luna");
    const text = signals.map((s) => s.text).join(" ");
    expect(text).toContain("reach out");
    expect(text).toContain("emergency");
  });

  it("stays quiet when days are steady", () => {
    const stats = [0, 1, 2].map((i) => ({
      date: `2026-01-0${i + 1}`,
      walks: 2,
      meals: 2,
      plays: 1,
      outdoorMin: 40,
      mood: 4 as const,
      morningOutdoor: true,
      routineMoments: 5,
      doneMoments: 4,
    }));
    expect(wellbeingSignals(stats, [], "Luna")).toHaveLength(0);
  });
});

describe("weather codes", () => {
  it("flags rain", () => {
    expect(describeWeatherCode(0).rain).toBe(false);
    expect(describeWeatherCode(61).rain).toBe(true);
    expect(describeWeatherCode(95).rain).toBe(true);
  });
});