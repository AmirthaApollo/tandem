import { useMemo } from "react";
import { Icon } from "../components/icons";
import { Card, EmptyState, ProgressRing, SectionTitle } from "../components/ui";
import { useApp, uid } from "../store/AppContext";
import {
  buildWeekStats,
  computeMilestones,
  computeObservations,
  pickExperiment,
  type DayStat,
} from "../engine/connectionEngine";

export function Insights() {
  const { state, pet, setExperiment, joinExperimentDay, toast, markMilestoneSeen } = useApp();
  const now = useMemo(() => new Date(), []);
  const petName = pet?.name ?? "your pet";
  const stats = useMemo(
    () => buildWeekStats(state.logs, state.checkIns, state.routine, state.activePetId, now),
    [state.logs, state.checkIns, state.routine, state.activePetId, now],
  );
  const observations = useMemo(() => computeObservations(stats, petName), [stats, petName]);
  const loggedDays = stats.filter((s) => s.walks + s.meals + s.plays > 0).length;
  const sparse = loggedDays < 4;

  const activeExperiment = state.experiments.find((e) => e.active);
  const generated = useMemo(
    () => pickExperiment(stats, petName, state.experiments),
    [stats, petName, state.experiments],
  );
  const experiment = activeExperiment ?? generated;

  const milestones = useMemo(() => computeMilestones(state, now), [state, now]);
  const newMilestone = milestones.find((m) => !state.milestonesSeen.includes(m));

  const totalOutdoor = stats.reduce((a, s) => a + s.outdoorMin, 0);
  const weekWalks = stats.reduce((a, s) => a + s.walks, 0);
  const moods = stats.filter((s) => s.mood !== undefined).map((s) => s.mood!);
  const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl">Insights</h1>
        <p className="text-mocha mt-1">The last 7 days, quietly. Nothing here is clinical — just patterns worth noticing.</p>
      </header>

      {newMilestone && (
        <Card className="p-5 flex items-center gap-4 border-butter/40">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-butter-soft text-[#8a6a1d]">
            <Icon name="sparkle" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-sm">{newMilestone}</p>
          </div>
          <button className="btn btn-ghost px-3 py-1.5 text-xs" onClick={() => markMilestoneSeen(newMilestone)}>
            Lovely
          </button>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Card className="p-5 sm:p-6">
          <SectionTitle hint="One chart, two lines of your week.">Outdoor time & mood</SectionTitle>
          <WeekChart stats={stats} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Metric label="Walks" value={String(weekWalks)} />
            <Metric label="Outside" value={`${totalOutdoor}m`} />
            <Metric label="Avg mood" value={moods.length ? avgMood.toFixed(1) : "—"} sub="your check-ins" />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionTitle hint="Not a score — a shape of the week.">Pet routine consistency</SectionTitle>
          <div className="flex justify-between gap-1.5">
            {stats.map((s) => {
              const ratio = s.routineMoments ? s.doneMoments / s.routineMoments : 0;
              const d = new Date(s.date);
              const label = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
              return (
                <div key={s.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="h-24 w-full rounded-2xl bg-cream overflow-hidden flex items-end">
                    <div
                      className="w-full rounded-2xl"
                      style={{ height: `${Math.max(6, ratio * 100)}%`, background: ratio >= 0.6 ? "var(--color-sage)" : ratio > 0 ? "var(--color-butter)" : "var(--color-clay-soft)" }}
                    />
                  </div>
                  <span className="text-[11px] text-faint">{label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-faint mt-3">
            {sparse
              ? `${loggedDays} day${loggedDays === 1 ? "" : "s"} logged so far. Keep going — patterns need a few days.`
              : `${stats.filter((s) => s.doneMoments / Math.max(1, s.routineMoments) >= 0.6).length} of 7 days felt steady.`}
          </p>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <SectionTitle hint="Plain language, modest claims.">What Tandem noticed</SectionTitle>
        <ul className="space-y-3">
          {observations.map((o) => (
            <li key={o.id} className="flex gap-3">
              <span className="mt-0.5 text-clay">
                <Icon name={o.kind === "mood" ? "heart" : o.kind === "consistency" ? "leaf" : o.kind === "outdoor" ? "sun" : "sparkle"} size={18} />
              </span>
              <p className="text-sm text-mocha">{o.text}</p>
            </li>
          ))}
        </ul>
        {!sparse && (
          <p className="mt-4 text-[11px] text-faint">
            These are gentle observations from your own logs and check-ins this week — not medical or veterinary advice.
          </p>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
          <ProgressRing
            value={Math.min(1, (experiment.joinedDates.length || 0) / experiment.days)}
            size={104}
            label={`${experiment.joinedDates.length} of ${experiment.days} days`}
          >
            <div className="text-center">
              <div className="num text-xl">{Math.min(experiment.joinedDates.length, experiment.days)}</div>
              <div className="text-[10px] text-faint">of {experiment.days}</div>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <SectionTitle hint="One small thing, a few days. No pressure.">{experiment.title}</SectionTitle>
            <p className="text-sm text-mocha">{experiment.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!activeExperiment ? (
                <button
                  className="btn btn-primary px-5 py-2.5 text-sm"
                  onClick={() => {
                    setExperiment({ ...generated, id: uid("exp") });
                    toast("Experiment started. Just notice how it feels.", "success");
                  }}
                >
                  Try it for {experiment.days} days
                </button>
              ) : experiment.joinedDates.length >= experiment.days ? (
                <div className="w-full">
                  <p className="text-sm text-sage">
                    You gave it {experiment.days} days. Check how your afternoons felt in this week's check-ins — that's the whole result.
                  </p>
                  <button
                    className="btn btn-ghost mt-2 px-4 py-2 text-xs"
                    onClick={() =>
                      setExperiment({
                        ...experiment,
                        active: false,
                        id: experiment.id,
                      })
                    }
                  >
                    Finish experiment
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-quiet px-5 py-2.5 text-sm"
                  onClick={() => {
                    joinExperimentDay();
                    toast("Marked for today. Nice.", "success");
                  }}
                >
                  <Icon name="check" size={16} /> I did it today
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {sparse && (
        <EmptyState
          title="A little more data, a little more insight"
          body="Log a few walks, meals and check-ins across the week and this page will start noticing the good stuff."
          icon="chart"
        />
      )}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-cream/70 px-3 py-3">
      <div className="num text-xl">{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
      {sub && <div className="text-[10px] text-faint/70">{sub}</div>}
    </div>
  );
}

function WeekChart({ stats }: { stats: DayStat[] }) {
  const w = 320;
  const h = 150;
  const pad = { l: 8, r: 8, t: 12, b: 24 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxOutdoor = Math.max(45, ...stats.map((s) => s.outdoorMin));
  const colW = innerW / 7;
  const barW = colW * 0.42;
  const moodY = (m: number) => pad.t + innerH - ((m - 1) / 4) * (innerH * 0.55) - innerH * 0.42;

  return (
    <div className="overflow-x-auto no-scrollbar">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[300px]" role="img" aria-label="Outdoor minutes as bars and mood as a line across the last seven days">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={pad.l} x2={w - pad.r} y1={pad.t + (innerH * i) / 4} y2={pad.t + (innerH * i) / 4} stroke="var(--color-line)" strokeWidth="1" />
        ))}
        {stats.map((s, i) => {
          const x = pad.l + i * colW;
          const bh = (s.outdoorMin / maxOutdoor) * innerH;
          return (
            <g key={s.date}>
              <rect x={x + colW / 2 - barW / 2} y={pad.t + innerH - bh} width={barW} height={Math.max(2, bh)} rx={5} fill="var(--color-sage-soft)" />
              <text x={x + colW / 2} y={h - 8} textAnchor="middle" fontSize="9" fill="var(--color-faint)">
                {["S", "M", "T", "W", "T", "F", "S"][new Date(s.date).getDay()]}
              </text>
            </g>
          );
        })}
        <polyline
          points={stats
            .map((s, i) => (s.mood ? `${pad.l + i * colW + colW / 2},${moodY(s.mood)}` : null))
            .filter(Boolean)
            .join(" ")}
          fill="none"
          stroke="var(--color-clay)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {stats.map((s, i) =>
          s.mood ? (
            <circle key={s.date} cx={pad.l + i * colW + colW / 2} cy={moodY(s.mood)} r="3.2" fill="var(--color-clay)" />
          ) : null,
        )}
      </svg>
      <div className="flex gap-4 text-[11px] text-faint mt-1 px-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-sage-soft" /> outdoor minutes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-clay" /> your check-in mood
        </span>
      </div>
    </div>
  );
}