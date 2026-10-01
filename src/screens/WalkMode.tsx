import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/icons";
import { AvatarBlob, Card } from "../components/ui";
import { useApp } from "../store/AppContext";

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function WalkMode({ manual, onClose }: { manual: boolean; onClose: () => void }) {
  const { pet, logActivity, toast, state } = useApp();
  const [mode, setMode] = useState<"session" | "summary" | "manual">(manual ? "manual" : "session");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(!manual);
  const [business, setBusiness] = useState(false);
  const [long, setLong] = useState(false);
  const [paused, setPaused] = useState(false);
  const finished = useRef(false);

  const [manualWhen, setManualWhen] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 30);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [manualMins, setManualMins] = useState(20);

  useEffect(() => {
    if (mode !== "session" || !running) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [mode, running]);

  const petName = pet?.name ?? "your pet";
  const minutes = Math.max(1, Math.round(seconds / 60));

  function finish() {
    if (finished.current) return;
    finished.current = true;
    logActivity("walk", { durationMin: minutes, business, long });
    setRunning(false);
    setMode("summary");
  }

  function saveManual() {
    const when = new Date(manualWhen);
    logActivity("walk", {
      ts: when.toISOString(),
      durationMin: manualMins,
      business,
      long,
      manual: true,
    });
    toast("Past walk logged. Nice retroactively.", "success");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-espresso text-oat" role="dialog" aria-modal="true" aria-label="Walk mode">
      <div className="flex items-center justify-between px-5 sm:px-8 py-5">
        <span className="text-sm text-oat/60">{mode === "manual" ? "Log a past walk" : "Walk mode"}</span>
        <button className="btn text-oat/80 hover:text-oat px-3 py-2" onClick={onClose} aria-label="Close walk mode">
          <Icon name="close" size={20} />
        </button>
      </div>

      {mode === "session" && (
        <div className="flex-1 grid place-items-center px-6">
          <div className="text-center max-w-sm">
            <div className="relative mx-auto mb-8 grid place-items-center" style={{ width: 260, height: 260 }}>
              <span
                className="absolute inset-0 rounded-full animate-[pulse-ring_3.2s_ease-in-out_infinite]"
                style={{ background: "radial-gradient(circle, rgba(217,180,85,0.18), transparent 68%)" }}
              />
              <svg width={260} height={260} viewBox="0 0 260 260" className="-rotate-90">
                <circle cx="130" cy="130" r="112" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="8" />
                <circle
                  cx="130"
                  cy="130"
                  r="112"
                  fill="none"
                  stroke="var(--color-butter)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 112}
                  strokeDashoffset={2 * Math.PI * 112 * (1 - (seconds % 60) / 60)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div>
                  <div className="num text-5xl sm:text-6xl text-oat">{formatDuration(seconds)}</div>
                  <div className="text-xs text-oat/50 mt-2" aria-live="polite">
                    {paused ? "paused" : running ? `walking with ${petName}` : "ready"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              <button
                className="btn px-6 py-3 bg-oat/10 text-oat hover:bg-oat/20"
                onClick={() => {
                  setRunning((r) => !r);
                  setPaused(true);
                }}
              >
                <Icon name="pause" size={18} /> {running ? "Pause" : "Resume"}
              </button>
              <button className="btn px-6 py-3 bg-butter text-espresso hover:brightness-105" onClick={finish}>
                <Icon name="stop" size={18} /> Finish
              </button>
            </div>

            <div className="flex justify-center gap-3">
              <button className="chip !bg-oat/10 !border-oat/20 !text-oat" aria-pressed={business} onClick={() => setBusiness((v) => !v)}>
                {business && <Icon name="check" size={14} />} Did their business
              </button>
              <button className="chip !bg-oat/10 !border-oat/20 !text-oat" aria-pressed={long} onClick={() => setLong((v) => !v)}>
                {long && <Icon name="check" size={14} />} Long one
              </button>
            </div>
            <p className="mt-6 text-xs text-oat/40">No GPS. Just the two of you and a timer.</p>
          </div>
        </div>
      )}

      {mode === "summary" && (
        <div className="flex-1 grid place-items-center px-6 py-8 overflow-y-auto">
          <div className="w-full max-w-md text-center" style={{ animation: "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
            <AvatarBlob name={petName} hue={pet?.hue ?? 24} photo={pet?.photo} size={84} wag className="mx-auto" />
            <h2 className="text-3xl mt-5 text-oat">A {minutes}-minute walk.</h2>
            <p className="text-oat/70 mt-3">
              That's your outside time for today — {minutes} minutes of daylight and movement you wouldn't otherwise have had.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="Duration" value={`${minutes}m`} />
              <Stat label="Daylight" value={`+${minutes}m`} />
              <Stat label="Business" value={business ? "Yes" : "—"} />
            </div>
            <div className="mt-8 flex flex-col gap-2">
              <button className="btn bg-oat text-espresso px-6 py-3.5 hover:bg-white" onClick={onClose}>
                Done
              </button>
              <button className="btn text-oat/70 px-6 py-2 text-sm hover:text-oat" onClick={() => setMode("manual")}>
                Log another (past walk)
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="flex-1 grid place-items-center px-6 py-8 overflow-y-auto">
          <Card className="w-full max-w-md p-6 bg-card text-espresso">
            <h2 className="text-2xl">Log a past walk</h2>
            <p className="text-sm text-mocha mt-1 mb-5">Missed tapping start? No problem.</p>
            <label className="block mb-4">
              <span className="text-sm font-medium">When</span>
              <input
                type="datetime-local"
                className="field mt-1.5"
                value={manualWhen}
                onChange={(e) => setManualWhen(e.target.value)}
              />
            </label>
            <label className="block mb-4">
              <span className="text-sm font-medium">Duration (minutes)</span>
              <input
                type="number"
                min={1}
                max={240}
                className="field mt-1.5"
                value={manualMins}
                onChange={(e) => setManualMins(Math.max(1, Number(e.target.value)))}
              />
            </label>
            <div className="flex gap-2 mb-6">
              <button className="chip" aria-pressed={business} onClick={() => setBusiness((v) => !v)}>
                {business && <Icon name="check" size={14} />} Did their business
              </button>
              <button className="chip" aria-pressed={long} onClick={() => setLong((v) => !v)}>
                {long && <Icon name="check" size={14} />} Long one
              </button>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1 py-3" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary flex-1 py-3" onClick={saveManual}>
                Save walk
              </button>
            </div>
            {!manual && (
              <button className="mt-3 text-xs text-faint hover:text-espresso" onClick={() => setMode("session")}>
                Back to live timer
              </button>
            )}
          </Card>
        </div>
      )}

      <div className="px-6 py-4 text-center text-[11px] text-oat/40">
        {state.members[0]?.name ? `Logged for ${petName}` : `For ${petName}`} · general routine guidance only
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-oat/10 px-3 py-3">
      <div className="num text-lg text-oat">{value}</div>
      <div className="text-[11px] text-oat/50">{label}</div>
    </div>
  );
}