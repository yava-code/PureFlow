import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode } from "react";
import type { RepEvent, RepStats } from "../src/types";

export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M24.7 7.2A11 11 0 0 0 7.2 9.7M7.3 24.8a11 11 0 0 0 17.5-2.5" />
      <path d="M7.2 9.7v-5M24.8 22.3v5" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="logo" aria-label="PureFlow">
      <Mark />
      <span>PureFlow</span>
    </div>
  );
}

export function Button({
  children,
  variant = "secondary",
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "amber" }>) {
  return (
    <button className={`button button-${variant}`} {...props}>
      {children}
    </button>
  );
}

export function Choice({
  active,
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }>) {
  return (
    <button className={`choice ${active ? "is-active" : ""}`} aria-pressed={active} {...props}>
      {children}
    </button>
  );
}

export function Check({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" {...props} />
      <span className="check-box" aria-hidden="true">
        <CheckIcon />
      </span>
      <span>{label}</span>
    </label>
  );
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {action}
    </div>
  );
}

export function Timeline({ events, startedAt }: { events: RepEvent[]; startedAt?: number }) {
  return (
    <ol className="timeline" aria-label="Session timeline">
      {events.slice(-7).map((item) => (
        <li key={item.id} className={`timeline-${eventTone(item)}`}>
          <span className="timeline-node" aria-hidden="true" />
          <time>{relativeTime(item.at, startedAt)}</time>
          <strong>{item.label}</strong>
          {item.meta?.title && <span className="timeline-detail">{String(item.meta.title)}</span>}
        </li>
      ))}
    </ol>
  );
}

export function StatStrip({ stats }: { stats: RepStats }) {
  const values = [
    { icon: <TerminalIcon />, value: stats.testRuns, label: "Test runs" },
    { icon: <LoopIcon />, value: stats.debugLoops, label: "Debug loops" },
    { icon: <BookIcon />, value: stats.sources, label: "Sources" },
  ];
  return (
    <dl className="stat-strip">
      {values.map((item) => (
        <div key={item.label}>
          <dt>
            {item.icon}
            <span>{item.label}</span>
          </dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5M19 5l-8 8" />
      <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 5 11 7-11 7Z" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16">
      <path d="m3 8 3 3 7-7" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 16h4" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7h-5V2M4 17h5v5" />
      <path d="M18.5 9a7 7 0 0 0-12-3L4 8M5.5 15a7 7 0 0 0 12 3l2.5-2" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5a3 3 0 0 1 3-2h5v17H7a3 3 0 0 0-3 2Z" />
      <path d="M20 5a3 3 0 0 0-3-2h-5v17h5a3 3 0 0 1 3 2Z" />
    </svg>
  );
}

function eventTone(item: RepEvent): "green" | "amber" | "red" | "muted" {
  if (item.type === "hypothesis.created") return "amber";
  if (item.type === "test.finished" && item.meta?.status === "failed") return "red";
  if (item.type === "file.externalChange") return "muted";
  return "green";
}

function relativeTime(at: number, startedAt?: number): string {
  if (!startedAt) return "00:00";
  const seconds = Math.max(0, Math.floor((at - startedAt) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

