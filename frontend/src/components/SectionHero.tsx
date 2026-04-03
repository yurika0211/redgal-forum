import type { ReactNode } from "react";
import type { HeroMetric } from "../types/app";
import StatusChip from "./StatusChip";

interface SectionHeroProps {
  children?: ReactNode;
  description: string;
  kicker: string;
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
    <section className="hero-panel page-hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p className="hero-description">{description}</p>
        {children}
      </div>
      <div className="hero-metrics">
        {metrics.map((metric) => (
          <div className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <StatusChip tone={metric.tone}>{metric.detail}</StatusChip>
          </div>
        ))}
      </div>
    </section>
  );
}
