import type { ReactNode } from "react";
import type { StatusTone } from "../types/app";

interface StatusChipProps {
  tone?: StatusTone;
  children: ReactNode;
}

export default function StatusChip({
  tone = "neutral",
  children,
}: StatusChipProps) {
  return <span className={`status-chip status-chip--${tone}`}>{children}</span>;
}
