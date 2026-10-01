import { useMemo, useState } from "react";
import { Icon, KIND_ICON } from "../components/icons";
import { Card, EmptyState, Modal, SectionTitle } from "../components/ui";
import { useApp, uid } from "../store/AppContext";
import { useNav } from "../nav";
import { buildRoutine } from "../data/demoData";
import { buildICS, downloadICS } from "../lib/ics";
import type { MomentKind, RoutineMoment } from "../engine/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const KINDS: MomentKind[] = ["walk", "meal", "play", "outdoor", "quiet", "break", "winddown"];
const KIND_LABEL: Record<MomentKind, string> = {
  walk: "Walk",
  meal: "Meal",
  play: "Play",
  outdoor: "Outdoor",
  quiet: "Quiet",
  break: "Break",
  winddown: "Wind-down",
};

const blank = (petId: string): RoutineMoment => ({
  id: uid("moment"),
  kind: "walk",
  label: "New moment",
  time: "16:00",
  days: [1, 2, 3, 4, 5],
  reminder: false,
  forWhom: "both",
  benefit: "a moment for you too",
  petId,
});

export function Routine() {
  const { state, pet, updateMoment, addMoment, removeMoment, setRoutine, toast } = useApp();
  const { openWalk } = useNav();
  const [day, setDay] = useState(new Date().getDay());
  const [editing, setEditing] = useState<RoutineMoment | null>(null);
  const [showAll, setShowAll] = useState(false);

  const petId = pet?.id ?? state.activePetId;
  const todays = useMemo(
    () =>
      state.routine
        .filter((m) => (m.petId === "all" || m.petId === petId) && m.days.includes(day))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [state.routine, day, petId],
  );

  const visible = showAll ? todays : todays.slice(0, 5);
  const hasMore = todays.length > 5;

  function applyTemplate(species: string) {
    const moments = buildRoutine(petId, species, { walks: "2", meals: "2", play: "some" });
    setRoutine(moments);
    toast(`Applied the ${species} template for ${pet?.name ?? "your pet"}.`, "success");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Routine</h1>
          <p className="text-mocha mt-1">One shared rhythm. Adjust it until it fits.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost px-4 py-2.5 text-sm" onClick={() => downloadICS("tandem-routine.ics", buildICS(state.routine, state.care))}>
            <Icon name="calendar" size={16} /> Export .ics
          </button>
          <button className="btn btn-primary px-4 py-2.5 text-sm" onClick={() => setEditing(blank(petId))}>
            <Icon name="plus" size={16} /> Add moment
          </button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Day of week">
        {DAYS.map((d, i) => (
          <button
            key={d}
            role="tab"
            aria-selected={day === i}
            className={`chip shrink-0 ${day === i ? "active" : ""}`}
            onClick={() => setDay(i)}
          >
            {d}
          </button>
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <SectionTitle hint={`${todays.length} moment${todays.length === 1 ? "" : "s"} on ${DAYS[day]}`}>
          {DAYS[day]}'s shared day
        </SectionTitle>

        {todays.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            body={`No moments for ${DAYS[day]} yet. Add one, or apply a species template.`}
            icon="calendar"
            action={
              <button className="btn btn-quiet px-4 py-2 text-sm" onClick={() => setEditing(blank(petId))}>
                <Icon name="plus" size={15} /> Add moment
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-[color:var(--color-line)]">
            {visible.map((m) => (
              <li key={m.id} className="py-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-clay">
                    <Icon name={KIND_ICON[m.kind]} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        className="bg-transparent font-medium border-0 border-b border-transparent hover:border-line focus:border-clay focus:outline-none px-0.5 py-0.5 min-w-0 flex-1"
                        value={m.label}
                        aria-label="Moment label"
                        onChange={(e) => updateMoment(m.id, { label: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-mocha mt-0.5">
                      {KIND_LABEL[m.kind]} · {m.forWhom === "both" ? "together" : m.forWhom === "you" ? "for you" : "for them"} · {m.benefit}
                    </p>
                  </div>
                  <input
                    type="time"
                    value={m.time}
                    aria-label={`Time for ${m.label}`}
                    className="num field !w-auto px-2 py-1.5 text-sm"
                    onChange={(e) => updateMoment(m.id, { time: e.target.value })}
                  />
                  <button
                    className={`btn h-9 w-9 rounded-full ${m.reminder ? "bg-clay-soft/60 text-clay-deep" : "bg-cream text-faint"}`}
                    aria-pressed={m.reminder}
                    aria-label={`${m.reminder ? "Disable" : "Enable"} reminder for ${m.label}`}
                    onClick={() => updateMoment(m.id, { reminder: !m.reminder })}
                  >
                    <Icon name={m.reminder ? "bell" : "bellOff"} size={16} />
                  </button>
                  <button className="btn h-9 w-9 rounded-full text-faint hover:text-clay" aria-label={`Edit ${m.label}`} onClick={() => setEditing(m)}>
                    <Icon name="edit" size={16} />
                  </button>
                </div>
                {m.kind === "walk" && (
                  <button className="ml-13 mt-2 text-xs text-clay-deep hover:underline" onClick={() => openWalk()}>
                    Start walk now
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {hasMore && !showAll && (
          <button className="btn btn-ghost mt-3 w-full py-2.5 text-sm" onClick={() => setShowAll(true)}>
            Show {todays.length - 5} more
          </button>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle hint="Start from a shape that already fits a species.">Templates</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-quiet px-4 py-2.5 text-sm" onClick={() => applyTemplate("dog")}>
            <Icon name="walk" size={16} /> Dog day
          </button>
          <button className="btn btn-quiet px-4 py-2.5 text-sm" onClick={() => applyTemplate("cat")}>
            <Icon name="quiet" size={16} /> Cat day
          </button>
          <button className="btn btn-quiet px-4 py-2.5 text-sm" onClick={() => applyTemplate("small")}>
            <Icon name="leaf" size={16} /> Small pet day
          </button>
        </div>
        <p className="text-xs text-faint mt-3">
          Applying a template replaces the current routine. Reminders appear as in-app toasts while Tandem is open.
        </p>
      </Card>

      {editing && (
        <MomentEditor
          moment={editing}
          isNew={!state.routine.some((m) => m.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(m) => {
            if (state.routine.some((x) => x.id === m.id)) updateMoment(m.id, m);
            else addMoment(m);
            setEditing(null);
            toast("Routine updated.", "success");
          }}
          onDelete={
            state.routine.some((m) => m.id === editing.id)
              ? () => {
                  removeMoment(editing.id);
                  setEditing(null);
                  toast("Moment removed.", "info");
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function MomentEditor({
  moment,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  moment: RoutineMoment;
  isNew: boolean;
  onClose: () => void;
  onSave: (m: RoutineMoment) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<RoutineMoment>(moment);
  const set = (patch: Partial<RoutineMoment>) => setDraft((d) => ({ ...d, ...patch }));
  const everyDay = draft.days.length === 7;

  function toggleDay(d: number) {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.includes(d) ? prev.days.filter((x) => x !== d) : [...prev.days, d].sort((a, b) => a - b),
    }));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Add a moment" : "Edit moment"}
      footer={
        <div className="flex gap-3">
          {onDelete && (
            <button className="btn btn-ghost px-4 py-3 text-clay-deep" onClick={onDelete}>
              <Icon name="trash" size={16} /> Remove
            </button>
          )}
          <button className="btn btn-ghost flex-1 py-3" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary flex-1 py-3" onClick={() => onSave(draft)} disabled={draft.days.length === 0}>
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Label</span>
          <input className="field mt-1.5" value={draft.label} onChange={(e) => set({ label: e.target.value })} />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Time</span>
            <input type="time" className="field mt-1.5 num" value={draft.time} onChange={(e) => set({ time: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Kind</span>
            <select className="field mt-1.5" value={draft.kind} onChange={(e) => set({ kind: e.target.value as MomentKind })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="text-sm font-medium">Who it's for</span>
          <div className="mt-2 flex gap-2">
            {(["pet", "you", "both"] as const).map((f) => (
              <button key={f} className="chip" aria-pressed={draft.forWhom === f} onClick={() => set({ forWhom: f })}>
                {f === "pet" ? "For them" : f === "you" ? "For you" : "Together"}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Your side of it</span>
          <input
            className="field mt-1.5"
            value={draft.benefit}
            placeholder="your daylight for the day"
            onChange={(e) => set({ benefit: e.target.value })}
          />
        </label>

        <div>
          <span className="text-sm font-medium">Days</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="chip" aria-pressed={everyDay} onClick={() => set({ days: [0, 1, 2, 3, 4, 5, 6] })}>
              Every day
            </button>
            <button
              className="chip"
              aria-pressed={!everyDay && draft.days.join() === "1,2,3,4,5"}
              onClick={() => set({ days: [1, 2, 3, 4, 5] })}
            >
              Weekdays
            </button>
            {DAYS.map((d, i) => (
              <button key={d} className="chip" aria-pressed={draft.days.includes(i)} onClick={() => toggleDay(i)}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={draft.reminder} onChange={(e) => set({ reminder: e.target.checked })} className="h-4 w-4 accent-[color:var(--color-clay)]" />
          <span className="text-sm">Gentle reminder while the app is open</span>
        </label>
      </div>
    </Modal>
  );
}