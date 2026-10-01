import { useMemo, useRef, useState } from "react";
import { Icon } from "../components/icons";
import { AvatarBlob, Card, Modal, SectionTitle } from "../components/ui";
import { useApp, uid } from "../store/AppContext";
import { useNav } from "../nav";
import { compressImage } from "../store/storage";
import { buildWeekStats } from "../engine/connectionEngine";
import type { Pet, Species } from "../engine/types";

const SPECIES: { value: Species; label: string }[] = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "small", label: "Small pet" },
  { value: "other", label: "Other" },
];

function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (h + 12) % 360;
}

export function Profile() {
  const {
    state,
    pet,
    updateOwner,
    updatePet,
    setActivePet,
    addPet,
    addMember,
    removeMember,
    setPrefs,
    resetDemo,
    startFresh,
    exportJSON,
    setAwayUntil,
    toast,
  } = useApp();
  const { navigate, openWalk } = useNav();
  const [petModal, setPetModal] = useState(false);
  const [memberDraft, setMemberDraft] = useState("");

  const petName = pet?.name ?? "your pet";

  const streak = useMemo(() => {
    const days = buildWeekStats(state.logs, state.checkIns, state.routine, state.activePetId, new Date());
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].walks > 0 || days[i].plays > 0) s++;
      else break;
    }
    return s;
  }, [state.logs, state.checkIns, state.routine, state.activePetId]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl">Profile</h1>
        <p className="text-mocha mt-1">You, {petName}, and whoever shares the care.</p>
      </header>

      <Card className="p-5 sm:p-6">
        <SectionTitle hint="Switch pets or add another to the household.">Pets</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {state.pets.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePet(p.id)}
              aria-pressed={p.id === state.activePetId}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-transform hover:-translate-y-0.5 ${
                p.id === state.activePetId ? "border-espresso bg-cream" : "border-line bg-card"
              }`}
            >
              <AvatarBlob name={p.name} hue={p.hue} photo={p.photo} size={44} />
              <div className="min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-mocha capitalize">{p.species} · {p.ageRange}</div>
              </div>
            </button>
          ))}
          <button className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-3 text-sm text-mocha hover:border-clay" onClick={() => setPetModal(true)}>
            <Icon name="plus" size={16} /> Add a pet
          </button>
        </div>
      </Card>

      {pet && <PetDetails pet={pet} onUpdate={(patch) => updatePet(pet.id, patch)} />}

      <Card className="p-5 sm:p-6">
        <SectionTitle hint="Who can log walks, meals and play.">Household</SectionTitle>
        <ul className="divide-y divide-[color:var(--color-line)]">
          {state.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-cream text-mocha">
                <Icon name={m.role === "owner" ? "user" : "users"} size={17} />
              </span>
              <span className="flex-1">{m.name}</span>
              <span className="text-xs text-faint capitalize">{m.role === "owner" ? "you" : "shares care"}</span>
              {m.role !== "owner" && (
                <button className="text-faint hover:text-clay" onClick={() => removeMember(m.id)} aria-label={`Remove ${m.name}`}>
                  <Icon name="trash" size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-3">
          <input
            className="field"
            value={memberDraft}
            onChange={(e) => setMemberDraft(e.target.value)}
            placeholder="Add a name"
            onKeyDown={(e) => {
              if (e.key === "Enter" && memberDraft.trim()) {
                addMember(memberDraft.trim());
                setMemberDraft("");
              }
            }}
          />
          <button
            className="btn btn-quiet px-4"
            onClick={() => {
              if (!memberDraft.trim()) return;
              addMember(memberDraft.trim());
              setMemberDraft("");
              toast("Added to the household.", "success");
            }}
          >
            Add
          </button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle hint="Tandem is a shared routine, not two separate trackers.">Favorite shared activities & goals</SectionTitle>
        <label className="block mb-4">
          <span className="text-sm font-medium">Your name</span>
          <input className="field mt-1.5" value={state.owner.name} onChange={(e) => updateOwner({ name: e.target.value })} />
        </label>
        <div>
          <span className="text-sm font-medium">What you'd like more of</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {["More daylight", "More movement", "A steadier routine", "Time away from screens", "Less stress", "Company and connection"].map((g) => {
              const on = state.owner.goals?.includes(g) ?? false;
              return (
                <button
                  key={g}
                  className="chip"
                  aria-pressed={on}
                  onClick={() =>
                    updateOwner({
                      goals: on ? state.owner.goals!.filter((x) => x !== g) : [...(state.owner.goals ?? []), g],
                    })
                  }
                >
                  {on && <Icon name="check" size={13} />}
                  {g}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block mt-4">
          <span className="text-sm font-medium">Favorite activity together</span>
          <input
            className="field mt-1.5"
            value={state.owner.goals?.find((g) => g.startsWith("favorite:"))?.slice(9) ?? ""}
            placeholder="The long loop by the river"
            onChange={(e) => {
              const rest = (state.owner.goals ?? []).filter((g) => !g.startsWith("favorite:"));
              updateOwner({ goals: e.target.value ? [...rest, `favorite:${e.target.value}`] : rest });
            }}
          />
        </label>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle hint="Everything stays on this device.">Notifications & preferences</SectionTitle>
        <div className="space-y-3">
          <Toggle
            label="In-app reminders"
            hint="Gentle toasts while Tandem is open. No push, no backend."
            checked={state.prefs.remindersInApp}
            onChange={(v) => setPrefs({ remindersInApp: v })}
          />
          <Toggle
            label="Weather-aware suggestions"
            hint="Add a city for a walk window. No location tracking."
            checked={state.prefs.weatherEnabled}
            onChange={(v) => setPrefs({ weatherEnabled: v })}
          />
          <Toggle
            label="Reduce motion"
            hint="Calmer animations. Your system setting is respected too."
            checked={!!state.prefs.reducedMotion}
            onChange={(v) => setPrefs({ reducedMotion: v })}
          />
          <div className="pt-1">
            <span className="text-sm font-medium">I'll be out</span>
            <p className="text-xs text-faint mb-2">Tandem will track alone time and suggest a break — without judgment.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-quiet px-3 py-2 text-xs" onClick={() => { setAwayUntil(new Date(Date.now() + 2 * 3600e3).toISOString()); toast("Noted. We'll keep an eye on the time.", "info"); }}>
                For 2 hours
              </button>
              <button className="btn btn-quiet px-3 py-2 text-xs" onClick={() => { setAwayUntil(new Date(Date.now() + 5 * 3600e3).toISOString()); toast("Noted. Handoff sheet is ready if you need it.", "info"); }}>
                For 5 hours
              </button>
              {state.awayUntil && +new Date(state.awayUntil) > Date.now() && (
                <button className="btn btn-ghost px-3 py-2 text-xs" onClick={() => setAwayUntil(undefined)}>
                  I'm back
                </button>
              )}
            </div>
            {state.awayUntil && +new Date(state.awayUntil) > Date.now() && (
              <p className="text-xs text-clay-deep mt-2">
                Marked out until {new Date(state.awayUntil).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle hint="Kept quiet on purpose.">Streak</SectionTitle>
        <p className="text-sm text-mocha">
          {streak > 0 ? `${streak} day${streak === 1 ? "" : "s"} with a walk or play. Nice, but not the point.` : "No streak going right now."}
        </p>
        <p className="mt-3 text-sm">{`Missing a day doesn't mean you've failed. ${petName} certainly won't mind.`}</p>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle hint="Your data, your device.">Data</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-quiet px-4 py-2.5 text-sm" onClick={exportJSON}>
            <Icon name="download" size={16} /> Export data (JSON)
          </button>
          <button className="btn btn-ghost px-4 py-2.5 text-sm" onClick={resetDemo}>
            <Icon name="refresh" size={16} /> Reset demo data
          </button>
          <button className="btn btn-ghost px-4 py-2.5 text-sm" onClick={startFresh}>
            <Icon name="sparkle" size={16} /> Start fresh
          </button>
          <button className="btn btn-ghost px-4 py-2.5 text-sm" onClick={() => navigate("care")}>
            <Icon name="shield" size={16} /> Care & handoff
          </button>
        </div>
        <p className="mt-4 text-xs text-faint">
          Tandem offers general wellness and pet-routine guidance and is not a medical device or veterinary advice. It never
          diagnoses people or animals and never recommends medication.
        </p>
      </Card>

      <button className="btn btn-primary w-full py-3.5 lg:hidden" onClick={() => openWalk()}>
        <Icon name="walk" size={18} /> Start a walk
      </button>

      {petModal && (
        <AddPetModal
          onClose={() => setPetModal(false)}
          onSave={(p) => {
            addPet(p);
            setPetModal(false);
            toast(`${p.name} joined the household.`, "success");
          }}
        />
      )}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-clay" : "bg-cream"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <span>
        <span className="text-sm font-medium block">{label}</span>
        <span className="text-xs text-faint">{hint}</span>
      </span>
    </label>
  );
}

