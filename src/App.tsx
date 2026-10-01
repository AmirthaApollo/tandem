import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppProvider, useApp } from "./store/AppContext";
import { NavContext, ROUTE_TITLES, type NavValue, type Route } from "./nav";
import { Icon, type IconName } from "./components/icons";
import { AvatarBlob, Skeleton, ToastHost } from "./components/ui";
import { Landing } from "./screens/Landing";
import { Onboarding } from "./screens/Onboarding";
import { Today } from "./screens/Today";
import { Routine } from "./screens/Routine";
import { Insights } from "./screens/Insights";
import { Moments } from "./screens/Moments";
import { Care } from "./screens/Care";
import { Profile } from "./screens/Profile";
import { WalkMode } from "./screens/WalkMode";
import { hasSavedState } from "./store/storage";
import { dateAt, dayKey } from "./engine/connectionEngine";

const NAV: { route: Route; label: string; icon: IconName }[] = [
  { route: "today", label: "Today", icon: "home" },
  { route: "routine", label: "Routine", icon: "calendar" },
  { route: "insights", label: "Insights", icon: "chart" },
  { route: "moments", label: "Moments", icon: "book" },
  { route: "care", label: "Care", icon: "shield" },
  { route: "profile", label: "Profile", icon: "user" },
];

const MOBILE_NAV: Route[] = ["today", "routine", "insights", "moments", "profile"];

function Shell() {
  const { state, pet, toast } = useApp();
  const [entered, setEntered] = useState(() => hasSavedState());
  const [route, setRoute] = useState<Route>("today");
  const [walkOpen, setWalkOpen] = useState(false);
  const [walkManual, setWalkManual] = useState(false);
  const [ready, setReady] = useState(false);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 450);
    return () => window.clearTimeout(t);
  }, []);

  // In-app reminders (no push, no backend).
  useEffect(() => {
    if (!state.prefs.remindersInApp || !state.onboarded) return;
    const tick = () => {
      const now = new Date();
      const key = dayKey(now);
      const petName = pet?.name ?? "your pet";
      for (const m of state.routine) {
        if (!m.reminder || !m.days.includes(now.getDay())) continue;
        if (m.petId !== "all" && m.petId !== state.activePetId) continue;
        const at = dateAt(now, m.time);
        const delta = +now - +at;
        const firedId = `${key}:routine:${m.id}`;
        if (delta >= 0 && delta < 2 * 60000 && !firedRef.current.has(firedId)) {
          firedRef.current.add(firedId);
          toast(`Time for ${m.label.toLowerCase()} — ${m.benefit}.`, "info");
        }
      }
      for (const c of state.care) {
        if (c.date !== key) continue;
        const firedId = `${key}:care:${c.id}`;
        if (!firedRef.current.has(firedId)) {
          firedRef.current.add(firedId);
          toast(`${c.title} is due today for ${petName}.`, "care");
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [state.prefs.remindersInApp, state.routine, state.care, state.activePetId, state.onboarded, pet?.name, toast]);

  const openWalk = useCallback((manual = false) => {
    setWalkManual(manual);
    setWalkOpen(true);
  }, []);

  const nav: NavValue = useMemo(
    () => ({ route, navigate: setRoute, walkOpen, openWalk, closeWalk: () => setWalkOpen(false), walkManual }),
    [route, walkOpen, openWalk, walkManual],
  );

  if (!entered) {
    return <Landing onEnter={() => setEntered(true)} />;
  }

  if (!state.onboarded) {
    return (
      <NavContext.Provider value={nav}>
        <Onboarding onDone={() => setEntered(true)} />
        <ToastHost />
      </NavContext.Provider>
    );
  }

  if (!ready) return <BootSkeleton />;

  const screen = {
    today: <Today />,
    routine: <Routine />,
    insights: <Insights />,
    moments: <Moments />,
    care: <Care />,
    profile: <Profile />,
  }[route];

  return (
    <NavContext.Provider value={nav}>
      <div className={`min-h-dvh lg:flex ${state.prefs.reducedMotion ? "reduce-motion" : ""}`}>
        <Sidebar route={route} navigate={setRoute} petName={pet?.name ?? "your pet"} pet={pet} />

        <div className="flex-1 min-w-0">
          <MobileBar route={route} />
          <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-5 lg:py-8 pb-32 lg:pb-12">
            <div key={route} style={{ animation: "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              {screen}
            </div>
          </main>
        </div>

        <MobileTabs route={route} navigate={setRoute} onWalk={() => openWalk()} />
        <ToastHost />
        {walkOpen && <WalkMode manual={walkManual} onClose={() => setWalkOpen(false)} />}
      </div>
    </NavContext.Provider>
  );
}

function Sidebar({
  route,
  navigate,
  petName,
  pet,
}: {
  route: Route;
  navigate: (r: Route) => void;
  petName: string;
  pet?: { hue: number; photo?: string };
}) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-line bg-oat/60 sticky top-0 h-dvh px-5 py-6">
      <div className="font-serif text-2xl mb-1">Tandem</div>
      <p className="text-xs text-faint mb-6">A better day, together.</p>

      <nav className="flex flex-col gap-1" aria-label="Primary">
        {NAV.map((n) => (
          <button
            key={n.route}
            onClick={() => navigate(n.route)}
            aria-current={route === n.route ? "page" : undefined}
            className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-colors ${
              route === n.route ? "bg-espresso text-oat" : "text-mocha hover:bg-cream"
            }`}
          >
            <Icon name={n.icon} size={18} />
            {n.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <div className="flex items-center gap-3 rounded-2xl bg-cream/70 p-3">
          {pet && <AvatarBlob name={petName} hue={pet.hue} photo={pet.photo} size={38} />}
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{petName}</div>
            <div className="text-[11px] text-faint">keeping you two in step</div>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-faint">A better day, together.</p>
      </div>
    </aside>
  );
}

function MobileBar({ route }: { route: Route }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-oat/90 backdrop-blur border-b border-line">
      <span className="font-serif text-xl">Tandem</span>
      <span className="text-sm text-mocha">{ROUTE_TITLES[route]}</span>
    </header>
  );
}

function MobileTabs({ route, navigate, onWalk }: { route: Route; navigate: (r: Route) => void; onWalk: () => void }) {
  return (
    <>
      <button
        className="lg:hidden fixed z-40 bottom-[86px] right-5 h-16 w-16 rounded-full bg-clay text-white shadow-xl grid place-items-center active:scale-95 transition-transform"
        onClick={onWalk}
        aria-label="Start a walk"
      >
        <Icon name="walk" size={26} />
      </button>
      <nav
        className="lg:hidden fixed z-30 bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <ul className="flex">
          {MOBILE_NAV.map((r) => {
            const item = NAV.find((n) => n.route === r)!;
            return (
              <li key={r} className="flex-1">
                <button
                  onClick={() => navigate(r)}
                  aria-current={route === r ? "page" : undefined}
                  className={`w-full flex flex-col items-center gap-1 py-2.5 text-[10px] ${route === r ? "text-clay-deep" : "text-faint"}`}
                >
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function BootSkeleton() {
  return (
    <div className="min-h-dvh lg:flex">
      <div className="hidden lg:block w-64 border-r border-line p-6">
        <Skeleton className="h-8 w-32" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}