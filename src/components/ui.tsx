import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./icons";
import { useApp } from "../store/AppContext";

/* ---------------------------------------------------------------- *
 * Avatar blob                                                        *
 * ---------------------------------------------------------------- */

interface AvatarBlobProps {
  name: string;
  hue: number;
  photo?: string;
  size?: number;
  wag?: boolean;
  className?: string;
}

export function AvatarBlob({ name, hue, photo, size = 56, wag, className = "" }: AvatarBlobProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "46% 54% 58% 42% / 52% 46% 54% 48%",
    background: photo
      ? undefined
      : `linear-gradient(140deg, hsl(${hue} 62% 74%), hsl(${(hue + 45) % 360} 46% 60%))`,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
  };
  return (
    <div
      className={`relative shrink-0 overflow-hidden grid place-items-center ${wag ? "animate-[wag_0.7s_cubic-bezier(0.34,1.56,0.64,1)]" : ""} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {photo ? (
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className="font-serif text-white"
          style={{ fontSize: size * 0.42, lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.12)" }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Progress ring                                                      *
 * ---------------------------------------------------------------- */

interface ProgressRingProps {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  tone?: string;
  track?: string;
  children?: ReactNode;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  value,
  size = 132,
  stroke = 10,
  tone = "var(--color-clay)",
  track = "var(--color-cream)",
  children,
  label,
  sublabel,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = c * (1 - clamped);
  const gradId = useId();
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={label ? `${label}${sublabel ? `, ${sublabel}` : ""}` : undefined}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={tone} />
            <stop offset="100%" stopColor="var(--color-butter)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Small building blocks                                              *
 * ---------------------------------------------------------------- */

export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "li";
}) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: ReactNode;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-lg sm:text-xl">{children}</h2>
        {hint && <p className="text-sm text-mocha mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function DrawCheck({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 32, animation: "draw 0.5s ease-out forwards" }}
      />
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Pill({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "clay" | "sage" | "butter" | "lavender";
  icon?: IconName;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-cream text-mocha",
    clay: "bg-clay-soft/60 text-clay-deep",
    sage: "bg-sage-soft text-sage",
    butter: "bg-butter-soft text-[#8a6a1d]",
    lavender: "bg-lavender-soft text-[#6b5c93]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export function StateBadge({ state }: { state: "done" | "due" | "upcoming" }) {
  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-sage">
        <DrawCheck size={14} /> Done
      </span>
    );
  }
  if (state === "due") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-clay-deep">
        <Icon name="clock" size={14} /> Due soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-faint">
      <Icon name="clock" size={14} /> Upcoming
    </span>
  );
}

/* ---------------------------------------------------------------- *
 * Modal                                                              *
 * ---------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const nodes = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      ref.current?.querySelector<HTMLElement>("button, input, textarea, select")?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-espresso/35 backdrop-blur-[2px]"
        style={{ animation: "fade-up 0.2s ease both" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} max-h-[92dvh] overflow-y-auto bg-card rounded-t-[28px] sm:rounded-[28px] border border-line shadow-2xl`}
        style={{ animation: "fade-up 0.32s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 sm:px-6 py-4 bg-card/95 backdrop-blur border-b border-line">
          <h3 id={titleId} className="text-xl">
            {title}
          </h3>
          <button className="btn btn-ghost h-9 w-9" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5">{children}</div>
        {footer && <div className="sticky bottom-0 px-5 sm:px-6 py-4 bg-card/95 backdrop-blur border-t border-line">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Toasts                                                             *
 * ---------------------------------------------------------------- */

export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div
      className="fixed z-[60] bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card px-4 py-3 flex items-start gap-3"
          style={{ animation: "fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          <span className="mt-0.5 text-clay">
            <Icon name={t.kind === "success" ? "check" : t.kind === "care" ? "shield" : "sparkle"} size={18} />
          </span>
          <p className="text-sm flex-1">{t.message}</p>
          <button
            className="text-faint hover:text-espresso"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Decorative blobs                                                   *
 * ---------------------------------------------------------------- */

export function BlobBackdrop({ variant = "warm" }: { variant?: "warm" | "cool" | "dusk" }) {
  const palettes: Record<string, string[]> = {
    warm: ["rgba(189,111,75,0.20)", "rgba(217,180,85,0.18)", "rgba(127,145,112,0.14)"],
    cool: ["rgba(127,145,112,0.20)", "rgba(156,143,190,0.16)", "rgba(217,180,85,0.12)"],
    dusk: ["rgba(156,143,190,0.22)", "rgba(189,111,75,0.14)", "rgba(44,38,33,0.05)"],
  };
  const [a, b, c] = palettes[variant];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-24 -left-16 h-72 w-72 animate-[drift-a_14s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle at 40% 40%, ${a}, transparent 68%)`, borderRadius: "46% 54% 58% 42% / 52% 46% 54% 48%" }}
      />
      <div
        className="absolute top-1/3 -right-20 h-80 w-80 animate-[drift-b_17s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle at 60% 40%, ${b}, transparent 68%)`, borderRadius: "58% 42% 46% 54% / 46% 58% 42% 54%" }}
      />
      <div
        className="absolute bottom-0 left-1/4 h-64 w-64"
        style={{ background: `radial-gradient(circle at 50% 50%, ${c}, transparent 70%)`, borderRadius: "50% 50% 42% 58% / 58% 42% 58% 42%" }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Empty state                                                        *
 * ---------------------------------------------------------------- */

export function EmptyState({
  title,
  body,
  icon = "leaf",
  action,
}: {
  title: string;
  body: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="card px-6 py-10 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-cream text-clay">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="text-lg mb-1">{title}</h3>
      <p className="text-sm text-mocha max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}