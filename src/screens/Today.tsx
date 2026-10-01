import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, KIND_ICON } from "../components/icons";
import { AvatarBlob, Card, DrawCheck, ProgressRing, StateBadge } from "../components/ui";
import { useApp } from "../store/AppContext";
import { useNav } from "../nav";
import { useNow } from "../hooks/useNow";
import {
  applyKindnessFilter,
  buildDaySchedule,
  buildWeekStats,
  candidateNudges,
  completedCount,
  formatClock,
  getNextDueMoment,
  humanizeCountdown,
  wellbeingSignals,
  type NudgeContext,
} from "../engine/connectionEngine";
import type { CheckIn, Nudge, ScheduledMoment } from "../engine/types";
import { WeatherCard } from "../components/WeatherCard";

const MOODS: { mood: CheckIn["mood"]; label: string; hue: number }[] = [
  { mood: 1, label: "Rough", hue: 12 },
  { mood: 2, label: "Low", hue: 30 },
  { mood: 3, label: "Okay", hue: 45 },
  { mood: 4, label: "Good", hue: 90 },
  { mood: 5, label: "Great", hue: 150 },
];

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Today() {
  const { state, pet, logActivity, addCheckIn, toast, dismissNudgeById, markNudgesSeen } = useApp();
  const { navigate, openWalk } = useNav();
  const now = useNow(1000);
  const [wag, setWag] = useState(false);
  const [loggedBy, setLoggedBy] = useState(state.members[0]?.id ?? "");
  const [nudge, setNudge] = useState<Nudge | undefined>();
  const markedRef = useRef<Set<string>>(new Set());

  const petName = pet?.name ?? "your pet";
  const schedule = useMemo(
    () => buildDaySchedule(state.routine, state.logs, now, state.activePetId, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.routine, state.logs, state.activePetId, now.getMinutes()],
  );
  const next = getNextDueMoment(schedule);
  const done = completedCount(schedule);

  // Build a single contextual nudge, honouring the kindness filter.
  useEffect(() => {
    if (!pet) return;
    const ctx: NudgeContext = {
      now,
      owner: state.owner,
      pet,
      schedule,
      logs: state.logs,
      checkIns: state.checkIns,
      nudgeState: state.nudgeState,
      weather: state.weather,
      awayUntil: state.awayUntil,
      weatherEnabled: state.prefs.weatherEnabled,
      lastCheckInTs: state.checkIns.find((c) => c.date === todayKey(now))?.ts,
    };
    const candidates = candidateNudges(ctx);
    const { nudges } = applyKindnessFilter(candidates, now, state.nudgeState);
    const first = nudges[0];
    if (first && !markedRef.current.has(first.id)) {
      markedRef.current.add(first.id);
      setNudge(first);
      markNudgesSeen([first]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.logs.length, state.activePetId, now.getHours()]);

  const todaysCheckIn = state.checkIns.find((c) => c.date === todayKey(now));

  const stableNow = useMemo(() => new Date(), []);
  const signals = useMemo(
    () =>
      wellbeingSignals(
        buildWeekStats(state.logs, state.checkIns, state.routine, state.activePetId, stableNow),
        state.checkIns,
        petName,
      ),
    [state.logs, state.checkIns, state.routine, state.activePetId, petName, stableNow],
  );

  function complete(m: ScheduledMoment) {
    logActivity(m.moment.kind, { byMemberId: loggedBy || undefined, durationMin: m.moment.kind === "walk" ? 20 : undefined });
    setWag(true);
    window.setTimeout(() => setWag(false), 800);
    toast(`${m.moment.label} logged. You both showed up today.`, "success");
  }

  function quickLog(kind: "meal" | "play" | "outdoor") {
    logActivity(kind, { byMemberId: loggedBy || undefined });
    setWag(true);
    window.setTimeout(() => setWag(false), 800);
    const labels: Record<string, string> = { meal: "Meal logged", play: "Play logged", outdoor: "Outside time logged" };
    toast(`${labels[kind]}${memberName(loggedBy) ? ` — ${memberName(loggedBy)}` : ""}. Nice one.`, "success");
  }

  function memberName(id: string): string {
    return state.members.find((m) => m.id === id)?.name ?? "";
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
        <AvatarBlob name={petName} hue={pet?.hue ?? 24} photo={pet?.photo} size={64} wag={wag} />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl truncate">
            {greeting(now)}, {state.owner.name || "friend"}. {petName}'s up.
          </h1>
          <p className="text-mocha text-sm sm:text-base mt-0.5">Let's make today good for both of you.</p>
        </div>
      </header>

      {next && (
        <NextMomentCard
          item={next}
          onComplete={() => (next.moment.kind === "walk" ? openWalk() : complete(next))}
          onOpenWalk={openWalk}
        />
      )}

      {signals.map((s, i) => (
        <Card key={i} className="p-5 flex items-start gap-3 border-clay/30">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay-soft/60 text-clay-deep">
            <Icon name={s.kind === "pet" ? "shield" : "heart"} size={20} />
          </span>
          <p className="text-sm leading-relaxed">
            {s.text}
            {s.kind === "owner" && (
              <span className="block mt-1 text-[11px] text-faint">Tandem isn't a medical service. It only listens to your check-ins.</span>
            )}
          </p>
        </Card>
      ))}

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-start">
        <SharedDay schedule={schedule} onComplete={complete} members={state.members} />

        <div className="space-y-5">
          <Card className="p-5 flex items-center gap-5">
            <ProgressRing value={schedule.length ? done / schedule.length : 0} size={124} label={`${done} of ${schedule.length} moments done`}>
              <div className="text-center">
                <div className="num text-3xl">{done}</div>
                <div className="text-[11px] text-faint">of {schedule.length}</div>
              </div>
            </ProgressRing>
            <div className="min-w-0">
              <h2 className="text-lg">Together ring</h2>
              <p className="text-sm text-mocha mt-1">
                {done === schedule.length && schedule.length > 0
                  ? "Every moment done. That's a full day, together."
                  : `${done} of ${schedule.length} moments done today. No score — just a shape.`}
              </p>
            </div>
          </Card>

          {nudge && (
            <NudgeCard
              nudge={nudge}
              petName={petName}
              onDismiss={() => {
                dismissNudgeById(nudge.id);
                setNudge(undefined);
              }}
              onSnooze={() => setNudge(undefined)}
            />
          )}

          <QuickLog members={state.members} loggedBy={loggedBy} setLoggedBy={setLoggedBy} onWalk={() => openWalk()} onLog={quickLog} />

          <CheckInCard
            current={todaysCheckIn?.mood}
            onPick={(mood) => {
              addCheckIn(mood);
              toast("Thanks for checking in. That's enough for today.", "success");
            }}
          />

          {state.prefs.weatherEnabled && <WeatherCard />}

          {state.pets.length > 1 && <HouseholdToday />}

          <button className="btn btn-ghost w-full py-3 text-sm" onClick={() => navigate("care")}>
            <Icon name="shield" size={16} /> Care & reminders
          </button>
        </div>
      </div>
    </div>
  );
}

function todayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function HouseholdToday() {
  const { state, setActivePet } = useApp();
  const now = useMemo(() => new Date(), []);
  return (
    <Card className="p-5">
      <div className="mb-3">
        <h2 className="text-lg">The whole household</h2>
        <p className="text-xs text-faint mt-0.5">A combined look at everyone's day.</p>
      </div>
      <ul className="space-y-2.5">
        {state.pets.map((p) => {
          const sched = buildDaySchedule(state.routine, state.logs, now, p.id, now);
          const done = sched.filter((s) => s.state === "done").length;
          return (
            <li key={p.id}>
              <button
                className="flex w-full items-center gap-3 rounded-2xl p-2 hover:bg-cream transition-colors text-left"
                onClick={() => setActivePet(p.id)}
              >
                <AvatarBlob name={p.name} hue={p.hue} photo={p.photo} size={38} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{p.name}</span>
                  <span className="block text-xs text-faint">
                    {sched.length ? `${done} of ${sched.length} moments` : "No moments scheduled"}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function NextMomentCard({
  item,
  onComplete,
  onOpenWalk,
}: {
  item: ScheduledMoment;
  onComplete: () => void;
  onOpenWalk: () => void;
}) {
  const isWalk = item.moment.kind === "walk";
  const due = item.countdownMs <= 0;
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6 border-clay/30" >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(189,111,75,0.18), transparent 70%)" }}
      />
      <div className="relative flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-clay-soft/60 text-clay-deep">
            <Icon name={KIND_ICON[item.moment.kind]} size={24} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-faint">
              <span className="num">{formatClock(item.moment.time)}</span>
              <span aria-hidden>·</span>
              <span>{forWhomLabel(item.moment.forWhom)}</span>
            </div>
            <h2 className="text-xl mt-0.5 truncate">{item.moment.label}</h2>
            <p className="text-sm text-mocha mt-0.5">
              {item.log
                ? "Done — and that's your own benefit too."
                : item.moment.benefit.charAt(0).toUpperCase() + item.moment.benefit.slice(1)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div aria-live="polite" className="text-right">
            <div className="num text-lg text-clay-deep">
              {item.log ? "done" : due ? "due now" : humanizeCountdown(item.countdownMs)}
            </div>
            <div className="text-[11px] text-faint">next moment</div>
          </div>
          {!item.log && (
            <button className="btn btn-primary px-5 py-3" onClick={isWalk ? onOpenWalk : onComplete}>
              {isWalk ? "Start walk" : "Mark done"} <Icon name="arrowRight" size={16} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function forWhomLabel(f: ScheduledMoment["moment"]["forWhom"]): string {
  return f === "both" ? "for you both" : f === "you" ? "for you" : "for them";
}

function SharedDay({
  schedule,
  onComplete,
  members,
}: {
  schedule: ScheduledMoment[];
  onComplete: (m: ScheduledMoment) => void;
  members: { id: string; name: string }[];
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl">Shared day</h2>
          <p className="text-sm text-mocha mt-0.5">One routine for the two of you.</p>
        </div>
        <Icon name="calendar" size={20} />
      </div>

      {schedule.length === 0 ? (
        <p className="text-sm text-mocha py-6 text-center">
          No moments scheduled today. Add some in Routine.
        </p>
      ) : (
        <ol className="relative">
          <div className="absolute left-[23px] top-3 bottom-3 w-px bg-line" aria-hidden />
          {schedule.map((s, i) => {
            const who = s.log?.byMemberId ? members.find((m) => m.id === s.log!.byMemberId)?.name : undefined;
            return (
              <li key={s.moment.id} className="relative flex gap-4 py-3" style={{ animation: `fade-up 0.4s ease ${i * 0.04}s both` }}>
                <div className="relative z-10">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl border ${
                      s.state === "done"
                        ? "bg-sage-soft text-sage border-transparent"
                        : s.state === "due"
                          ? "bg-clay-soft/60 text-clay-deep border-transparent"
                          : "bg-card text-mocha border-line"
                    }`}
                  >
                    {s.state === "done" ? <DrawCheck size={20} /> : <Icon name={KIND_ICON[s.moment.kind]} size={22} />}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className={`text-base ${s.state === "done" ? "text-mocha" : ""}`}>{s.moment.label}</h3>
                    <span className="num text-sm text-faint shrink-0">{formatClock(s.moment.time)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StateBadge state={s.state} />
                    <span className="text-xs text-faint">{forWhomLabel(s.moment.forWhom)}</span>
                    {who && <span className="text-xs text-sage">Done by {who}</span>}
                  </div>
                  <p className="mt-1.5 text-sm text-mocha">
                    <span className="text-clay-deep">Your side:</span> {s.moment.benefit}
                  </p>
                  {s.state === "due" && !s.log && (
                    <p className="mt-1 text-xs text-clay-deep" aria-live="polite">
                      {humanizeCountdown(s.countdownMs)}
                    </p>
                  )}
                  {s.state !== "done" && (
                    <button className="btn btn-ghost mt-2 px-3 py-1.5 text-xs" onClick={() => onComplete(s)}>
                      <Icon name="check" size={14} /> Mark done
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function NudgeCard({
  nudge,
  petName,
  onDismiss,
  onSnooze,
}: {
  nudge: Nudge;
  petName: string;
  onDismiss: () => void;
  onSnooze: () => void;
}) {
  const tone = {
    daylight: "bg-butter-soft/70 text-[#8a6a1d]",
    movement: "bg-sage-soft text-sage",
    break: "bg-cream text-mocha",
    evening: "bg-lavender-soft text-[#6b5c93]",
    care: "bg-clay-soft/60 text-clay-deep",
  }[nudge.tone];
  const icon = nudge.tone === "movement" ? "stretch" : nudge.tone === "evening" ? "quiet" : nudge.tone === "care" ? "shield" : "sun";
  return (
    <Card className="p-5" >
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}>
          <Icon name={icon} size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed">{nudge.text}</p>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-quiet px-3 py-1.5 text-xs" onClick={onSnooze}>
              Snooze
            </button>
            <button className="btn btn-ghost px-3 py-1.5 text-xs" onClick={onDismiss}>
              Dismiss
            </button>
          </div>
          <p className="mt-2 text-[11px] text-faint">At most two nudges a day. {petName} is never used to rush you.</p>
        </div>
      </div>
    </Card>
  );
}

function QuickLog({
  members,
  loggedBy,
  setLoggedBy,
  onWalk,
  onLog,
}: {
  members: { id: string; name: string; role: string }[];
  loggedBy: string;
  setLoggedBy: (id: string) => void;
  onWalk: () => void;
  onLog: (kind: "meal" | "play" | "outdoor") => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg">Quick log</h2>
        <span className="text-xs text-faint">One tap</span>
      </div>
      {members.length > 1 && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-faint">Who's doing it?</span>
          {members.map((m) => (
            <button key={m.id} className="chip text-xs" aria-pressed={loggedBy === m.id} onClick={() => setLoggedBy(m.id)}>
              {m.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <button className="btn btn-primary col-span-2 py-3.5" onClick={onWalk}>
          <Icon name="walk" size={18} /> Walk
        </button>
        <button className="btn btn-quiet py-3" onClick={() => onLog("meal")}>
          <Icon name="meal" size={17} /> Fed
        </button>
        <button className="btn btn-quiet py-3" onClick={() => onLog("play")}>
          <Icon name="play" size={17} /> Played
        </button>
        <button className="btn btn-quiet col-span-2 py-3" onClick={() => onLog("outdoor")}>
          <Icon name="outdoor" size={17} /> Outside time
        </button>
      </div>
    </Card>
  );
}

function CheckInCard({ current, onPick }: { current?: CheckIn["mood"]; onPick: (m: CheckIn["mood"]) => void }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg">How are you feeling?</h2>
      <p className="text-sm text-mocha mt-0.5 mb-3">Ten seconds, once a day. It feeds your Insights.</p>
      <div className="flex gap-2">
        {MOODS.map((m) => (
          <button
            key={m.mood}
            aria-pressed={current === m.mood}
            aria-label={m.label}
            onClick={() => onPick(m.mood)}
            className={`flex-1 rounded-2xl border px-2 py-2.5 text-center transition-transform hover:-translate-y-0.5 ${
              current === m.mood ? "border-espresso bg-espresso text-oat" : "border-line bg-card"
            }`}
          >
            <span
              className="mx-auto mb-1 block h-4 w-4 rounded-full"
              style={{ background: `hsl(${m.hue} 52% 62%)` }}
            />
            <span className="text-[11px]">{m.label}</span>
          </button>
        ))}
      </div>
      {current && <p className="mt-3 text-xs text-faint">Logged for today. Change it any time.</p>}
    </Card>
  );
}