import type { ReactNode } from "react";
import type { StatusTone } from "../types/app";

interface StatusChipProps {
  tone?: StatusTone;
  children: ReactNode;
}

const TONE_CLASS: Record<StatusTone, string> = {
  accent:
    "border-[color:var(--color-lilac)]/35 bg-[color:var(--color-lilac)]/15 text-[color:var(--text-main)]",
  neutral:
    "border-[color:var(--line-soft)] bg-[color:var(--surface-card)] text-[color:var(--text-soft)]",
  success:
    "border-[color:var(--color-mint)]/35 bg-[color:var(--color-mint)]/18 text-[color:var(--text-main)]",
  warn:
    "border-[color:var(--color-cream)]/35 bg-[color:var(--color-cream)]/20 text-[color:var(--text-main)]",
};

export default function StatusChip({
  tone = "neutral",
  children,
}: StatusChipProps) {
  return (
    <span
      className={`status-chip inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
