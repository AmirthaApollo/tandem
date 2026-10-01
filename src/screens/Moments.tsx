import { useMemo, useRef, useState } from "react";
import { Icon } from "../components/icons";
import { AvatarBlob, Card, EmptyState, SectionTitle } from "../components/ui";
import { useApp } from "../store/AppContext";
import { compressImage } from "../store/storage";
import { dayKey } from "../engine/connectionEngine";
import type { JournalEntry } from "../engine/types";

function prettyDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function Moments() {
  const { state, pet, addJournal, removeJournal, toast } = useApp();
  const petName = pet?.name ?? "your pet";
  const [favorite, setFavorite] = useState("");
  const [notice, setNotice] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const entries = useMemo(
    () => [...state.journal].sort((a, b) => b.date.localeCompare(a.date) || b.ts.localeCompare(a.ts)),
    [state.journal],
  );

  const onThisDay = useMemo(() => {
    const today = dayKey(new Date());
    const [ty, tm, td] = today.split("-").map(Number);
    const exact = entries.find((e) => {
      const [ey, em, ed] = e.date.split("-").map(Number);
      return ed === td && em === tm && ey !== ty;
    });
    if (exact) return { entry: exact, label: "On this day" };
    const older = entries.find((e) => {
      const ageDays = (Date.now() - new Date(e.date + "T12:00").getTime()) / 86400000;
      return ageDays > 14;
    });
    return older ? { entry: older, label: "A moment from before" } : undefined;
  }, [entries]);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast("That image is a little large. Try one under 8MB.", "care");
      return;
    }
    try {
      setPhoto(await compressImage(file));
    } catch {
      toast("Couldn't read that image.", "care");
    }
  }

  function save() {
    if (!favorite.trim()) return;
    addJournal({
      date: dayKey(new Date()),
      petId: state.activePetId,
      favorite: favorite.trim(),
      notice: notice.trim() || undefined,
      photo,
    });
    setFavorite("");
    setNotice("");
    setPhoto(undefined);
    toast("Saved. It's the remembering that matters.", "success");
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl">Moments</h1>
        <p className="text-mocha mt-1">Not a log. Just the bits you'll want to remember.</p>
      </header>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-4 mb-5">
          <AvatarBlob name={petName} hue={pet?.hue ?? 24} photo={pet?.photo} size={48} />
          <h2 className="text-xl">What was your favorite moment together today?</h2>
        </div>
        <textarea
          className="field min-h-[92px] resize-y"
          value={favorite}
          onChange={(e) => setFavorite(e.target.value)}
          placeholder={`She carried her ball the whole way home…`}
          aria-label="Your favorite moment today"
        />
        <label className="block mt-4">
          <span className="text-sm text-mocha">What did you notice about each other today? (optional)</span>
          <textarea
            className="field mt-1.5 min-h-[68px] resize-y"
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="Optional — a small thing you noticed."
            aria-label="What you noticed about each other"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn btn-ghost px-4 py-2 text-sm" onClick={() => fileRef.current?.click()}>
            <Icon name="camera" size={16} /> {photo ? "Change photo" : "Add a photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          {photo && (
            <div className="flex items-center gap-2">
              <img src={photo} alt="" className="h-11 w-11 rounded-xl object-cover" />
              <button className="text-xs text-faint hover:text-espresso" onClick={() => setPhoto(undefined)}>
                Remove
              </button>
            </div>
          )}
          <div className="ml-auto">
            <button className="btn btn-primary px-5 py-3" onClick={save} disabled={!favorite.trim()}>
              Save moment
            </button>
          </div>
        </div>
      </Card>

      {onThisDay && (
        <Card className="p-5 border-lavender/40">
          <div className="flex items-center gap-2 text-[#6b5c93] mb-3">
            <Icon name="sparkle" size={16} />
            <span className="text-xs uppercase tracking-widest">{onThisDay.label}</span>
          </div>
          <JournalCard entry={onThisDay.entry} name={petName} hue={pet?.hue ?? 24} avatar={pet?.photo} onDelete={undefined} />
        </Card>
      )}

      {entries.length === 0 ? (
        <EmptyState
          title="No moments yet"
          body="When something small and good happens, write it here. One line is plenty."
          icon="heart"
        />
      ) : (
        <div>
          <SectionTitle hint={`${entries.length} saved`}>Your moments</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {entries.map((e) => (
              <JournalCard key={e.id} entry={e} name={petName} hue={pet?.hue ?? 24} avatar={pet?.photo} onDelete={() => removeJournal(e.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JournalCard({
  entry,
  name,
  hue,
  avatar,
  onDelete,
}: {
  entry: JournalEntry;
  name: string;
  hue: number;
  avatar?: string;
  onDelete?: () => void;
}) {
  return (
    <article className="card lift p-5 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <AvatarBlob name={name} hue={hue} photo={avatar} size={34} />
        <span className="text-xs text-faint">{prettyDate(entry.date)}</span>
        {onDelete && (
          <button className="ml-auto text-faint hover:text-clay" onClick={onDelete} aria-label="Delete moment">
            <Icon name="trash" size={15} />
          </button>
        )}
      </div>
      {entry.photo && <img src={entry.photo} alt="" className="mb-3 w-full rounded-2xl object-cover max-h-56" />}
      <p className="text-sm leading-relaxed flex-1">“{entry.favorite}”</p>
      {entry.notice && (
        <p className="mt-3 text-sm text-mocha border-t hairline pt-3">
          <span className="text-clay-deep">Noticed:</span> {entry.notice}
        </p>
      )}
    </article>
  );
}