function PetDetails({ pet, onUpdate }: { pet: Pet; onUpdate: (patch: Partial<Pet>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useApp();
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onUpdate({ photo: await compressImage(file) });
    } catch {
      toast("Couldn't read that image.", "care");
    }
  }
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle hint="Species-aware defaults live in Routine.">{pet.name}'s profile</SectionTitle>
      <div className="flex items-center gap-4 mb-5">
        <AvatarBlob name={pet.name} hue={pet.hue} photo={pet.photo} size={64} />
        <div className="flex gap-2">
          <button className="btn btn-ghost px-4 py-2 text-sm" onClick={() => fileRef.current?.click()}>
            <Icon name="camera" size={16} /> Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          {pet.photo && (
            <button className="text-xs text-faint hover:text-espresso" onClick={() => onUpdate({ photo: undefined })}>
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input className="field mt-1.5" value={pet.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Species</span>
          <select className="field mt-1.5" value={pet.species} onChange={(e) => onUpdate({ species: e.target.value as Species })}>
            {SPECIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Age range</span>
          <input className="field mt-1.5" value={pet.ageRange} onChange={(e) => onUpdate({ ageRange: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Vet contact</span>
          <input
            className="field mt-1.5"
            value={pet.vet?.name ?? ""}
            placeholder="Dr. Okafor · 555-0142"
            onChange={(e) => onUpdate({ vet: { ...pet.vet, name: e.target.value } })}
          />
        </label>
      </div>
    </Card>
  );
}

function AddPetModal({ onClose, onSave }: { onClose: () => void; onSave: (p: Pet) => void }) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [ageRange, setAgeRange] = useState("1–3 years");
  return (
    <Modal
      open
      onClose={onClose}
      title="Add a pet"
      footer={
        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1 py-3" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary flex-1 py-3"
            disabled={!name.trim()}
            onClick={() => onSave({ id: uid("pet"), name: name.trim(), species, ageRange, hue: hueFromName(name), weightLog: [] })}
          >
            Add {name.trim() || "pet"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input className="field mt-1.5" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <div>
          <span className="text-sm font-medium">Species</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {SPECIES.map((s) => (
              <button key={s.value} className="chip" aria-pressed={species === s.value} onClick={() => setSpecies(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Age range</span>
          <input className="field mt-1.5" value={ageRange} onChange={(e) => setAgeRange(e.target.value)} />
        </label>
        <p className="text-xs text-faint">
          A new pet starts with a species template you can tweak. Weekday/weekend schedules live in Routine.
        </p>
      </div>
    </Modal>
  );
}