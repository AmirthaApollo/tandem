import { useMemo, useState } from "react";
import { Icon } from "../components/icons";
import { Card, EmptyState, Modal, SectionTitle } from "../components/ui";
import { useApp } from "../store/AppContext";
import { buildICS, downloadICS } from "../lib/ics";
import { dayKey, parseDayKey } from "../engine/connectionEngine";
import type { CareReminder, CareType } from "../engine/types";

const CARE_TYPES: { value: CareType; label: string }[] = [
  { value: "vaccination", label: "Vaccination" },
  { value: "flea", label: "Flea & tick" },
  { value: "vet", label: "Vet visit" },
  { value: "grooming", label: "Grooming" },
  { value: "other", label: "Other" },
];

function nextCareDate(c: CareReminder): Date {
  const base = parseDayKey(c.date);
  if (!c.repeatDays) return base;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (base >= today) return base;
  const days = Math.ceil((+today - +base) / 86400000);
  const periods = Math.ceil(days / c.repeatDays);
  const next = new Date(base);
  next.setDate(next.getDate() + periods * c.repeatDays);
  return next;
}

function daysUntil(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((+d - +today) / 86400000);
}

function dueLabel(d: Date): string {
  const n = daysUntil(d);
  if (n < 0) return `${Math.abs(n)} days ago`;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n < 14) return `in ${n} days`;
  return `in ${Math.round(n / 7)} weeks`;
}

