import { useRef, useState } from "react";
import { Icon } from "../components/icons";
import { AvatarBlob } from "../components/ui";
import { useApp, uid } from "../store/AppContext";
import { compressImage } from "../store/storage";
import { buildRoutine, type RoutineAnswers } from "../data/demoData";
import type { AppState, Member, Pet, Species } from "../engine/types";

function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (h + 12) % 360;
}

const SPECIES: { value: Species; label: string }[] = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "small", label: "Small pet" },
  { value: "other", label: "Other" },
];

const AGES = ["Under 1", "1–3 years", "3–7 years", "7+ years"];
const GOALS = [
  "More daylight",
  "More movement",
  "A steadier routine",
  "Time away from screens",
  "Less stress",
  "Company and connection",
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { state, update, toast } = useApp();
  const [step, setStep] = useState(0);

  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [age, setAge] = useState("3–7 years");
  const [photo, setPhoto] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const [walks, setWalks] = useState<RoutineAnswers["walks"]>("2");
  const [meals, setMeals] = useState<RoutineAnswers["meals"]>("2");
  const [play, setPlay] = useState<RoutineAnswers["play"]>("some");
  const [energy, setEnergy] = useState<Pet["energy"]>("balanced");

  const [ownerName, setOwnerName] = useState(state.owner.name || "");
  const [work, setWork] = useState<NonNullable<AppState["owner"]["workPattern"]>>("home");
  const [outside, setOutside] = useState<NonNullable<AppState["owner"]["outsideTime"]>>("little");

  const [goals, setGoals] = useState<string[]>(["More daylight"]);

  const [shares, setShares] = useState(false);
  const [housemates, setHousemates] = useState<string[]>([]);
  const [nameDraft, setNameDraft] = useState("");

  const steps = ["Your pet", "Their day", "Your day", "What you'd like", "Who shares care"];
  const canContinue = step === 0 ? petName.trim().length > 0 : true;

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast("That image is a little large. Try one under 8MB.", "care");
      return;
    }
    try {
      const data = await compressImage(file);
      setPhoto(data);
    } catch {
      toast("Couldn't read that image. You can add one later.", "care");
    }
  }

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function addHousemate() {
    const n = nameDraft.trim();
    if (!n) return;
    setHousemates((prev) => [...prev, n]);
    setNameDraft("");
  }

  function finish() {
    const name = petName.trim() || "Luna";
    const pet: Pet = {
      id: uid("pet"),
      name,
      species,
      ageRange: age,
      energy,
      photo,
      hue: hueFromName(name),
      weightLog: [],
    };
    const members: Member[] = [
      { id: uid("member"), name: ownerName.trim() || "You", role: "owner" },
      ...(shares ? housemates.map((n) => ({ id: uid("member"), name: n, role: "housemate" as const })) : []),
    ];
    const routine = buildRoutine(pet.id, species, { walks, meals, play });
    update((s) => ({
      ...s,
      onboarded: true,
      owner: { ...s.owner, name: ownerName.trim() || s.owner.name || "friend", workPattern: work, outsideTime: outside, goals },
      pets: [pet],
      activePetId: pet.id,
      members,
      routine,
      logs: [],
      checkIns: [],
      journal: [],
      care: [],
      vetNotes: [],
      experiments: [],
      nudgeState: { countByDay: {}, seen: [], dismissed: [] },
      streakStart: undefined,
    }));
    toast(`Routine ready. ${name}'s first day starts now.`, "success");
    onDone();
  }

  return (
    <div className="min-h-dvh flex flex-col bg-oat">
      <div className="mx-auto w-full max-w-xl px-5 sm:px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <span className="font-serif text-xl">Tandem</span>
          <span className="text-sm text-mocha num">{step + 1} / 5</span>
        </div>
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of 5`}>
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-clay" : "bg-cream"}`} />
          ))}
        </div>
        <p className="mt-3 text-xs uppercase tracking-widest text-faint">{steps[step]}</p>
      </div>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 sm:px-6">
        <div key={step} style={{ animation: "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
          {step === 0 && (
            <div>
              <h1 className="text-3xl mb-2">Meet your pet.</h1>
              <p className="text-mocha mb-6">Just the basics. You can change any of this later.</p>
              <div className="flex items-center gap-4 mb-6">
                <AvatarBlob name={petName || "?"} hue={hueFromName(petName || "Luna")} photo={photo} size={72} />
                <div>
                  <button className="btn btn-ghost px-4 py-2 text-sm" onClick={() => fileRef.current?.click()}>
                    <Icon name="camera" size={16} /> {photo ? "Change photo" : "Add a photo"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                  {photo && (
                    <button className="ml-2 text-xs text-faint hover:text-espresso" onClick={() => setPhoto(undefined)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <label className="block mb-5">
                <span className="text-sm font-medium">Their name</span>
                <input className="field mt-1.5" value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="Luna" autoFocus />
              </label>
              <Field label="Species">
                <ChipRow options={SPECIES.map((s) => s.label)} value={SPECIES.find((s) => s.value === species)!.label} onChange={(v) => setSpecies(SPECIES.find((s) => s.label === v)!.value)} />
              </Field>
              <Field label="Age range">
                <ChipRow options={AGES} value={age} onChange={setAge} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-3xl mb-2">What does {petName || "their"} day look like?</h1>
              <p className="text-mocha mb-6">A rough sense is plenty. Tandem will build the routine.</p>
              <Field label="Walks or outings per day">
                <ChipRow options={["0–1", "2", "3+"]} value={walks} onChange={(v) => setWalks(v as RoutineAnswers["walks"])} />
              </Field>
              <Field label="Meals per day">
                <ChipRow options={["1", "2", "3"]} value={meals} onChange={(v) => setMeals(v as RoutineAnswers["meals"])} />
              </Field>
              <Field label="Play sessions">
                <ChipRow options={["A little", "Some", "Lots"]} value={play === "little" ? "A little" : play === "some" ? "Some" : "Lots"} onChange={(v) => setPlay(v === "A little" ? "little" : v === "Some" ? "some" : "lots")} />
              </Field>
              <Field label="How energetic are they?">
                <ChipRow options={["Calm", "Balanced", "Very energetic"]} value={energy === "calm" ? "Calm" : energy === "energetic" ? "Very energetic" : "Balanced"} onChange={(v) => setEnergy(v === "Calm" ? "calm" : v === "Very energetic" ? "energetic" : "balanced")} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-3xl mb-2">How's your own day usually?</h1>
              <p className="text-mocha mb-6">No wrong answers. This just tunes the nudges.</p>
              <label className="block mb-5">
                <span className="text-sm font-medium">What should we call you?</span>
                <input className="field mt-1.5" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Amirtha" />
              </label>
              <Field label="Work or study">
                <ChipRow options={["Mostly at home", "Hybrid", "Out most of the day"]} value={work === "home" ? "Mostly at home" : work === "hybrid" ? "Hybrid" : "Out most of the day"} onChange={(v) => setWork(v === "Mostly at home" ? "home" : v === "Hybrid" ? "hybrid" : "out")} />
              </Field>
              <Field label="Time spent outside">
                <ChipRow options={["Very little", "Some", "Plenty"]} value={outside === "little" ? "Very little" : outside === "some" ? "Some" : "Plenty"} onChange={(v) => setOutside(v === "Very little" ? "little" : v === "Some" ? "some" : "plenty")} />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-3xl mb-2">What would you like more of?</h1>
              <p className="text-mocha mb-6">Choose as many as feel true.</p>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <button key={g} className="chip" aria-pressed={goals.includes(g)} onClick={() => toggleGoal(g)}>
                    {goals.includes(g) && <Icon name="check" size={14} />}
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h1 className="text-3xl mb-2">Who shares the care?</h1>
              <p className="text-mocha mb-6">Tandem can track who did what, so nobody double-feeds {petName || "your pet"}.</p>
              <ChipRow options={["Just me", "With a roommate or partner"]} value={shares ? "With a roommate or partner" : "Just me"} onChange={(v) => setShares(v === "With a roommate or partner")} />
              {shares && (
                <div className="mt-5">
                  <label className="block">
                    <span className="text-sm font-medium">Their name</span>
                    <div className="flex gap-2 mt-1.5">
                      <input
                        className="field"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addHousemate();
                          }
                        }}
                        placeholder="Maya"
                      />
                      <button className="btn btn-quiet px-4" onClick={addHousemate} type="button">
                        Add
                      </button>
                    </div>
                  </label>
                  {housemates.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {housemates.map((h) => (
                        <li key={h} className="chip active">
                          {h}
                          <button onClick={() => setHousemates((p) => p.filter((x) => x !== h))} aria-label={`Remove ${h}`}>
                            <Icon name="close" size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <div className="mx-auto w-full max-w-xl px-5 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <button className="btn btn-ghost px-5 py-3" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </button>
          {step < 4 ? (
            <button className="btn btn-primary px-6 py-3.5" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              Continue <Icon name="arrowRight" size={17} />
            </button>
          ) : (
            <button className="btn btn-primary px-6 py-3.5" onClick={finish}>
              Build our routine <Icon name="sparkle" size={17} />
            </button>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-faint">
          Tandem offers general wellness and pet-routine guidance and is not a medical device or veterinary advice.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ChipRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} className="chip" aria-pressed={value === o} onClick={() => onChange(o)}>
          {value === o && <Icon name="check" size={14} />}
          {o}
        </button>
      ))}
    </div>
  );
}