import { Icon } from "../components/icons";
import { BlobBackdrop } from "../components/ui";

function HeroScene() {
  const moments = [
    { label: "Walk", hue: 24, t: 0.08 },
    { label: "Meal", hue: 44, t: 0.3 },
    { label: "Play", hue: 50, t: 0.52 },
    { label: "Walk", hue: 24, t: 0.74 },
    { label: "Wind-down", hue: 265, t: 0.94 },
  ];
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="relative h-64 sm:h-72 grid place-items-center">
        <div
          className="absolute h-44 w-44 animate-[drift-a_14s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle at 40% 40%, rgba(127,145,112,0.55), rgba(127,145,112,0.08) 70%)",
            borderRadius: "46% 54% 58% 42% / 52% 46% 54% 48%",
            transform: "translateX(-34px)",
            filter: "blur(1px)",
          }}
        />
        <div
          className="absolute h-44 w-44 animate-[drift-b_17s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle at 60% 40%, rgba(189,111,75,0.55), rgba(189,111,75,0.08) 70%)",
            borderRadius: "58% 42% 46% 54% / 46% 58% 42% 54%",
            transform: "translateX(34px)",
            filter: "blur(1px)",
          }}
        />
        <div
          className="absolute h-24 w-24 animate-[pulse-ring_3.2s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, rgba(217,180,85,0.85), rgba(217,180,85,0) 70%)",
            filter: "blur(2px)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-espresso/80">
            <span className="h-2.5 w-2.5 rounded-full bg-sage" />
            <span className="h-2.5 w-2.5 rounded-full bg-clay" />
          </div>
        </div>
      </div>

      <svg viewBox="0 0 320 90" className="w-full" role="img" aria-label="A day arc with walk, meal and play moments lighting up">
        <path d="M12 78 Q160 -14 308 78" fill="none" stroke="var(--color-line)" strokeWidth="2" />
        {moments.map((m, i) => {
          const t = m.t;
          const x = 12 + (308 - 12) * t;
          const y = 78 + (-14 - 78) * (4 * t * (1 - t));
          return (
            <g key={i} style={{ animation: `pulse-ring 3.2s ease-in-out ${i * 0.4}s infinite`, transformOrigin: `${x}px ${y}px` }}>
              <circle cx={x} cy={y} r={9} fill={`hsl(${m.hue} 55% 82%)`} />
              <circle cx={x} cy={y} r={4} fill={`hsl(${m.hue} 50% 55%)`} />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between px-1 text-[11px] text-faint">
        <span>morning</span>
        <span>midday</span>
        <span>evening</span>
      </div>
    </div>
  );
}

const benefits = [
  { icon: "paw" as const, title: "Your pet's routine becomes yours", body: "Walks become daylight. Meals become pauses. Play becomes movement." },
  { icon: "heart" as const, title: "Gentle nudges, never guilt", body: "At most two a day, never late, never a telling-off. Easy to snooze." },
  { icon: "chart" as const, title: "See what a good day looks like", body: "For both of you — your outdoor time and mood, side by side." },
];

const steps = [
  { n: "01", title: "Meet your pet", body: "Their species, their rhythm, and what a normal day already looks like." },
  { n: "02", title: "Tandem builds a shared routine", body: "Specific times for walks, meals and play — with your own wellbeing folded in." },
  { n: "03", title: "Live one better day at a time", body: "Check off moments, get kind nudges, and watch the patterns gently emerge." },
];

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <BlobBackdrop variant="warm" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8 py-5">
        <span className="font-serif text-2xl tracking-tight">Tandem</span>
        <button className="btn btn-ghost px-4 py-2 text-sm" onClick={onEnter}>
          Open the app
        </button>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-6 pb-16 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div style={{ animation: "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both" }}>
            <p className="text-sm uppercase tracking-[0.2em] text-clay-deep mb-4">A better day, together.</p>
            <h1 className="text-4xl sm:text-6xl leading-[1.02] max-w-xl">
              A better day,
              <br />
              <span className="text-clay">together.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-mocha">
              Tandem turns your pet's routine into yours: more daylight, more movement, fewer days spent indoors.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn btn-primary px-6 py-3.5 text-base" onClick={onEnter}>
                Meet your routine <Icon name="arrowRight" size={18} />
              </button>
              <a className="btn btn-ghost px-6 py-3.5 text-base" href="#how">
                See how it works
              </a>
            </div>
            <p className="mt-6 text-sm text-faint max-w-md">
              General wellness and pet-routine guidance. Not a medical device, not veterinary advice.
            </p>
          </div>

          <div style={{ animation: "fade-up 0.9s cubic-bezier(0.22,1,0.36,1) both" }}>
            <HeroScene />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 sm:px-8 py-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {benefits.map((b, i) => (
              <div
                key={b.title}
                className="card lift p-6"
                style={{ animation: `fade-up 0.6s cubic-bezier(0.22,1,0.36,1) ${0.1 * i}s both` }}
              >
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-cream text-clay">
                  <Icon name={b.icon} size={22} />
                </div>
                <h3 className="text-lg mb-1.5">{b.title}</h3>
                <p className="text-sm text-mocha">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl">Your pet already has a schedule.</h2>
            <p className="mt-3 text-lg text-mocha">Let's make it work for you too.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="border-t border-line pt-5">
                <span className="num text-clay text-sm">{s.n}</span>
                <h3 className="mt-2 text-xl">{s.title}</h3>
                <p className="mt-2 text-sm text-mocha">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-col items-start gap-4 rounded-[26px] bg-espresso px-7 py-9 text-oat sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl text-oat">Ready when you are.</h3>
              <p className="mt-1 text-oat/70 text-sm">Luna's day is already loaded. Have a look around.</p>
            </div>
            <button className="btn bg-oat px-6 py-3.5 text-espresso hover:bg-white" onClick={onEnter}>
              Meet your routine <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 py-10 border-t border-line">
        <p className="text-xs text-faint max-w-2xl">
          Tandem offers general wellness and pet-routine guidance and is not a medical device or veterinary advice.
          It never diagnoses people or animals and never recommends medication.
        </p>
        <p className="mt-3 text-xs text-faint">A better day, together.</p>
      </footer>
    </div>
  );
}