export function Care() {
  const { state, pet, addCare, updateCare, removeCare, addVetNote, toggleVetNote, removeVetNote, updatePet, toast } = useApp();
  const petName = pet?.name ?? "your pet";

  const [reminderDraft, setReminderDraft] = useState<CareReminder | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState("");

  const sortedCare = useMemo(
    () => [...state.care].sort((a, b) => +nextCareDate(a) - +nextCareDate(b)),
    [state.care],
  );
  const upcoming = sortedCare.filter((c) => daysUntil(nextCareDate(c)) <= 14);

  function printHandoff() {
    const rows: [string, string][] = [
      ["Pet", `${petName}${pet?.species ? ` · ${pet.species}` : ""}${pet?.ageRange ? ` · ${pet.ageRange}` : ""}`],
      ["Feeding", pet?.food ? `${pet.food.brand} — ${pet.food.amount}` : "Not set"],
      ["Walk routine", state.routine.filter((r) => r.kind === "walk").map((r) => `${r.time} ${r.label}`).join(", ") || "Not set"],
      ["Meals", state.routine.filter((r) => r.kind === "meal").map((r) => `${r.time} ${r.label}`).join(", ") || "Not set"],
      ["Quirks", pet?.quirks || "—"],
      ["Vet", pet?.vet?.name ? `${pet.vet.name}${pet.vet.phone ? ` · ${pet.vet.phone}` : ""}` : "Not set"],
      ["Emergency contact", state.members.map((m) => m.name).join(", ") || "Not set"],
      ["Today's check-ins", state.routine.map((r) => `${r.time} ${r.label}`).join(", ")],
    ];
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tandem pet-sitter card — ${petName}</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#2c2621;padding:40px;max-width:680px;margin:auto}
        h1{font-family:Georgia,serif;font-weight:500;font-size:28px;margin:0 0 4px}
        .sub{color:#6b6259;margin-bottom:24px}
        table{width:100%;border-collapse:collapse}
        td{padding:12px 0;border-bottom:1px solid #e6ded3;vertical-align:top}
        td:first-child{width:180px;color:#6b6259;font-size:13px;text-transform:uppercase;letter-spacing:.08em}
        .foot{margin-top:28px;font-size:12px;color:#9a9188}
      </style></head><body>
      <h1>${petName}'s pet-sitter card</h1>
      <div class="sub">From Tandem — ${new Date().toLocaleDateString()}</div>
      <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>
      <p class="foot">Tandem offers general pet-routine guidance only and is not veterinary advice. For anything medical, contact the vet above.</p>
    </body></html>`;
    const w = window.open("", "_blank", "width=760,height=900");
    if (!w) {
      toast("Your browser blocked the print window. Try allowing pop-ups.", "care");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Care</h1>
          <p className="text-mocha mt-1">The practical side, kept calm.</p>
        </div>
        <button
          className="btn btn-ghost px-4 py-2.5 text-sm"
          onClick={() => downloadICS("tandem-care.ics", buildICS(state.routine, state.care))}
        >
          <Icon name="calendar" size={16} /> Export .ics
        </button>
      </header>

      <Card className="p-5 sm:p-6">
        <SectionTitle
          hint="Tandem only reminds. It never advises on what to give or when it's medically needed."
          action={
            <button
              className="btn btn-primary px-4 py-2 text-sm"
              onClick={() =>
                setReminderDraft({ id: "", title: "", type: "vet", date: dayKey(new Date()), petId: state.activePetId })
              }
            >
              <Icon name="plus" size={15} /> Add
            </button>
          }
        >
          Reminders
        </SectionTitle>

        {sortedCare.length === 0 ? (
          <EmptyState title="Nothing on the calendar" body="Add vaccinations, flea treatments, vet visits or grooming. Tandem will keep them gently in view." icon="shield" />
        ) : (
          <ul className="divide-y divide-[color:var(--color-line)]">
            {sortedCare.map((c) => {
              const next = nextCareDate(c);
              const soon = daysUntil(next) <= 7;
              return (
                <li key={c.id} className="py-3.5 flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${soon ? "bg-clay-soft/60 text-clay-deep" : "bg-cream text-clay"}`}>
                    <Icon name={c.type === "vaccination" ? "shield" : c.type === "grooming" ? "sparkle" : c.type === "vet" ? "heart" : "drop"} size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base">{c.title}</h3>
                    <p className="text-xs text-mocha">
                      {CARE_TYPES.find((t) => t.value === c.type)?.label}
                      {c.repeatDays ? ` · every ${c.repeatDays} days` : ""}
                      {c.notes ? ` · ${c.notes}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm ${soon ? "text-clay-deep font-medium" : "text-mocha"}`}>{dueLabel(next)}</div>
                    <div className="text-[11px] text-faint num">{next.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>
                  </div>
                  <button className="btn h-9 w-9 rounded-full text-faint hover:text-clay" aria-label={`Edit ${c.title}`} onClick={() => setReminderDraft(c)}>
                    <Icon name="edit" size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {upcoming.length > 0 && (
          <p className="mt-4 text-xs text-clay-deep">
            {upcoming.length} thing{upcoming.length === 1 ? "" : "s"} coming up in the next two weeks.
          </p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Card className="p-5 sm:p-6">
          <SectionTitle hint="User-entered, for your own reference.">Pet profile & quick facts</SectionTitle>
          <label className="block mb-4">
            <span className="text-sm font-medium">Food brand & amounts</span>
            <input
              className="field mt-1.5"
              value={pet?.food ? `${pet.food.brand} — ${pet.food.amount}` : ""}
              placeholder="Brand — 1 cup, twice daily"
              onChange={(e) => {
                const [brand, amount] = e.target.value.split("—").map((s) => s.trim());
                updatePet(state.activePetId, { food: { brand: brand ?? "", amount: amount ?? "" } });
              }}
            />
          </label>
          <label className="block mb-4">
            <span className="text-sm font-medium">Quirks</span>
            <textarea
              className="field mt-1.5 min-h-[70px]"
              value={pet?.quirks ?? ""}
              placeholder="Carries a ball on every walk…"
              onChange={(e) => updatePet(state.activePetId, { quirks: e.target.value })}
            />
          </label>
          <div>
            <span className="text-sm font-medium">Weight log (optional)</span>
            <div className="flex gap-2 mt-1.5">
              <input
                className="field"
                inputMode="decimal"
                value={weightDraft}
                onChange={(e) => setWeightDraft(e.target.value)}
                placeholder="kg"
                aria-label="New weight in kilograms"
              />
              <button
                className="btn btn-quiet px-4"
                onClick={() => {
                  const kg = Number(weightDraft);
                  if (!kg) return;
                  updatePet(state.activePetId, {
                    weightLog: [...(pet?.weightLog ?? []), { date: dayKey(new Date()), kg }],
                  });
                  setWeightDraft("");
                  toast("Weight noted. Purely for your records.", "success");
                }}
              >
                Add
              </button>
            </div>
            {pet?.weightLog && pet.weightLog.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {[...pet.weightLog].reverse().slice(0, 5).map((w) => (
                  <li key={w.date + w.kg} className="flex justify-between text-sm text-mocha">
                    <span>{parseDayKey(w.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                    <span className="num">{w.kg} kg</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <SectionTitle hint="Jot questions before a vet visit — nothing is sent anywhere.">Vet notes</SectionTitle>
            <div className="flex gap-2">
              <input
                className="field"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && noteDraft.trim()) {
                    addVetNote(noteDraft.trim());
                    setNoteDraft("");
                  }
                }}
                placeholder="Ask about the occasional limp…"
                aria-label="New vet question"
              />
              <button
                className="btn btn-quiet px-4"
                onClick={() => {
                  if (!noteDraft.trim()) return;
                  addVetNote(noteDraft.trim());
                  setNoteDraft("");
                }}
              >
                Add
              </button>
            </div>
            {state.vetNotes.length > 0 && (
              <ul className="mt-3 space-y-1">
                {state.vetNotes.map((n) => (
                  <li key={n.id} className="flex items-center gap-3 py-2 border-b hairline last:border-0">
                    <button
                      className={`grid h-6 w-6 place-items-center rounded-full border ${n.done ? "bg-sage text-white border-transparent" : "border-line"}`}
                      aria-pressed={n.done}
                      aria-label={n.done ? "Mark as not asked" : "Mark as asked"}
                      onClick={() => toggleVetNote(n.id)}
                    >
                      {n.done && <Icon name="check" size={13} />}
                    </button>
                    <span className={`text-sm flex-1 ${n.done ? "line-through text-faint" : ""}`}>{n.text}</span>
                    <button className="text-faint hover:text-clay" onClick={() => removeVetNote(n.id)} aria-label="Delete note">
                      <Icon name="trash" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle hint="A printable card built from what you've stored.">Pet-sitter handoff</SectionTitle>
            <p className="text-sm text-mocha mb-4">
              Feeding amounts and times, the walk routine, quirks, vet and emergency contacts — one clean sheet.
            </p>
            <button className="btn btn-quiet px-4 py-2.5 text-sm" onClick={() => setHandoffOpen(true)}>
              <Icon name="eye" size={16} /> Preview handoff sheet
            </button>
          </Card>
        </div>
      </div>

      {reminderDraft && (
        <ReminderEditor
          reminder={reminderDraft}
          isNew={!reminderDraft.id}
          onClose={() => setReminderDraft(null)}
          onSave={(r) => {
            if (r.id && state.care.some((c) => c.id === r.id)) updateCare(r.id, r);
            else addCare(r);
            setReminderDraft(null);
            toast("Reminder saved.", "success");
          }}
          onDelete={
            reminderDraft.id
              ? () => {
                  removeCare(reminderDraft.id);
                  setReminderDraft(null);
                  toast("Reminder removed.", "info");
                }
              : undefined
          }
        />
      )}

      <Modal
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        title={`${petName}'s pet-sitter card`}
        wide
        footer={
          <button className="btn btn-primary w-full py-3" onClick={printHandoff}>
            <Icon name="download" size={16} /> Print / save as PDF
          </button>
        }
      >
        <div className="rounded-2xl border hairline p-5 bg-oat">
          <h3 className="text-2xl">{petName}'s pet-sitter card</h3>
          <p className="text-sm text-mocha mb-4">From Tandem · {new Date().toLocaleDateString()}</p>
          <dl className="divide-y divide-[color:var(--color-line)]">
            <HandoffRow k="Feeding" v={pet?.food ? `${pet.food.brand} — ${pet.food.amount}` : "Not set"} />
            <HandoffRow k="Walk routine" v={state.routine.filter((r) => r.kind === "walk").map((r) => `${r.time} ${r.label}`).join(" · ") || "Not set"} />
            <HandoffRow k="Meals" v={state.routine.filter((r) => r.kind === "meal").map((r) => `${r.time} ${r.label}`).join(" · ") || "Not set"} />
            <HandoffRow k="Quirks" v={pet?.quirks || "—"} />
            <HandoffRow k="Vet" v={pet?.vet?.name ? `${pet.vet.name}${pet.vet.phone ? ` · ${pet.vet.phone}` : ""}` : "Not set"} />
            <HandoffRow k="Emergency contact" v={state.members.map((m) => m.name).join(", ") || "Not set"} />
          </dl>
          <p className="mt-5 text-[11px] text-faint">
            Tandem offers general pet-routine guidance only and is not veterinary advice.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function HandoffRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="py-3 grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-xs uppercase tracking-widest text-faint">{k}</dt>
      <dd className="text-sm">{v}</dd>
    </div>
  );
}

function ReminderEditor({
  reminder,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  reminder: CareReminder;
  isNew: boolean;
  onClose: () => void;
  onSave: (r: CareReminder) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<CareReminder>(reminder);
  const set = (patch: Partial<CareReminder>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Add a reminder" : "Edit reminder"}
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
          <button className="btn btn-primary flex-1 py-3" onClick={() => onSave(draft)} disabled={!draft.title.trim()}>
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-medium">What's it for?</span>
          <input className="field mt-1.5" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Flea & tick treatment" autoFocus />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Type</span>
            <select className="field mt-1.5" value={draft.type} onChange={(e) => set({ type: e.target.value as CareType })}>
              {CARE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Date</span>
            <input type="date" className="field mt-1.5 num" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Repeat every (days, optional)</span>
          <input
            type="number"
            min={0}
            className="field mt-1.5"
            value={draft.repeatDays ?? ""}
            placeholder="e.g. 30"
            onChange={(e) => set({ repeatDays: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Notes (optional)</span>
          <input className="field mt-1.5" value={draft.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
        </label>
        <p className="text-xs text-faint">Tandem only reminds. It never advises on medication, dosage or whether something is medically needed.</p>
      </div>
    </Modal>
  );
}