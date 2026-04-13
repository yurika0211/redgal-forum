import type { ReactNode } from "react";
import type { HeroMetric } from "../types/app";
import StatusChip from "./StatusChip";

interface SectionHeroProps {
  children?: ReactNode;
  description: string;
  kicker?: string;
  metrics: HeroMetric[];
  title: string;
}

export default function SectionHero({
  children,
  description,
  kicker,
  metrics,
  title,
}: SectionHeroProps) {
  return (
    <section className="mb-5 grid gap-4 rounded-3xl border border-[color:var(--line-soft)] bg-[linear-gradient(135deg,rgba(249,247,250,0.92),rgba(245,245,245,0.96))] p-6 shadow-[var(--shadow-large)] md:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
      <div className="grid gap-3">
        {kicker ? <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{kicker}</p> : null}
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text-strong)] md:text-4xl">{title}</h1>
        <p className="max-w-4xl text-sm leading-7 text-[color:var(--text-soft)] md:text-base">{description}</p>
        {children}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
        {metrics.map((metric) => (
          <div
            className="grid gap-1 rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-4 py-3"
            key={metric.label}
          >
            <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{metric.label}</span>
            <strong className="text-2xl font-semibold leading-tight text-[color:var(--text-strong)]">{metric.value}</strong>
            <StatusChip tone={metric.tone}>{metric.detail}</StatusChip>
          </div>
        ))}
      </div>
    </section>
  );
}
